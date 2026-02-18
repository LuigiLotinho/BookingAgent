/**
 * Extrahiert erweiterte Festival-Infos aus HTML/Text:
 * Datum, Größe, Stadt, App-URL/Periode, Red-Flags (showcase, pay to play, etc.)
 */

import { getTextFromHtml } from './page-relevance';

const RED_FLAG_KEYWORDS = [
  'showcase',
  'submission fee',
  'pay to play',
  'pay-to-play',
  'sell tickets',
  'contest',
  'bewerbungsgebühr',
  'teilnahmegebühr',
  'tickets verkaufen',
  'wettbewerb',
];

export interface ExtractedFestivalInfo {
  city?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  dateStart?: string;
  dateEnd?: string;
  estimatedFestivalSize?: 'Klein' | 'Mittel' | 'Gross';
  applicationUrl?: string;
  applicationPeriod?: 'explicit' | 'estimated';
  showcaseStatus: true | false | 'unknown';
  redFlagsDetected: string[];
}

function getText(html: string, maxChars: number = 8000): string {
  return getTextFromHtml(html, maxChars);
}

/** Erkennt Red-Flag-Keywords im Text */
export function detectRedFlags(text: string): { detected: string[]; showcaseStatus: true | false | 'unknown' } {
  const lower = text.toLowerCase();
  const detected = RED_FLAG_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
  let showcaseStatus: true | false | 'unknown' = 'unknown';
  if (lower.includes('showcase')) showcaseStatus = true;
  if (detected.length > 0 && !lower.includes('showcase')) showcaseStatus = false;
  return { detected, showcaseStatus };
}

const MONTH_MAP: Record<string, string> = {
  januar: '01', jan: '01',
  februar: '02', feb: '02',
  maerz: '03', marz: '03', mar: '03',
  april: '04', apr: '04',
  mai: '05',
  juni: '06', jun: '06',
  juli: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09',
  oktober: '10', okt: '10', oct: '10',
  november: '11', nov: '11',
  dezember: '12', dez: '12', dec: '12',
};

function normalizeMonth(raw: string): string {
  const norm = raw.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
  return MONTH_MAP[norm] || MONTH_MAP[norm.slice(0, 3)] || '00';
}

/** Sucht nach Datumsangaben im Originaltext (nicht lowercased, damit Monatsnamen erkannt werden). */
function extractDates(text: string): { dateStart?: string; dateEnd?: string } {
  const currentYear = new Date().getFullYear();

  // Bereich mit Monatsnamen: "12. – 14. Juni 2025" / "12.-14. Juni 2025"
  const rangeMonthRe = /(\d{1,2})\.\s*[-–]\s*(\d{1,2})\.\s*(Januar|Februar|M[äa]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/i;
  const rangeMatch = text.match(rangeMonthRe);
  if (rangeMatch) {
    const m = normalizeMonth(rangeMatch[3]);
    const y = rangeMatch[4];
    if (m !== '00') {
      return {
        dateStart: `${y}-${m}-${rangeMatch[1].padStart(2, '0')}`,
        dateEnd:   `${y}-${m}-${rangeMatch[2].padStart(2, '0')}`,
      };
    }
  }

  // Einzeldatum mit Monatsnamen: "14. Juni 2025"
  const singleMonthRe = /(\d{1,2})\.\s*(Januar|Februar|M[äa]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/i;
  const singleMatch = text.match(singleMonthRe);
  if (singleMatch) {
    const m = normalizeMonth(singleMatch[2]);
    const y = singleMatch[3];
    if (m !== '00') {
      return {
        dateStart: `${y}-${m}-${singleMatch[1].padStart(2, '0')}`,
        dateEnd:   `${y}-${m}-${singleMatch[1].padStart(2, '0')}`,
      };
    }
  }

  // Deutsches Format: 12.06.2025 — nur zukünftige Jahre
  const deRe = /(\d{1,2})\.(\d{1,2})\.(20\d{2})/g;
  let deMatch: RegExpExecArray | null;
  while ((deMatch = deRe.exec(text)) !== null) {
    const y = parseInt(deMatch[3], 10);
    if (y >= currentYear) {
      const [, d, m] = deMatch;
      return {
        dateStart: `${deMatch[3]}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
        dateEnd:   `${deMatch[3]}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
      };
    }
  }

  // ISO: 2025-06-12 — nur zukünftige Jahre
  const isoRe = /(20\d{2})-(\d{2})-(\d{2})/g;
  let isoMatch: RegExpExecArray | null;
  while ((isoMatch = isoRe.exec(text)) !== null) {
    const y = parseInt(isoMatch[1], 10);
    if (y >= currentYear) {
      return { dateStart: isoMatch[0], dateEnd: isoMatch[0] };
    }
  }

  return {};
}

/** Schätzt Festival-Größe aus Text (klein/mittel/groß) */
function estimateSize(text: string): 'Klein' | 'Mittel' | 'Gross' | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('klein') || lower.includes('intim') || lower.includes('< 5000') || lower.includes('unter 5000')) return 'Klein';
  if (lower.includes('groß') || lower.includes('gross') || lower.includes('> 20000') || lower.includes('über 20000') || lower.includes('80.000') || lower.includes('100.000')) return 'Gross';
  if (lower.includes('mittel') || lower.includes('5.000') || lower.includes('10.000') || lower.includes('15.000')) return 'Mittel';
  return undefined;
}

