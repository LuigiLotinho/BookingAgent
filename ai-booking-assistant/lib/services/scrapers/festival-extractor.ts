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

/** Sucht nach Datumsangaben (z. B. 12.–14. Juni 2025, 12.06.2025, June 12-14 2025) */
function extractDates(text: string): { dateStart?: string; dateEnd?: string } {
  const result: { dateStart?: string; dateEnd?: string } = {};
  // ISO-ähnlich: 2025-06-12, 12.06.2025, 12.6.2025
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    result.dateStart = isoMatch[0];
    result.dateEnd = result.dateStart;
  }
  const deMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (deMatch) {
    const [, d, m, y] = deMatch;
    result.dateStart = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    result.dateEnd = result.dateStart;
  }
  // Bereich: 12.–14. Juni 2025
  const rangeMatch = text.match(/(\d{1,2})\.\s*[-–]\s*(\d{1,2})\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/i);
  if (rangeMatch) {
    const months: Record<string, string> = { januar: '01', februar: '02', märz: '03', april: '04', mai: '05', juni: '06', juli: '07', august: '08', september: '09', oktober: '10', november: '11', dezember: '12' };
    const mon = rangeMatch[3].toLowerCase().replace('ä', 'a');
    const m = months[mon] || '06';
    const y = rangeMatch[4];
    result.dateStart = `${y}-${m}-${rangeMatch[1].padStart(2, '0')}`;
    result.dateEnd = `${y}-${m}-${rangeMatch[2].padStart(2, '0')}`;
  }
  return result;
}

/** Schätzt Festival-Größe aus Text (klein/mittel/groß) */
function estimateSize(text: string): 'Klein' | 'Mittel' | 'Gross' | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('klein') || lower.includes('intim') || lower.includes('< 5000') || lower.includes('unter 5000')) return 'Klein';
  if (lower.includes('groß') || lower.includes('gross') || lower.includes('> 20000') || lower.includes('über 20000') || lower.includes('80.000') || lower.includes('100.000')) return 'Gross';
  if (lower.includes('mittel') || lower.includes('5.000') || lower.includes('10.000') || lower.includes('15.000')) return 'Mittel';
  return undefined;
}

/** Sucht Bewerbungs-URL (apply, bewerbung, application) */
function extractApplicationUrl(html: string, baseUrl: string): string | undefined {
  const lower = html.toLowerCase();
  const patterns = [
    /href=["']([^"']*(?:bewerbung|apply|application|anfrage|booking)[^"']*)["']/gi,
    /href=["']([^"']*kontakt[^"']*)["']/gi,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) {
      try {
        return new URL(m[1], baseUrl).toString();
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
  if (lower.includes('bewerbungsschluss') || lower.includes('deadline') || lower.includes('bis zum') || lower.includes('bis ') || lower.includes('ab ') || lower.includes('von ') || lower.includes('bewerbungsfrist')) return 'explicit';
  if (lower.includes('bewerbung') || lower.includes('apply')) return 'estimated';
  return undefined;
}

/** Deutsche Stadt aus Text (grobe Heuristik: Großbuchstabe + Kleinbuchstaben, typische Endungen) */
function extractCity(text: string): string | undefined {
  const match = text.match(/\b([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ]?[a-zäöüß]+)*)\s*,?\s*(?:Deutschland|Germany|DE)\b/i);
  return match ? match[1].trim() : undefined;
}

const KARLSRUHE = { lat: 49.0069, lng: 8.4037 };

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

/**
 * Extrahiert alle erweiterten Festival-Infos aus HTML und URL.
 */
export function extractFestivalInfo(html: string, pageUrl: string): ExtractedFestivalInfo {
  const text = getText(html);
  const { detected: redFlagsDetected, showcaseStatus } = detectRedFlags(text);
  const { dateStart, dateEnd } = extractDates(text);
  const estimatedFestivalSize = estimateSize(text);
  const applicationUrl = extractApplicationUrl(html, pageUrl);
  const applicationPeriod = detectApplicationPeriod(text);
  const city = extractCity(text);
  const { lat: latitude, lon: longitude } = extractLatLon(text);

  let distanceKm: number | undefined;
  if (latitude != null && longitude != null) {
    distanceKm = haversineKm(KARLSRUHE.lat, KARLSRUHE.lng, latitude, longitude);
  }

  return {
    city,
    country: 'Deutschland',
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
