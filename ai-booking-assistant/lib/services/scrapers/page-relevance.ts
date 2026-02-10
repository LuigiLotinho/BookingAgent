/**
 * Prüft, ob eine Seite wirklich zu einem einzelnen Festival/Venue gehört
 * (offizielle Website) und nicht zu einer Liste, Aggregator oder News.
 */

/** Domains, die typischerweise Listen/Aggregatoren/Soziales sind – keine Einzelfestival-Seiten */
const BLOCKED_DOMAINS_FESTIVAL = [
  'wikipedia.org',
  'wikimedia.org',
  'wikidata.org',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'linkedin.com',
  'amazon.',
  'ebay.',
  'google.com',
  'bing.com',
  'reddit.com',
  'tiktok.com',
  'pinterest.com',
  'news.',
  'tagesschau.',
  'spiegel.de',
  'zeit.de',
  'eventim.de', // oft Listen, nicht Einzelveranstaltung
  'songkick.com',
  'bandsintown.com',
  'last.fm',
  'discogs.com',
]

/** Für Venues: gleiche Blockliste + evtl. weitere */
const BLOCKED_DOMAINS_VENUE = [
  ...BLOCKED_DOMAINS_FESTIVAL,
  'google.com/maps',
]

/** Begriffe, die auf eine EINZELNE Festival-/Venue-Seite hindeuten */
const POSITIVE_KEYWORDS_FESTIVAL = [
  'festival',
  'bewerbung',
  'apply',
  'line-up',
  'lineup',
  'bands',
  'konzert',
  'tickets',
  'kontakt',
  'contact',
  'impressum',
  'datenschutz',
  'veranstaltung',
  'open air',
  'openair',
  'datum',
  'termine',
  'ort',
  'location',
  'venue',
  'booking',
  'anfrage',
  'künstler',
  'kuenstler',
  'artist',
]

/** Begriffe für Venue-Seiten */
const POSITIVE_KEYWORDS_VENUE = [
  'club',
  'venue',
  'konzert',
  'live',
  'booking',
  'kontakt',
  'contact',
  'veranstaltung',
  'bühne',
  'buehne',
  'stage',
  'konzerte',
  'events',
  'impressum',
]

/** Begriffe, die auf Listen/Aggregatoren/Übersichten hindeuten */
const NEGATIVE_KEYWORDS = [
  'liste der',
  'list of',
  'alle festivals',
  'übersicht',
  'uebersicht',
  'top 10',
  'top 20',
  'beste festivals',
  'festivals in deutschland',
  'festivals 2025',
  'alle veranstaltungen',
  'kalender',
  'alle events',
  'wiki ',
  'wikipedia',
  'was ist ein',
  'definition ',
  'meaning of',
]

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isBlockedDomain(url: string, list: string[]): boolean {
  const domain = getDomain(url)
  return list.some((blocked) => domain.includes(blocked))
}

/**
 * Rohen Text aus HTML holen (Tags entfernen, erste N Zeichen).
 */
export function getTextFromHtml(html: string, maxChars: number = 4000): string {
  const withoutScript = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  const withoutStyle = withoutScript.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  const text = withoutStyle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, maxChars).toLowerCase()
}

function countKeywordOccurrences(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  let count = 0
  for (const kw of keywords) {
    if (lower.includes(kw)) count++
  }
  return count
}

function hasNegativeSignal(title: string, description: string, bodySnippet: string): boolean {
  const combined = `${title} ${description} ${bodySnippet}`.toLowerCase()
  return NEGATIVE_KEYWORDS.some((kw) => combined.includes(kw))
}

/** Domain ohne www für Vergleiche */
function getDomainStem(url: string): string {
  const host = getDomain(url).replace(/^www\./, '')
  return host.replace(/\.(de|com|org|net|eu|co\.uk)$/, '')
}

/**
 * Prüft, ob die Domain zum Festival-Namen (aus Titel) passt (z. B. hurricane-festival.de).
 */
function domainMatchesFestivalName(url: string, title: string): boolean {
  const domainStem = getDomainStem(url)
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/festival|2024|2025|2026|2027/g, '')
    .replace(/^-+|-+$/g, '')
  if (!slug || slug.length < 2) return false
  return domainStem.includes(slug) || slug.includes(domainStem)
}

/**
 * Prüft, ob die Domain zum Venue-Namen (aus Titel) passt.
 */