const APPLICATION_URL_PATTERNS = [
  /href=["']([^"']*(?:bewerbung|bewerben|apply|application|anfrage|booking|mitmachen|bands|artists|artist|lineup|teilnehmen|submit|submission)[^"']*)["']/gi,
  /href=["']([^"']*(?:kontakt|contact)[^"']*)["']/gi,
];

/** Sucht Bewerbungs-URL aus typischen href-Patterns. Bevorzugt bewerbungs-spezifische Links. */
function extractApplicationUrl(html: string, baseUrl: string): string | undefined {
  for (const re of APPLICATION_URL_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      if (!href) continue;
      try {
        const resolved = new URL(href, baseUrl).toString();
        // skip obvious non-contact pages (imprint, privacy, social, downloads)
        if (/impressum|datenschutz|privacy|facebook|instagram|twitter|\.pdf/i.test(resolved)) continue;
        return resolved;
      } catch {
        // skip
      }
    }
  }
  return undefined;
}

/** Erkennt ob Bewerbungsfrist/Periode explizit genannt wird */
function detectApplicationPeriod(text: string): 'explicit' | 'estimated' | undefined {
  const lower = text.toLowerCase();
  if (
    lower.includes('bewerbungsschluss') || lower.includes('deadline') ||
    lower.includes('bewerbungsfrist') || lower.includes('einsendeschluss') ||
    lower.includes('anmeldeschluss') || lower.includes('bis zum') ||
    lower.includes('apply by') || lower.includes('applications close') ||
    lower.includes('submission deadline')
  ) return 'explicit';
  if (lower.includes('bewerbung') || lower.includes('bewerben') || lower.includes('apply') || lower.includes('mitmachen') || lower.includes('teilnehmen')) return 'estimated';
  return undefined;
}

/**
 * Extrahiert Stadtname mit mehreren Strategien:
 * 1. Vor Land-Nennungen (Berlin, Deutschland)
 * 2. Explizite Label (Ort:, Veranstaltungsort:, Standort:)
 * 3. "stattfindet in / findet statt in / in [Stadt]"
 * 4. Aus der Domain der URL (festival-berlin.de → berlin)
 */
function extractCity(text: string, pageUrl?: string): string | undefined {
  // Strategy 1: "Stadt, Deutschland/Germany/Austria/Switzerland/AT/CH/DE"
  const beforeCountry = text.match(
    /\b([A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)?)\s*,?\s*(?:Deutschland|Germany|Österreich|Austria|Schweiz|Switzerland|DE|AT|CH)\b/
  );
  if (beforeCountry) return beforeCountry[1].trim();

  // Strategy 2: explicit location label
  const labelMatch = text.match(
    /(?:Ort|Veranstaltungsort|Standort|Location|Stadt)\s*[:\-–]\s*([A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)?)/
  );
  if (labelMatch) return labelMatch[1].trim();

  // Strategy 3: "in [City]" near festival-related keywords
  const nearFestival = text.match(
    /(?:Festival|Open.Air|Konzert|Veranstaltung)\s+(?:\w+\s+){0,5}in\s+([A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)?)/
  );
  if (nearFestival) return nearFestival[1].trim();

  // Strategy 4: domain-based hint (e.g. festival-berlin.de, koelnfestival.de)
  if (pageUrl) {
    try {
      const host = new URL(pageUrl).hostname.toLowerCase().replace(/^www\./, '');
      const parts = host.replace(/\.(de|at|ch|com|org|net)$/, '').split(/[-_.]/);
      for (const part of parts) {
        if (part.length >= 4 && CITY_COORDS[part]) {
          const cityKey = part;
          const found = Object.keys(CITY_COORDS).find((k) => k === cityKey);
          if (found) return found.charAt(0).toUpperCase() + found.slice(1);
        }
      }
    } catch { /* ignore */ }
  }

  return undefined;
}

