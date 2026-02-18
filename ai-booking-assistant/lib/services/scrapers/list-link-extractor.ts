/**
 * Extrahiert Festival-/Venue-Links aus Listen-Seiten (z. B. Übersichtsseiten).
 * Nur Links auf andere Domains (nicht interne Navigation der Liste).
 */

const FESTIVAL_LINK_KEYWORDS = [
  'festival',
  'fest',
  'open-air',
  'openair',
  'open air',
  'musik',
  'music',
  'bewerbung',
  'line-up',
  'lineup',
  'offizielle',
  'website',
  'homepage',
  'kontakt',
  'apply',
  'konzert',
  'concert',
  'veranstaltung',
  'event',
]

/** Domains that are clearly not festival websites – skip their links */
const LINK_BLOCKED_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com',
  'tiktok.com', 'wikipedia.org', 'google.com', 'amazon.', 'ebay.',
  'eventim.de', 'ticketmaster.', 'songkick.com', 'bandsintown.com',
]

const MAX_LINKS = 40

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function linkTextOrContextMatches(text: string): boolean {
  const lower = text.toLowerCase()
  return FESTIVAL_LINK_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Extrahiert alle <a href="..."> aus HTML und gibt absolute URLs + Link-Text zurück.
 * Filtert: nur Links auf andere Domains; optional nur solche mit Festival-Keywords im Text.
 */
export function extractFestivalLinksFromListPage(
  html: string,
  listPageUrl: string
): { url: string; linkText: string }[] {
  const listDomain = getDomain(listPageUrl)
  const seen = new Set<string>()
  const result: { url: string; linkText: string }[] = []

  const hrefRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = hrefRegex.exec(html)) !== null && result.length < MAX_LINKS) {
    const href = match[1].trim()
    const linkContent = (match[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
      continue
    }

    const absolute = resolveUrl(href, listPageUrl)
    if (!absolute) continue

    const linkDomain = getDomain(absolute)
    if (!linkDomain || linkDomain === listDomain) continue

    // Skip obviously non-festival domains
    if (LINK_BLOCKED_DOMAINS.some((b) => linkDomain.includes(b))) continue

    const normalized = absolute.replace(/\/+$/, '') || absolute
    if (seen.has(normalized)) continue
    seen.add(normalized)

    // Accept if link text, URL, OR domain contains festival-related keyword.
    // This is intentionally broad – the relevance check in the main loop will filter.
    if (
      !linkTextOrContextMatches(linkContent) &&
      !linkTextOrContextMatches(absolute) &&
      !linkTextOrContextMatches(linkDomain)
    ) {
      continue
    }

    result.push({ url: absolute, linkText: linkContent.slice(0, 200) })
  }

  return result.slice(0, MAX_LINKS)
}

/**
 * Liest <title> und meta description aus HTML (für Kandidaten aus Listen, die keine Suchtreffer-Metadaten haben).
 */
export function getPageTitleAndDescription(html: string): { title: string; description: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = (titleMatch?.[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const description = (metaMatch?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 300)
  return { title: title || 'Unbekannt', description: description || '' }
}
