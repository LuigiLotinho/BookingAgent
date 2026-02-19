/**
 * Crawler 2 – Step 1b
 * Extrahiert Gig-Daten (Datum, Venue, Stadt, Venue-URL) aus dem HTML
 * einer Tour/Dates-Seite. Nutzt GPT-4o-mini für die Strukturierung.
 * Unterstützt: Plain HTML, Squarespace JSON-API, JSON-LD structured data, Playwright.
 */

import OpenAI from 'openai'
import type { BandGig } from './types'

const FETCH_TIMEOUT_MS = 10_000
const MODEL = 'gpt-4o-mini'

let _client: OpenAI | null = null
function getClient(apiKey: string): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey })
  return _client
}

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: DEFAULT_HEADERS })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(id)
  }
}

/** Squarespace-Seiten: ?format=json liefert strukturierte Event-Daten */
async function trySquarespaceJson(pageUrl: string): Promise<string | null> {
  try {
    const sep = pageUrl.includes('?') ? '&' : '?'
    const jsonUrl = `${pageUrl}${sep}format=json`
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(jsonUrl, { signal: controller.signal, headers: DEFAULT_HEADERS })
      if (!res.ok) return null
      const data = await res.json()
      // Squarespace gibt Items zurück die Termine enthalten können
      const items: unknown[] = data?.collection?.items ?? data?.items ?? []
      if (items.length === 0) return null
      // Serialisiere als Text damit der LLM es verarbeiten kann
      return items
        .map((item: unknown) => {
          const it = item as Record<string, unknown>
          const title = String(it.title ?? '')
          const body  = String(it.body ?? '').replace(/<[^>]+>/g, ' ')
          const startDate = it.startDate ? new Date(Number(it.startDate) * 1000).toISOString().slice(0,10) : ''
          const location = typeof it.location === 'object' && it.location
            ? JSON.stringify(it.location)
            : String(it.location ?? '')
          return `${startDate} | ${title} | ${body.slice(0,200)} | ${location}`
        })
        .join('\n')
    } finally {
      clearTimeout(id)
    }
  } catch {
    return null
  }
}

/**
 * Playwright-Fallback: Startet einen echten Browser, wartet bis JavaScript
 * fertig geladen hat, gibt dann das gerenderte HTML zurück.
 * Wird nur aufgerufen wenn normaler fetch keine Daten liefert.
 */
async function fetchWithPlaywright(url: string): Promise<string | null> {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ 'User-Agent': DEFAULT_HEADERS['User-Agent'] })
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 })
      // Kurz warten damit verzögerte JS-Inhalte (Events-Widget) laden können
      await page.waitForTimeout(2000)
      return await page.content()
    } finally {
      await browser.close()
    }
  } catch (e) {
    console.error('  [Playwright-Fehler]:', e instanceof Error ? e.message : e)
    return null
  }
}

export interface JsonLdEvent {
  startDate?: string
  name?: string
  location?: Record<string, unknown>
  url?: string          // Ticket-URL (Reservix, Eventim, …)
  offers?: unknown
}

/** JSON-LD structured data aus HTML extrahieren (schema.org Event) */
function extractJsonLdEvents(html: string): JsonLdEvent[] {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const events: JsonLdEvent[] = []
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1])
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
          events.push(item as JsonLdEvent)
        }
        if (Array.isArray(item['@graph'])) {
          for (const g of item['@graph']) {
            if (g['@type'] === 'Event' || g['@type'] === 'MusicEvent') events.push(g as JsonLdEvent)
          }
        }
      }
    } catch { /* ignore */ }
  }
  return events
}

function jsonLdEventsToText(events: JsonLdEvent[]): string {
  return events.map((e) => {
    const loc = e.location as Record<string, unknown> | undefined
    const addr = loc?.address as Record<string, unknown> | undefined
    const city    = addr?.addressLocality ?? loc?.name ?? ''
    const country = addr?.addressCountry ?? ''
    const ticketUrl = e.url ?? ''
    return `${e.startDate?.slice(0,10) ?? ''} | ${e.name ?? ''} | ${city}, ${country} | ticketUrl:${ticketUrl}`
  }).join('\n')
}

