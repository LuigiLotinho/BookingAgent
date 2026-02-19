/**
 * Crawler 2 – Step 1.5
 * Reichert Gig-Daten mit echten Venue-Namen an.
 *
 * Strategie pro Gig (Band + Stadt + Datum bekannt):
 *   1. Brave Search: "[Band]" "[Stadt]" site:reservix.de
 *   2. Brave Search: "[Band]" "[Stadt]" site:eventim.de
 *   3. Brave Search: "[Band]" "[Stadt]" Tickets [Jahr]  (allgemein)
 *
 * Für jeden Treffer:
 *   a. Seitentitel aus Brave-Description parsen (kein fetch nötig)
 *   b. Falls nicht gefunden: Seite direkt fetchen → <title> parsen
 *
 * Venue-Name-Format im Titel:
 *   Reservix: "El Flecha Negra – Kulturclub schon schön, Mainz – Tickets | Reservix"
 *   Eventim:  "El Flecha Negra | Jubez Karlsruhe | eventim"
 */

import OpenAI from 'openai'
import type { BandGig } from './types'

let _openai: OpenAI | null = null
function getOpenAI(apiKey: string): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey })
  return _openai
}

async function extractVenueWithLLM(
  bandName: string,
  city: string,
  searchResults: { title: string; url: string; description: string }[],
  openaiApiKey: string
): Promise<string | null> {
  const context = searchResults
    .slice(0, 4)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
    .join('\n\n')

  const prompt = `Du hilfst dabei, den Namen einer Konzert-Location zu finden.

Band: ${bandName}
Stadt: ${city}

Suchergebnisse:
${context}

Frage: Wie heißt die genaue Konzert-Location (Venue-Name, z.B. "Kulturclub schon schön", "Jubez", "Colos-Saal") wo ${bandName} in ${city} spielt?
Antworte NUR mit dem Venue-Namen, NICHTS sonst. Wenn nicht erkennbar: antworte mit "unbekannt".`

  try {
    const completion = await getOpenAI(openaiApiKey).chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 40,
      temperature: 0,
    })
    const result = (completion.choices[0]?.message?.content ?? '').trim()
    if (!result || result.toLowerCase() === 'unbekannt' || result.length > 60) return null
    return result
  } catch {
    return null
  }
}

const FETCH_TIMEOUT_MS = 10_000
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

// ─── Brave Search ─────────────────────────────────────────────────────────────

async function braveSearch(
  query: string,
  apiKey: string,
  count = 5
): Promise<{ title: string; url: string; description: string }[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(count))
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.web?.results ?? []
  } catch {
    return []
  } finally {
    clearTimeout(id)
  }
}

// ─── Venue-Name aus Seitentitel extrahieren ───────────────────────────────────

/**
 * Parst den Venue-Namen aus einem Ticket-Seitentitel.
 *
 * Unterstützte Formate:
 *   "Band – Venue, City – Tickets | Provider"   (Reservix)
 *   "Band | Venue | Provider"                    (Eventim)
 *   "Band @ Venue City"                          (andere)
 *   "Konzert: Band im Venue"                     (andere)
 */
// Strings die kein Venue-Name sein können
const GARBAGE_PATTERNS = [
  /^all events/i, /^alle events/i, /^termine\s*&/i, /^events\s*at\s*a\s*glance/i,
  /^order\s*online/i, /^fusionary/i, /^upcoming/i, /^live\s*dates/i,
  /^tour\s*dates/i, /^\d{4}$/, /^tickets?$/i,
]

function isGarbage(s: string): boolean {
  if (!s || s.length < 3 || s.length > 65) return true
  return GARBAGE_PATTERNS.some((p) => p.test(s.trim()))
}

function extractVenueFromTitle(
  title: string,
  bandName: string,
  city: string
): string | null {
  if (!title) return null

  const bandSlug = bandName.toLowerCase().slice(0, 8)
  const cityLower = city.toLowerCase()

  // Priorität 1: "@" Pattern – "Fuego 2026 @ Kulturclub schon schön, Mainz"
  const atMatch = title.match(/@\s*([^,\n|–]{3,60})/)
  if (atMatch) {
    const v = atMatch[1]
      .replace(new RegExp(`\\b${city}\\b`, 'gi'), '')
      .replace(/,\s*$/, '')
      .trim()
    if (!isGarbage(v)) return v
  }

  // Priorität 2: Pipe/Dash-getrennte Teile
  const normalized = title
    .replace(/\s*[–—]\s*/g, ' | ')
    .replace(/\s+-\s+/g, ' | ')
  const parts = normalized.split('|').map((p) => p.trim())

  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower.includes(bandSlug)) continue
    if (/ticket|reservix|eventim|starticket|bandsintown|songkick/i.test(part)) continue
    if (lower === cityLower) continue

    const cleaned = part
      .replace(new RegExp(`\\b${city}\\b`, 'gi'), '')
      .replace(/,\s*$/, '')
      .trim()

    if (!isGarbage(cleaned)) return cleaned
  }

  return null
}

// ─── Seite fetchen + Titel lesen ──────────────────────────────────────────────

async function fetchPageTitle(url: string): Promise<string | null> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: DEFAULT_HEADERS })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<title[^>]*>([^<]{3,120})<\/title>/i)
    return m ? m[1].trim() : null
  } catch {
    return null
  } finally {
    clearTimeout(id)
  }
}

