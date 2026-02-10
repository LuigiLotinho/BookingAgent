/**
 * Extrahiert Festival-/Venue-Links aus Listen-Seiten (z. B. Übersichtsseiten).
 * Nur Links auf andere Domains (nicht interne Navigation der Liste).
 */

const FESTIVAL_LINK_KEYWORDS = [
  'festival',
  'bewerbung',
  'line-up',
  'lineup',
  'offizielle',
  'website',
  'homepage',
  'kontakt',
  'apply',
]

const MAX_LINKS = 28

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

    const normalized = absolute.replace(/\/+$/, '') || absolute
    if (seen.has(normalized)) continue
    seen.add(normalized)

    if (!linkTextOrContextMatches(linkContent) && !linkTextOrContextMatches(absolute)) {
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