/** Direkte Konvertierung JSON-LD → BandGig ohne LLM, dedupliziert nach date+city */
function jsonLdEventsToBandGigs(
  events: JsonLdEvent[],
  bandName: string,
  sourceUrl: string
): (BandGig & { ticketUrl?: string })[] {
  const seen = new Set<string>()
  const result: (BandGig & { ticketUrl?: string })[] = []

  for (const e of events) {
    const loc  = e.location as Record<string, unknown> | undefined
    const addr = loc?.address as Record<string, unknown> | undefined
    const city    = String(addr?.addressLocality ?? loc?.name ?? '')
    const country = String(addr?.addressCountry ?? '')
    const date    = e.startDate?.slice(0, 10) ?? ''

    const key = `${date}|${city.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    if (!city && !date) continue

    result.push({
      bandName,
      eventDate: date || undefined,
      venueName: undefined,
      venueCity: city || undefined,
      venueCountry: country || undefined,
      venueUrl: e.url || undefined,
      eventName: e.name || undefined,
      source: 'band_website' as const,
      sourceUrl,
      ticketUrl: e.url || undefined,
    })
  }
  return result
}

/** Venue-Name aus Seitentitel extrahieren (Reservix/Eventim-Format) */
function parseVenueFromTitle(title: string, city: string, bandName: string): string | null {
  const bandLower = bandName.toLowerCase()
  const normalized = title.replace(/\s*[–—]\s*/g, ' | ').replace(/\s*-\s*/g, ' | ')
  const parts = normalized.split('|').map((p) => p.trim())
  for (const part of parts) {
    if (part.toLowerCase().includes(bandLower.slice(0, 6))) continue
    if (/ticket|reservix|eventim|bandsintown/i.test(part)) continue
    const cleaned = part.replace(new RegExp(city, 'gi'), '').replace(/,/g, '').trim()
    if (cleaned.length > 2 && cleaned.length < 60) return cleaned
  }
  return null
}

/**
 * Venue-Name aus Ticket-URL (Reservix/Eventim) oder Bandsintown-Einzelseite holen.
 * – Reservix/Eventim: einfacher fetch() reicht, Venue im Seitentitel
 * – Bandsintown: Playwright nötig (JS-rendered), JSON-LD oder Text-Scan
 */
async function resolveVenueFromTicketUrl(
  ticketUrl: string,
  city: string,
  bandName: string
): Promise<string | null> {
  if (!ticketUrl) return null
  const host = (() => { try { return new URL(ticketUrl).hostname } catch { return '' } })()

  const isTicketing = ['reservix.de', 'eventim.de', 'ticketmaster.', 'starticket.ch'].some(
    (d) => host.includes(d)
  )
  const isBandsintown = host.includes('bandsintown.com')

  // ─ Reservix / Eventim: normaler fetch + Titel parsen ─
  if (isTicketing) {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(ticketUrl, { signal: controller.signal, headers: DEFAULT_HEADERS })
        if (!res.ok) return null
        const html = await res.text()
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const title = m ? m[1].trim() : ''
        return title ? parseVenueFromTitle(title, city, bandName) : null
      } finally {
        clearTimeout(id)
      }
    } catch { return null }
  }

  // ─ Bandsintown Einzelseite: Playwright + JSON-LD ─
  if (isBandsintown) {
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({ headless: true })
      const page = await browser.newPage()
      await page.setExtraHTTPHeaders(DEFAULT_HEADERS)
      try {
        await page.goto(ticketUrl, { waitUntil: 'domcontentloaded', timeout: 18_000 })
        await page.waitForTimeout(2500)
        const html = await page.content()

        // JSON-LD: MusicEvent mit location.name
        const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
        for (const m of ldMatches) {
          try {
            const obj = JSON.parse(m[1])
            const items: unknown[] = Array.isArray(obj) ? obj : [obj]
            for (const item of items) {
              const it = item as Record<string, unknown>
              const loc = it?.location as Record<string, unknown> | undefined
              if (loc?.name && String(loc.name).toLowerCase() !== city.toLowerCase()) {
                return String(loc.name)
              }
            }
          } catch { /* ignore */ }
        }

        // Fallback: Seitentitel
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) {
          return parseVenueFromTitle(titleMatch[1].trim(), city, bandName)
        }
      } finally {
        await browser.close()
      }
    } catch { /* silent */ }
  }

  return null
}

function htmlToText(html: string, maxChars = 8000): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

/** Venue-URLs aus dem HTML der Tour-Seite sammeln (für direkten Link) */
function extractVenueLinksFromHtml(
  html: string,
  baseUrl: string
): Map<string, string> {
  // Sucht Links die in der Nähe von Venue-Keywords stehen
  const venueUrlMap = new Map<string, string>() // venue-name-hint → url
  const base = (() => { try { return new URL(baseUrl) } catch { return null } })()
  if (!base) return venueUrlMap

  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim()
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
    try {
      const abs = new URL(href, baseUrl)
      // Nur externe Links (andere Domain = Venue-Website)
      if (abs.hostname !== base.hostname && text.length > 2) {
        venueUrlMap.set(text.slice(0, 80).toLowerCase(), abs.toString())
      }
    } catch {
      // ignore
    }
  }
  return venueUrlMap
}

const SYSTEM_PROMPT = `Du extrahierst strukturierte Konzert-/Tourdaten aus dem Text einer Band-Website.
Gib NUR gültiges JSON zurück, kein Markdown, kein Kommentar.`

const USER_PROMPT = `Extrahiere alle Konzerttermine aus diesem Text.
Band: {{bandName}}
Seitentext: {{text}}

Gib ein JSON-Array zurück. Jedes Element hat diese Felder (unbekannte Felder weglassen, nicht erfinden):
{
  "eventDate": "2026-07-12",                        // ISO-Datum, optional
  "venueName": "Das Fest",                          // Name des Veranstaltungsorts, optional
  "venueCity": "Karlsruhe",                         // Stadt, optional
  "venueCountry": "DE",                             // 2-Buchstaben ISO, optional
  "eventName": "Open Air 2026",                     // Name des Events, optional
  "ticketUrl": "https://www.reservix.de/tickets/..."// Ticket-URL falls im Text vorhanden, optional
}

Antworte NUR mit dem Array.
Wenn keine Termine gefunden: []`

interface LlmGig {
  eventDate?: string
  venueName?: string
  venueCity?: string
  venueCountry?: string
  eventName?: string
  ticketUrl?: string
}

async function extractGigsWithLLM(
  text: string,
  bandName: string,
  apiKey: string
): Promise<LlmGig[]> {
  const prompt = USER_PROMPT
    .replace('{{bandName}}', bandName)
    .replace('{{text}}', text.slice(0, 7000))

  const completion = await getClient(apiKey).chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1500,
    temperature: 0,
  })

  const raw = (completion.choices[0]?.message?.content ?? '').trim()
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ─── Bandsintown Public API ───────────────────────────────────────────────────

interface BandsintownApiEvent {
  id: string
  datetime: string
  venue: {
    name: string
    city: string
    country: string
    latitude?: string
    longitude?: string
  }
  offers?: { url: string; type: string }[]
  url?: string
}

/**
 * Extrahiert den Bandsintown app_id aus dem gerenderten HTML.
 * Dieser steckt in Links wie:
 *   href="...bandsintown.com/...?app_id=squarespace-armadillo-cone-bwwd&..."
 */
function extractBandsintownAppId(html: string): string | null {
  const m = html.match(/bandsintown\.com[^"']*[?&]app_id=([^&"'\s]+)/i)
  return m ? decodeURIComponent(m[1]) : null
}

/**
 * Ruft die Bandsintown Public REST API auf.
 * Gibt alle Events der Band zurück inkl. Venue-Namen.
 * Nutzt den app_id der bereits auf der Website eingebettet ist.
 */
async function fetchBandsintownApiEvents(
  artistName: string,
  appId: string
): Promise<BandsintownApiEvent[]> {
  const encoded = encodeURIComponent(artistName.toLowerCase())
  const url = `https://rest.bandsintown.com/artists/${encoded}/events?app_id=${encodeURIComponent(appId)}&date=upcoming`

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  } finally {
    clearTimeout(id)
  }
}

