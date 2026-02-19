/**
 * Crawler 2 – Step 3
 * Pro Venue:
 *   1. Brave Search → offizielle Website finden
 *   2. Website crawlen → Booking-Email + Kontaktseite extrahieren
 *   3. Falls keine Email auf Hauptseite → Kontakt-/Booking-Unterseite folgen
 */

import OpenAI from 'openai'

const FETCH_TIMEOUT_MS = 12_000
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

let _openai: OpenAI | null = null
function getOpenAI(apiKey: string): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey })
  return _openai
}

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface VenueCrawlResult {
  venueName: string
  venueCity: string
  websiteUrl: string | null
  bookingEmail: string | null
  bookingFormUrl: string | null
  contactPageUrl: string | null
  method: string
  error?: string
}

// ─── HTTP-Hilfsfunktionen ─────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string | null> {
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

// Domains die keine Venue-Websites sind
const NOT_VENUE_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'tiktok.com', 'spotify.com',
  'bandsintown.com', 'songkick.com', 'setlist.fm', 'last.fm',
  'reservix.de', 'eventim.de', 'ticketmaster.', 'starticket.ch',
  'wikipedia.org', 'wikimedia.org',
  'google.com', 'bing.com', 'yahoo.com',
]

function isVenueDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return !NOT_VENUE_DOMAINS.some((d) => host.includes(d))
  } catch { return false }
}

/**
 * Findet die offizielle Website einer Venue per Brave Search.
 */
async function findVenueWebsite(
  venueName: string,
  city: string,
  braveApiKey: string
): Promise<{ url: string; confidence: 'high' | 'medium' } | null> {
  const queries = [
    `"${venueName}" ${city} offizielle Website`,
    `"${venueName}" ${city} Booking Konzerte`,
    `${venueName} ${city} Veranstaltungsort`,
  ]

  const nameSlug = venueName.toLowerCase().replace(/[^a-z0-9]/g, '')

  for (const query of queries) {
    const results = await braveSearch(query, braveApiKey, 6)
    for (const r of results) {
      if (!isVenueDomain(r.url)) continue
      try {
        const host = new URL(r.url).hostname.toLowerCase().replace(/^www\./, '')
        const hostSlug = host.replace(/[^a-z0-9]/g, '')
        // Hohe Konfidenz: Domain enthält Venue-Namen
        if (nameSlug.length >= 4 && hostSlug.includes(nameSlug.slice(0, 6))) {
          return { url: r.url, confidence: 'high' }
        }
        // Mittlere Konfidenz: Titel enthält Venue-Name + Stadt
        const titleLower = r.title.toLowerCase()
        if (
          titleLower.includes(venueName.toLowerCase().slice(0, 8)) &&
          titleLower.includes(city.toLowerCase())
        ) {
          return { url: r.url, confidence: 'medium' }
        }
      } catch { /* ignore */ }
    }
  }
  return null
}

// ─── Email-Extraktion ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

const BOOKING_KEYWORDS = [
  'booking', 'buchen', 'buchung', 'concert', 'konzert',
  'band', 'artist', 'act', 'anfrage', 'programm',
  'veranstaltung', 'gig', 'show',
]

function extractEmails(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, ' ')
  const all = text.match(EMAIL_REGEX) ?? []
  return [...new Set(all)].filter(
    (e) =>
      !e.includes('example') &&
      !e.includes('domain') &&
      !e.endsWith('.png') &&
      !e.endsWith('.jpg') &&
      e.includes('.')
  )
}

/**
 * Bewertet Emails: Booking-relevante Emails bekommen höheren Score.
 */