const KARLSRUHE = { lat: 49.0069, lng: 8.4037 };

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  berlin: { lat: 52.52, lng: 13.405 },
  hamburg: { lat: 53.55, lng: 9.993 },
  münchen: { lat: 48.137, lng: 11.575 }, muenchen: { lat: 48.137, lng: 11.575 }, munich: { lat: 48.137, lng: 11.575 },
  köln: { lat: 50.938, lng: 6.96 }, koeln: { lat: 50.938, lng: 6.96 }, cologne: { lat: 50.938, lng: 6.96 },
  frankfurt: { lat: 50.11, lng: 8.682 },
  stuttgart: { lat: 48.775, lng: 9.182 },
  düsseldorf: { lat: 51.225, lng: 6.776 }, duesseldorf: { lat: 51.225, lng: 6.776 },
  dortmund: { lat: 51.514, lng: 7.468 },
  essen: { lat: 51.455, lng: 7.012 },
  bremen: { lat: 53.079, lng: 8.801 },
  hannover: { lat: 52.374, lng: 9.738 },
  nürnberg: { lat: 49.454, lng: 11.077 }, nuernberg: { lat: 49.454, lng: 11.077 },
  leipzig: { lat: 51.34, lng: 12.375 },
  dresden: { lat: 51.05, lng: 13.737 },
  bielefeld: { lat: 52.021, lng: 8.532 },
  bonn: { lat: 50.733, lng: 7.1 },
  münster: { lat: 51.962, lng: 7.626 }, muenster: { lat: 51.962, lng: 7.626 },
  karlsruhe: { lat: 49.007, lng: 8.404 },
  mannheim: { lat: 49.487, lng: 8.466 },
  augsburg: { lat: 48.37, lng: 10.898 },
  wiesbaden: { lat: 50.083, lng: 8.24 },
  kiel: { lat: 54.323, lng: 10.123 },
  chemnitz: { lat: 50.832, lng: 12.924 },
  aachen: { lat: 50.776, lng: 6.084 },
  halle: { lat: 51.483, lng: 11.97 },
  magdeburg: { lat: 52.131, lng: 11.636 },
  freiburg: { lat: 47.997, lng: 7.842 },
  lübeck: { lat: 53.869, lng: 10.687 }, luebeck: { lat: 53.869, lng: 10.687 },
  erfurt: { lat: 50.978, lng: 11.029 },
  rostock: { lat: 54.088, lng: 12.14 },
  mainz: { lat: 49.998, lng: 8.274 },
  kassel: { lat: 51.312, lng: 9.48 },
  saarbrücken: { lat: 49.235, lng: 7.0 }, saarbruecken: { lat: 49.235, lng: 7.0 },
  potsdam: { lat: 52.391, lng: 13.065 },
  heidelberg: { lat: 49.399, lng: 8.673 },
  darmstadt: { lat: 49.872, lng: 8.651 },
  regensburg: { lat: 49.015, lng: 12.1 },
  würzburg: { lat: 49.796, lng: 9.951 }, wuerzburg: { lat: 49.796, lng: 9.951 },
  ulm: { lat: 48.4, lng: 9.987 },
  göttingen: { lat: 51.534, lng: 9.932 }, goettingen: { lat: 51.534, lng: 9.932 },
  wien: { lat: 48.208, lng: 16.373 }, vienna: { lat: 48.208, lng: 16.373 },
  graz: { lat: 47.07, lng: 15.44 },
  linz: { lat: 48.306, lng: 14.286 },
  salzburg: { lat: 47.797, lng: 13.046 },
  innsbruck: { lat: 47.269, lng: 11.404 },
  zürich: { lat: 47.377, lng: 8.541 }, zuerich: { lat: 47.377, lng: 8.541 }, zurich: { lat: 47.377, lng: 8.541 },
  bern: { lat: 46.948, lng: 7.448 },
  basel: { lat: 47.558, lng: 7.588 },
  genf: { lat: 46.198, lng: 6.142 },
  lausanne: { lat: 46.52, lng: 6.633 },
};

