/**
 * Band-Webseiten-Crawler: Findet offizielle Band-Website und extrahiert Tour-/Show-Daten
 * für band_events (source: official_website).
 */

import { fetchWithRetry } from './base-scraper';
import { searchBrave } from './brave-scraper';
import type { BandEventInsert } from '../band-events-service';

const TOUR_PATH_KEYWORDS = [
  'tour',
  'shows',
  'live',
  'dates',
  'events',
  'konzerte',
  'gigs',
  'termine',
  'auftritte',
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Sucht die offizielle Webseite einer Band (Brave).
 */
export async function findBandWebsite(bandName: string): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;
  const results = await searchBrave(`${bandName} official website`, apiKey);
  if (results.length === 0) return null;
  const first = results[0];
  const domain = getDomain(first.url);
  if (!domain || domain.includes('facebook.com') || domain.includes('instagram.com') || domain.includes('youtube.com') || domain.includes('spotify.com') || domain.includes('wikipedia.org')) {
    const next = results.find((r) => {
      const d = getDomain(r.url);
      return d && !['facebook.com', 'instagram.com', 'youtube.com', 'spotify.com', 'wikipedia.org'].some((b) => d.includes(b));
    });
    return next ? next.url : first.url;
  }
  return first.url;
}

/**
 * Findet Links zu Tour-/Shows-Seiten auf der Band-Website.
 */
export function findTourOrShowsLinks(html: string, baseUrl: string): string[] {
  const baseDomain = getDomain(baseUrl);
  const seen = new Set<string>();
  const result: string[] = [];

  const hrefRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null && result.length < 10) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
    const absolute = resolveUrl(href, baseUrl);
    if (!absolute) continue;
    const path = new URL(absolute).pathname.toLowerCase();
    const hasKeyword = TOUR_PATH_KEYWORDS.some((kw) => path.includes(kw));
    if (!hasKeyword) continue;
    const norm = absolute.replace(/\/$/, '');
    if (seen.has(norm)) continue;
    seen.add(norm);
    result.push(absolute);
  }
  return result;
}

/** Normalisiert Datum zu YYYY-MM-DD wenn möglich. */
function parseDateToISO(line: string): string | null {
  const iso = line.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  const de = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) {
    const [, d, m, y] = de;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const deShort = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/);
  if (deShort) {
    const [, d, m, y2] = deShort;
    const y = parseInt(y2, 10) >= 50 ? `19${y2}` : `20${y2}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const months: Record<string, string> = {
    january: '01', jan: '01', januar: '01',
    february: '02', feb: '02', februar: '02',
    march: '03', mar: '03', märz: '03', maerz: '03',
    april: '04', apr: '04',
    may: '05', mai: '05',
    june: '06', jun: '06', juni: '06',
    july: '07', jul: '07', juli: '07',
    august: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    october: '10', oct: '10', oktober: '10',
    november: '11', nov: '11',
    december: '12', dec: '12', dezember: '12',
  };
  const enMatch = line.match(/(\d{1,2})[\s.,-]+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[\s.,-]+(\d{4})/i);
  if (enMatch) {
    const [, d, mon, y] = enMatch;
    const m = months[mon.toLowerCase()] || '01';
    return `${y}-${m}-${d.padStart(2, '0')}`;
  }
  const deMonthMatch = line.match(/(\d{1,2})[\s.]+\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)[\s.]+\s*(\d{4})/i);
  if (deMonthMatch) {
    const [, d, mon, y] = deMonthMatch;
    const m = months[mon.toLowerCase().replace('ä', 'a')] || '01';
    return `${y}-${m}-${d.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Extrahiert Event-ähnliche Zeilen aus Seitentext (Datum + Ort/Venue).
 */
export function extractEventsFromPageText(html: string): Array<{ date: string; location_name: string; city: string; country: string }> {
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lines = text.split(/\n|<\/li>|<\/tr>/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const events: Array<{ date: string; location_name: string; city: string; country: string }> = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const date = parseDateToISO(line);
    if (!date) continue;
    const rest = line
      .replace(/(\d{4})-(\d{2})-(\d{2})/g, '')
      .replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g, '')
      .replace(/(\d{1,2})\.(\d{1,2})\.(\d{2})/g, '')
      .replace(/\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/gi, '')
      .replace(/\d{1,2}\s+(januar|februar|märz|mai|juni|juli|august|september|oktober|november|dezember)\s+\d{4}/gi, '')
      .replace(/^[\s\-|,;:]+|[\s\-|,;:]+$/g, '')
      .trim();
    if (rest.length < 2) continue;
    const cityMatch = rest.match(/,?\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ]?[a-zäöüß]+)*)\s*,?\s*(?:Germany|Deutschland|DE|Austria|Switzerland|CH)?$/i)
      || rest.match(/\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ]?[a-zäöüß]+)*)\s*$/);
    const city = cityMatch ? cityMatch[1].trim() : rest.slice(0, 80).trim();
    const location_name = rest.length > 80 ? rest.slice(0, 80).trim() : rest;
    const key = `${date}-${location_name}-${city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const year = parseInt(date.slice(0, 4), 10);
    if (year < 2015 || year > 2030) continue;
    events.push({
      date,
      location_name: location_name || 'Unbekannt',
      city: city || 'Unbekannt',
      country: 'Deutschland',
    });
  }
  return events;
}

/**
 * Holt Events von der Band-Webseite (Tour/Shows) und gibt sie als BandEventInsert[] zurück.
 */
export async function fetchBandEventsFromWebsite(bandName: string): Promise<BandEventInsert[]> {
  const websiteUrl = await findBandWebsite(bandName);
  if (!websiteUrl) return [];

  let html: string;
  try {
    const res = await fetchWithRetry(websiteUrl);
    html = await res.text();
  } catch (e) {
    console.error(`Band website fetch failed for ${bandName}:`, e);
    return [];
  }

  const tourLinks = findTourOrShowsLinks(html, websiteUrl);
  const allEvents: BandEventInsert[] = [];
  const seenKeys = new Set<string>();

  const pagesToFetch = tourLinks.length > 0 ? tourLinks.slice(0, 2) : [websiteUrl];
  for (const pageUrl of pagesToFetch) {
    await new Promise((r) => setTimeout(r, 800));
    let pageHtml: string;
    try {
      const res = await fetchWithRetry(pageUrl);
      pageHtml = await res.text();
    } catch {
      continue;
    }
    const events = extractEventsFromPageText(pageHtml);
    for (const e of events) {
      const key = `${e.date}-${e.location_name}-${e.city}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      allEvents.push({
        event_date: e.date,
        location_name: e.location_name,
        city: e.city,
        country: e.country,
        source: 'official_website',
        source_url: pageUrl,
      });
    }
  }
  return allEvents;
}