function domainMatchesVenueName(url: string, title: string): boolean {
  const domainStem = getDomainStem(url)
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/club|venue|bühne|buehne|stage|konzerte/g, '')
    .replace(/^-+|-+$/g, '')
  if (!slug || slug.length < 2) return false
  return domainStem.includes(slug) || slug.includes(domainStem)
}

/**
 * Bewertet, ob die Seite zu einem einzelnen Festival passt (0–100).
 * Höher = eher offizielle Festival-Seite, niedriger = Liste/Aggregator/irrelevant.
 */
export function scoreFestivalRelevance(
  url: string,
  title: string,
  description: string,
  htmlText: string
): { score: number; reason: string } {
  if (isBlockedDomain(url, BLOCKED_DOMAINS_FESTIVAL)) {
    return { score: 0, reason: 'Domain blockiert (Liste/Aggregator/Soziales)' }
  }

  const bodySnippet = htmlText.slice(0, 3000)
  const combined = `${title} ${description} ${bodySnippet}`.toLowerCase()

  if (hasNegativeSignal(title, description, bodySnippet)) {
    return { score: 0, reason: 'Seite wirkt wie Liste/Übersicht/Wikipedia' }
  }

  const positiveCount = countKeywordOccurrences(combined, POSITIVE_KEYWORDS_FESTIVAL)
  let score = Math.min(100, positiveCount * 12)

  if (title.toLowerCase().includes('festival')) score += 15
  if (combined.includes('bewerbung') || combined.includes('apply') || combined.includes('kontakt')) score += 10
  if (domainMatchesFestivalName(url, title)) score += 15

  return {
    score: Math.min(100, score),
    reason: score >= 50 ? 'Sieht nach offizieller Festival-Seite aus' : 'Wenige Festival-Signale',
  }
}

/**
 * Bewertet Venue-Seiten (0–100).
 */
export function scoreVenueRelevance(
  url: string,
  title: string,
  description: string,
  htmlText: string
): { score: number; reason: string } {
  if (isBlockedDomain(url, BLOCKED_DOMAINS_VENUE)) {
    return { score: 0, reason: 'Domain blockiert' }
  }

  const bodySnippet = htmlText.slice(0, 3000)
  const combined = `${title} ${description} ${bodySnippet}`.toLowerCase()

  if (hasNegativeSignal(title, description, bodySnippet)) {
    return { score: 0, reason: 'Seite wirkt wie Liste/Übersicht' }
  }

  const positiveCount = countKeywordOccurrences(combined, POSITIVE_KEYWORDS_VENUE)
  let score = Math.min(100, positiveCount * 15)

  if (title.toLowerCase().includes('club') || title.toLowerCase().includes('venue') || title.toLowerCase().includes('bühne')) score += 10
  if (combined.includes('booking') || combined.includes('kontakt')) score += 10
  if (domainMatchesVenueName(url, title)) score += 15

  return {
    score: Math.min(100, score),
    reason: score >= 50 ? 'Sieht nach Venue-Seite aus' : 'Wenige Venue-Signale',
  }
}

/** Mindest-Score, ab dem eine Seite als „passt“ gilt (Festival). */
const FESTIVAL_RELEVANCE_THRESHOLD = 45

/** Mindest-Score für Venue. */
const VENUE_RELEVANCE_THRESHOLD = 40

/**
 * Gibt true zurück, wenn die Seite als relevante Festival-Seite gilt.
 */
export function isRelevantFestivalPage(
  url: string,
  title: string,
  description: string,
  html: string
): { relevant: boolean; score: number; reason: string } {
  const text = getTextFromHtml(html)
  const { score, reason } = scoreFestivalRelevance(url, title, description, text)
  return {
    relevant: score >= FESTIVAL_RELEVANCE_THRESHOLD,
    score,
    reason,
  }
}

/**
 * Gibt true zurück, wenn die Seite als relevante Venue-Seite gilt.
 */
export function isRelevantVenuePage(
  url: string,
  title: string,
  description: string,
  html: string
): { relevant: boolean; score: number; reason: string } {
  const text = getTextFromHtml(html)
  const { score, reason } = scoreVenueRelevance(url, title, description, text)
  return {
    relevant: score >= VENUE_RELEVANCE_THRESHOLD,
    score,
    reason,
  }
}