export function lookupCityCoords(city: string): { lat: number; lng: number } | null {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return CITY_COORDS[key] ?? CITY_COORDS[key.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')] ?? null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** Koordinaten aus Text (z. B. 49.123, 8.456 oder „lat 49.1 lon 8.4“) */
function extractLatLon(text: string): { lat?: number; lon?: number } {
  const latExplicit = text.match(/(?:lat|latitude|breitengrad)\s*[:=]?\s*([+-]?\d+\.?\d*)/i);
  const lonExplicit = text.match(/(?:lon|lng|longitude|längengrad)\s*[:=]?\s*([+-]?\d+\.?\d*)/i);
  if (latExplicit?.[1] && lonExplicit?.[1]) {
    return { lat: parseFloat(latExplicit[1]), lon: parseFloat(lonExplicit[1]) };
  }
  const coordPair = text.match(/\b(5[0-2]\.\d+)\s*[,/]\s*(6|7|8|9|10|11|12|13|14)\.\d+/);
  if (coordPair) {
    const [a, b] = coordPair[0].split(/[,/]/).map(Number);
    if (a >= 47 && a <= 55 && b >= 5 && b <= 15) return { lat: a, lon: b };
  }
  return {};
}

/** Erkennt das Land aus dem Seitentext anhand der TLD oder expliziter Nennungen. */
function extractCountry(text: string, pageUrl: string): string {
  try {
    const tld = new URL(pageUrl).hostname.split('.').pop()?.toLowerCase();
    if (tld === 'at') return 'Österreich';
    if (tld === 'ch') return 'Schweiz';
    if (tld === 'de') return 'Deutschland';
  } catch { /* ignore */ }
  const lower = text.toLowerCase();
  if (lower.includes('österreich') || lower.includes('austria')) return 'Österreich';
  if (lower.includes('schweiz') || lower.includes('switzerland')) return 'Schweiz';
  if (lower.includes('deutschland') || lower.includes('germany')) return 'Deutschland';
  return 'Deutschland'; // fallback
}

/**
 * Extrahiert alle erweiterten Festival-Infos aus HTML und URL.
 * @param homeCoords Heimatkoordinaten der Band für Distanzberechnung (optional, Fallback: Karlsruhe)
 */
export function extractFestivalInfo(
  html: string,
  pageUrl: string,
  homeCoords?: { lat: number; lng: number }
): ExtractedFestivalInfo {
  const home = homeCoords ?? { lat: 49.0069, lng: 8.4037 }; // Karlsruhe as fallback
  const text = getText(html);
  // For date extraction we need the original casing (month names like "Juni", "März")
  const textOriginalCase = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
  const { detected: redFlagsDetected, showcaseStatus } = detectRedFlags(text);
  const { dateStart, dateEnd } = extractDates(textOriginalCase);
  const estimatedFestivalSize = estimateSize(text);
  const applicationUrl = extractApplicationUrl(html, pageUrl);
  const applicationPeriod = detectApplicationPeriod(text);
  const city = extractCity(textOriginalCase, pageUrl);
  const country = extractCountry(textOriginalCase, pageUrl);
  const { lat: latitude, lon: longitude } = extractLatLon(text);

  let distanceKm: number | undefined;
  if (latitude != null && longitude != null) {
    distanceKm = haversineKm(home.lat, home.lng, latitude, longitude);
  } else if (city) {
    const coords = lookupCityCoords(city);
    if (coords) {
      distanceKm = haversineKm(home.lat, home.lng, coords.lat, coords.lng);
    }
  }

  return {
    city,
    country,
    latitude,
    longitude,
    distanceKm,
    dateStart,
    dateEnd,
    estimatedFestivalSize,
    applicationUrl,
    applicationPeriod,
    showcaseStatus,
    redFlagsDetected,
  };
}