/**
 * Lädt die Tour-Seite, extrahiert Gig-Daten per LLM inkl. Ticket-URLs,
 * löst Venue-Namen direkt über Reservix/Eventim-Seiten auf.
 * Reihenfolge: JSON-LD → Squarespace JSON → Playwright → Plain HTML.
 */
export async function extractGigsFromTourPage(
  tourPageUrl: string,
  bandName: string,
  openaiApiKey: string
): Promise<{ gigs: BandGig[]; html: string | null; method: string }> {
  const html = await fetchHtml(tourPageUrl)
  if (!html) return { gigs: [], html: null, method: 'failed' }

  // Methode 1: JSON-LD structured data (kein extra Request nötig)
  const jsonLdEvents = extractJsonLdEvents(html)

  // Methode 2: Squarespace JSON-API
  const sqText = await trySquarespaceJson(tourPageUrl)

  // Methode 3: Playwright – echter Browser der JavaScript ausführt
  let playwrightHtml: string | null = null
  let playwrightJsonLdEvents: JsonLdEvent[] = []
  if (jsonLdEvents.length === 0 && !sqText) {
    process.stdout.write(' [starte Browser…]')
    playwrightHtml = await fetchWithPlaywright(tourPageUrl)
    process.stdout.write(' ')
    if (playwrightHtml) {
      playwrightJsonLdEvents = extractJsonLdEvents(playwrightHtml)
    }
  }

  // Aktive JSON-LD-Events (mit Ticket-URLs)
  const activeEvents = playwrightJsonLdEvents.length > 0
    ? playwrightJsonLdEvents
    : jsonLdEvents

  // ── Bandsintown Public API: Venue-Namen direkt holen ─────────────────────
  // app_id aus dem gerenderten HTML extrahieren (eingebettet in den Links)
  const activeHtmlForAppId = playwrightHtml ?? html
  const btAppId = extractBandsintownAppId(activeHtmlForAppId)
  // Map: dateISO|cityLower → BandsintownApiEvent (für schnellen Lookup)
  const btEventMap = new Map<string, BandsintownApiEvent>()

  if (btAppId) {
    process.stdout.write(' [Bandsintown API…]')
    const btEvents = await fetchBandsintownApiEvents(bandName, btAppId)
    for (const ev of btEvents) {
      const date = ev.datetime?.slice(0, 10) ?? ''
      const city = (ev.venue?.city ?? '').toLowerCase()
      if (date || city) {
        btEventMap.set(`${date}|${city}`, ev)
        // Auch ohne Datum indexieren (city-only Lookup als Fallback)
        if (city) btEventMap.set(`|${city}`, ev)
      }
    }
    process.stdout.write(` (${btEventMap.size > 0 ? btEvents.length + ' Events' : 'keine'}) `)
  }

  // Ticket-URL Lookup: eventDate+city → ticketUrl (aus JSON-LD direkt)
  const ticketUrlByDateCity = new Map<string, string>()
  for (const ev of activeEvents) {
    const date = ev.startDate?.slice(0, 10) ?? ''
    const city = (ev.location?.['address'] as Record<string, unknown>)?.['addressLocality']
      ?? (ev.location?.['name'] as string)
      ?? ''
    const ticketUrl = ev.url ?? ''
    if (ticketUrl && (date || city)) {
      ticketUrlByDateCity.set(`${date}|${String(city).toLowerCase()}`, ticketUrl)
    }
  }

  // Aktives HTML für Venue-Link-Extraktion
  const activeHtml = playwrightHtml ?? html
  const venueLinks = extractVenueLinksFromHtml(activeHtml, tourPageUrl)

  // Text-Quelle für LLM bestimmen
  let text: string
  let method: string
  if (activeEvents.length > 0) {
    text = jsonLdEventsToText(activeEvents)
    method = playwrightJsonLdEvents.length > 0 ? 'playwright+json-ld' : 'json-ld'
  } else if (sqText) {
    text = sqText
    method = 'squarespace-json'
  } else if (playwrightHtml) {
    text = htmlToText(playwrightHtml)
    method = 'playwright'
  } else {
    text = htmlToText(html)
    method = 'plain-html'
  }

  // Gigs direkt aus JSON-LD bauen (kein LLM nötig wenn Strukturdaten vorhanden)
  let rawGigs: (BandGig & { ticketUrl?: string })[]

  if (activeEvents.length > 0) {
    rawGigs = jsonLdEventsToBandGigs(activeEvents, bandName, tourPageUrl)
    // Ticket-URL + Bandsintown-Venue ergänzen
    for (const g of rawGigs) {
      const lookupKey = `${g.eventDate ?? ''}|${(g.venueCity ?? '').toLowerCase()}`

      // Ticket-URL aus JSON-LD
      if (!g.ticketUrl) {
        const found = ticketUrlByDateCity.get(lookupKey)
        if (found) g.ticketUrl = found
      }

      // Venue-Name aus Bandsintown API (direkter Lookup)
      if (!g.venueName && btEventMap.size > 0) {
        const btEv = btEventMap.get(lookupKey)
          ?? btEventMap.get(`|${(g.venueCity ?? '').toLowerCase()}`)
        if (btEv?.venue?.name && btEv.venue.name.toLowerCase() !== (g.venueCity ?? '').toLowerCase()) {
          g.venueName = btEv.venue.name
          // Ticket-URL aus Bandsintown-Offer wenn vorhanden
          if (!g.ticketUrl && btEv.offers?.[0]?.url) {
            g.ticketUrl = btEv.offers[0].url
          }
        }
      }
    }
  } else {
    // Fallback: LLM für Plain-HTML / Squarespace-Text
    let llmGigs: LlmGig[] = []
    try {
      llmGigs = await extractGigsWithLLM(text, bandName, openaiApiKey)
    } catch (err) {
      console.error(`  [LLM-Fehler] ${bandName}:`, err instanceof Error ? err.message : err)
    }
    rawGigs = llmGigs
      .filter((g) => g.venueCity || g.eventDate)
      .map((g) => {
        const lookupKey = `${g.eventDate ?? ''}|${(g.venueCity ?? '').toLowerCase()}`
        const ticketUrl = g.ticketUrl ?? ticketUrlByDateCity.get(lookupKey) ?? undefined
        let venueUrl: string | undefined = ticketUrl
        if (!venueUrl) {
          const nameKey = (g.venueName ?? '').toLowerCase().slice(0, 40)
          for (const [hint, url] of venueLinks) {
            if (hint.includes(nameKey.slice(0, 10)) || nameKey.includes(hint.slice(0, 10))) {
              venueUrl = url
              break
            }
          }
        }
        return {
          bandName,
          eventDate: g.eventDate,
          venueName: g.venueName,
          venueCity: g.venueCity,
          venueCountry: g.venueCountry,
          venueUrl,
          eventName: g.eventName,
          source: 'band_website' as const,
          sourceUrl: tourPageUrl,
          ticketUrl,
        }
      })
  }

  // Venue-Namen per Ticket-URL (Reservix/Eventim) auflösen
  // Bandsintown-Links überspringen (blockieren Scraper mit "Attention Required!")
  process.stdout.write(' [Venue-Namen via Ticket-Links…]')
  const gigs: BandGig[] = await Promise.all(
    rawGigs.map(async (g) => {
      const ticketHost = (() => { try { return new URL(g.ticketUrl ?? '').hostname } catch { return '' } })()
      const isBandsintown = ticketHost.includes('bandsintown.com')
      if (g.ticketUrl && !g.venueName && !isBandsintown) {
        const resolved = await resolveVenueFromTicketUrl(
          g.ticketUrl,
          g.venueCity ?? '',
          bandName
        )
        if (resolved) return { ...g, venueName: resolved, venueUrl: g.ticketUrl }
      }
      // Bandsintown "Attention Required!" als eventName bereinigen
      const cleanEventName = (g.eventName === 'Attention Required!' || !g.eventName)
        ? undefined
        : g.eventName
      return { ...g, eventName: cleanEventName }
    })
  )
  process.stdout.write(' ')

  return { gigs, html, method }
}