// ─── Pro Gig: Venue-Namen suchen ─────────────────────────────────────────────

const TICKET_DOMAINS = ['reservix.de', 'eventim.de', 'starticket.ch', 'ticketmaster.de']
const SKIP_DOMAINS = [
  'bandsintown.com', 'songkick.com', 'setlist.fm', 'last.fm',
  'spotify.com', 'youtube.com', 'facebook.com', 'instagram.com',
  'wikipedia.org', 'discogs.com',
]

function isTicketSite(url: string): boolean {
  try {
    const h = new URL(url).hostname
    return TICKET_DOMAINS.some((d) => h.includes(d))
  } catch { return false }
}

function isSkipDomain(url: string): boolean {
  try {
    const h = new URL(url).hostname
    return SKIP_DOMAINS.some((d) => h.includes(d))
  } catch { return true }
}

async function findVenueForGig(
  bandName: string,
  city: string,
  eventDate: string | undefined,
  braveApiKey: string,
  openaiApiKey?: string,
  skipDomains: string[] = []
): Promise<{ venueName: string | null; venueUrl: string | null; method: string }> {
  const year = eventDate?.slice(0, 4) ?? String(new Date().getFullYear())

  const queries = [
    `"${bandName}" "${city}" site:reservix.de`,
    `"${bandName}" "${city}" site:eventim.de`,
    `"${bandName}" "${city}" Tickets ${year}`,
    `"${bandName}" "${city}" Konzert ${year}`,
  ]

  // Alle Brave-Ergebnisse sammeln
  const allResults: { title: string; url: string; description: string }[] = []

  for (const query of queries) {
    let results: { title: string; url: string; description: string }[] = []
    try {
      results = await braveSearch(query, braveApiKey, 5)
    } catch { continue }

    const filtered = results.filter(
      (r) => !isSkipDomain(r.url) && !skipDomains.some((d) => r.url.includes(d))
    )
    allResults.push(...filtered)

    // Ticket-Seiten direkt fetchen für genaueren Titel
    for (const r of filtered) {
      if (isTicketSite(r.url)) {
        const pageTitle = await fetchPageTitle(r.url)
        if (pageTitle && pageTitle !== r.title) {
          // Ergebnis mit besserem Titel ergänzen
          allResults.push({ ...r, title: pageTitle })
        }
      }
    }
  }

  if (allResults.length === 0) {
    return { venueName: null, venueUrl: null, method: 'none' }
  }

  // LLM immer verwenden wenn API-Key vorhanden (zuverlässiger als Heuristik)
  if (openaiApiKey) {
    const llmResult = await extractVenueWithLLM(bandName, city, allResults, openaiApiKey)
    if (llmResult) {
      // Beste Ticket-URL als venueUrl bevorzugen
      const ticketResult = allResults.find((r) => isTicketSite(r.url))
      return {
        venueName: llmResult,
        venueUrl: ticketResult?.url ?? allResults[0]?.url ?? null,
        method: 'llm',
      }
    }
  }

  // Heuristischer Fallback wenn kein OpenAI-Key
  for (const r of allResults) {
    const fromTitle = extractVenueFromTitle(r.title, bandName, city)
    if (fromTitle) {
      return { venueName: fromTitle, venueUrl: r.url, method: 'brave-title' }
    }
  }

  return { venueName: null, venueUrl: null, method: 'none' }
}

// ─── Haupt-Export ─────────────────────────────────────────────────────────────

export interface EnrichedGig extends BandGig {
  venueNameResolved: string | null
  venueUrlResolved: string | null
  enrichMethod: string
}

/**
 * Reichert eine Liste von Gigs mit echten Venue-Namen an.
 * Nutzt gezielte Brave-Suche auf Reservix/Eventim.
 */
export async function enrichGigsWithVenues(
  gigs: BandGig[],
  braveApiKey: string,
  openaiApiKey?: string,
  onProgress?: (gig: BandGig, result: EnrichedGig, index: number, total: number) => void
): Promise<EnrichedGig[]> {
  const enriched: EnrichedGig[] = []

  for (let i = 0; i < gigs.length; i++) {
    const gig = gigs[i]
    let venueNameResolved: string | null = null
    let venueUrlResolved: string | null = null
    let enrichMethod = 'none'

    if (gig.venueCity) {
      // Band-eigene Domain überspringen (enthält alle Events, kein spezifischer Venue)
      const bandDomainHint = gig.bandName.toLowerCase().replace(/\s+/g, '').slice(0, 12)
      const result = await findVenueForGig(
        gig.bandName,
        gig.venueCity,
        gig.eventDate,
        braveApiKey,
        openaiApiKey,
        [bandDomainHint]
      )
      venueNameResolved = result.venueName
      venueUrlResolved = result.venueUrl
      enrichMethod = result.method
    }

    const enrichedGig: EnrichedGig = {
      ...gig,
      venueName: venueNameResolved ?? gig.venueName,
      venueNameResolved,
      venueUrlResolved,
      enrichMethod,
    }

    enriched.push(enrichedGig)
    onProgress?.(gig, enrichedGig, i + 1, gigs.length)

    // Kleine Pause zwischen Brave-Anfragen
    if (i < gigs.length - 1) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  return enriched
}