function rankEmails(emails: string[], html: string): string | null {
  if (emails.length === 0) return null
  if (emails.length === 1) return emails[0]

  const htmlLower = html.toLowerCase()

  const scored = emails.map((email) => {
    const emailLower = email.toLowerCase()
    let score = 0

    // Direkt im Email-String: booking@, konzert@, etc.
    for (const kw of BOOKING_KEYWORDS) {
      if (emailLower.includes(kw)) score += 10
    }

    // Kontext um die Email im HTML
    const idx = htmlLower.indexOf(emailLower)
    if (idx >= 0) {
      const ctx = htmlLower.slice(Math.max(0, idx - 150), idx + 150)
      for (const kw of BOOKING_KEYWORDS) {
        if (ctx.includes(kw)) score += 3
      }
    }

    return { email, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].email
}

// ─── Kontaktseite finden ──────────────────────────────────────────────────────

const CONTACT_PATH_KEYWORDS = [
  '/booking', '/kontakt', '/contact', '/impressum',
  '/booking-anfrage', '/buchen', '/anfrage',
  '/about', '/ueber-uns', '/team',
]

function findContactPageUrl(html: string, baseUrl: string): string | null {
  const base = (() => { try { return new URL(baseUrl) } catch { return null } })()
  if (!base) return null

  const regex = /href=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  const candidates: { url: string; score: number }[] = []

  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim()
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
    try {
      const abs = new URL(href, baseUrl)
      if (abs.hostname !== base.hostname) continue
      const path = abs.pathname.toLowerCase()
      for (const kw of CONTACT_PATH_KEYWORDS) {
        if (path.includes(kw)) {
          candidates.push({ url: abs.toString(), score: CONTACT_PATH_KEYWORDS.indexOf(kw) })
          break
        }
      }
    } catch { /* ignore */ }
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.score - b.score)
  return candidates[0].url
}

// ─── LLM-Extraktion als Fallback ──────────────────────────────────────────────

async function extractBookingInfoWithLLM(
  html: string,
  venueName: string,
  openaiApiKey: string
): Promise<{ email: string | null; bookingFormUrl: string | null }> {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)

  const prompt = `Suche in diesem Text der Website von "${venueName}" nach:
1. Einer Booking/Kontakt-Email-Adresse (für Band-Buchungen)
2. Einer URL zu einem Booking-/Kontaktformular

Text:
${text}

Antworte NUR mit JSON: {"email": "...", "bookingFormUrl": "..."}
Wenn nicht gefunden: null für das jeweilige Feld.`

  try {
    const completion = await getOpenAI(openaiApiKey).chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0,
    })
    const raw = (completion.choices[0]?.message?.content ?? '').trim()
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonStr)
    return {
      email: parsed.email ?? null,
      bookingFormUrl: parsed.bookingFormUrl ?? null,
    }
  } catch {
    return { email: null, bookingFormUrl: null }
  }
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export async function crawlVenueForBookingInfo(
  venueName: string,
  venueCity: string,
  braveApiKey: string,
  openaiApiKey: string
): Promise<VenueCrawlResult> {
  const result: VenueCrawlResult = {
    venueName,
    venueCity,
    websiteUrl: null,
    bookingEmail: null,
    bookingFormUrl: null,
    contactPageUrl: null,
    method: 'none',
  }

  // 1. Offizielle Website finden
  const found = await findVenueWebsite(venueName, venueCity, braveApiKey)
  if (!found) {
    result.error = 'Website nicht gefunden'
    return result
  }
  result.websiteUrl = found.url

  // 2. Hauptseite crawlen
  const mainHtml = await fetchText(found.url)
  if (!mainHtml) {
    result.error = 'Website nicht erreichbar'
    return result
  }

  // 3. Emails direkt aus Hauptseite
  const emails = extractEmails(mainHtml)
  result.bookingEmail = rankEmails(emails, mainHtml)

  // 4. Kontaktseite finden
  result.contactPageUrl = findContactPageUrl(mainHtml, found.url)

  // 5. Kontaktseite crawlen falls noch keine Email
  if (!result.bookingEmail && result.contactPageUrl) {
    const contactHtml = await fetchText(result.contactPageUrl)
    if (contactHtml) {
      const contactEmails = extractEmails(contactHtml)
      result.bookingEmail = rankEmails(contactEmails, contactHtml)

      // Booking-Formular-URL aus Kontaktseite
      if (!result.bookingFormUrl) {
        const formMatch = contactHtml.match(
          /href=["']([^"']*(?:booking|kontakt|anfrage|buchen|contact)[^"']*)["']/i
        )
        if (formMatch) {
          try {
            result.bookingFormUrl = new URL(formMatch[1], result.contactPageUrl).toString()
          } catch { /* ignore */ }
        }
      }
    }
  }

  // 6. LLM-Fallback wenn immer noch keine Email
  if (!result.bookingEmail) {
    const llmResult = await extractBookingInfoWithLLM(mainHtml, venueName, openaiApiKey)
    result.bookingEmail = llmResult.email
    result.bookingFormUrl = llmResult.bookingFormUrl ?? result.bookingFormUrl
    if (result.bookingEmail) result.method = 'llm'
  } else {
    result.method = result.contactPageUrl ? 'contact-page' : 'main-page'
  }

  return result
}
