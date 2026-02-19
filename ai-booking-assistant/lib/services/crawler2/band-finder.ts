/**
 * Crawler 2 – Step 1a
 * Sucht die offizielle Website einer ähnlichen Band per Brave Search,
 * dann die Tour/Dates-Unterseite auf dieser Website.
 */

import type { BandWebsiteResult } from './types'

const FETCH_TIMEOUT_MS = 10_000

/** Domains die keine offizielle Band-Website sind */
const BLOCKED_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'tiktok.com', 'spotify.com', 'apple.com',
  'bandcamp.com', 'soundcloud.com', 'last.fm', 'discogs.com',
  'wikipedia.org', 'wikimedia.org',
  'ticketmaster.', 'eventim.de', 'songkick.com', 'bandsintown.com',
  'amazon.', 'ebay.', 'google.com', 'bing.com',
]

/** Pfad-Keywords die auf eine Tour/Dates-Seite hindeuten */
const TOUR_PAGE_PATHS = [
  '/tour', '/dates', '/live', '/shows', '/gigs', '/concerts', '/events',
  '/konzerte', '/termine', '/auftritte', '/tourdaten',
  '/tour-dates', '/live-dates', '/show-dates', '/concert-dates',
]

function isBlockedDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some((b) => host.includes(b))
  } catch {
    return true
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    })
    return res
  } finally {
    clearTimeout(id)
  }
}

/** Brave Search – gibt Top-Ergebnisse zurück */
async function braveSearch(
  query: string,
  apiKey: string,
  count = 5
): Promise<{ title: string; url: string; description: string }[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(count))

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.web?.results || []
}

/** Findet die Tour/Dates-Seite durch Link-Scan der Homepage */
async function findTourPageOnWebsite(websiteUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(websiteUrl)
    if (!res.ok) return null
    const html = await res.text()
    const base = new URL(websiteUrl)

    // Alle <a href="..."> aus der Seite extrahieren
    const hrefRegex = /href=["']([^"']+)["']/gi
    let match: RegExpExecArray | null
    const candidates: string[] = []

    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1].trim()
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
      try {
        const absolute = new URL(href, websiteUrl)
        // Nur Links auf derselben Domain
        if (absolute.hostname !== base.hostname) continue
        const path = absolute.pathname.toLowerCase()
        if (TOUR_PAGE_PATHS.some((p) => path.includes(p))) {
          candidates.push(absolute.toString())
        }
      } catch {
        // ignore
      }
    }

    return candidates[0] ?? null
  } catch {
    return null
  }
}

/**
 * Findet die offizielle Website einer Band per Brave Search
 * und die Tour-Unterseite auf dieser Website.
 */
export async function findBandWebsite(
  bandName: string,
  braveApiKey: string
): Promise<BandWebsiteResult> {
  const queries = [
    `"${bandName}" offizielle Website`,
    `"${bandName}" official website`,
    `${bandName} band site`,
  ]

  let websiteUrl: string | null = null
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let usedQuery = queries[0]

  for (const query of queries) {
    usedQuery = query
    try {
      const results = await braveSearch(query, braveApiKey, 6)
      for (const r of results) {
        if (isBlockedDomain(r.url)) continue
        try {
          const host = new URL(r.url).hostname.toLowerCase().replace(/^www\./, '')
          const nameSlug = bandName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
          // Hohe Konfidenz: Domain enthält den Band-Namen
          if (host.replace(/[^a-z0-9]/g, '').includes(nameSlug.slice(0, 6))) {
            websiteUrl = r.url
            confidence = 'high'
            break
          }
          // Mittlere Konfidenz: Titel oder Beschreibung enthält Band-Namen
          const titleLower = r.title.toLowerCase()
          if (
            titleLower.includes(bandName.toLowerCase()) &&
            !titleLower.includes('tickets') &&
            !titleLower.includes('tour dates') // songkick-artige Seiten
          ) {
            websiteUrl = r.url
            confidence = 'medium'
            break
          }
        } catch {
          // ignore
        }
      }
      if (websiteUrl) break
    } catch {
      // ignore query error, try next
    }
  }

  let tourPageUrl: string | null = null
  if (websiteUrl) {
    tourPageUrl = await findTourPageOnWebsite(websiteUrl)
  }

  return {
    bandName,
    websiteUrl,
    tourPageUrl,
    confidence,
    searchQuery: usedQuery,
  }
}
