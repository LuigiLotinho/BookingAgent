import { Festival, Venue } from '../mock-data';
import { festivalService } from './festival-service';
import { venueService } from './venue-service';
import { crawlerResultsService, type CrawlerResultRecord } from './crawler-results-service';
import { bandEventsService, type UniqueLocation } from './band-events-service';
import { fetchWithRetry, normalizeUrl } from './scrapers/base-scraper';
import { searchBrave } from './scrapers/brave-scraper';
import { searchGoogle } from './scrapers/google-scraper';
import { classifyPlaceFromPage } from './scrapers/place-classifier';
import { getTextFromHtml } from './scrapers/page-relevance';
import { extractContactInfo, determineContactType } from './scrapers/contact-extractor';
import { extractFestivalInfo } from './scrapers/festival-extractor';
import { extractFestivalInfoWithLLM } from './scrapers/llm-extractor';
import { analyzeGenreMatch, getRecommendation } from './scrapers/genre-match-analyzer';

const KARLSRUHE_COORDS = { lat: 49.0069, lng: 8.4037 };
function distanceKm(lat: number, lon: number): number {
  const R = 6371;
  const dLat = ((lat - KARLSRUHE_COORDS.lat) * Math.PI) / 180;
  const dLng = ((lon - KARLSRUHE_COORDS.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((KARLSRUHE_COORDS.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Build Partial<Festival> from crawler_results row (extracted JSONB + name, url, etc.).
 */
function festivalFromCrawlerRow(row: CrawlerResultRecord, genres: string[]): Partial<Festival> {
  const ex = (row.extracted || {}) as Record<string, unknown>;
  return {
    name: (row.name || ex.name) as string,
    website: normalizeUrl(row.url || (ex.website as string) || ''),
    description: (row.raw_text || ex.description) as string | undefined,
    genres,
    contactType: (ex.contactType as Festival['contactType']) || 'Unbekannt',
    contactEmail: (ex.contactEmail as string) || undefined,
    source: 'crawler',
    sourceDetail: row.source_detail ?? undefined,
    status: 'Neu',
    isRelevant: false,
    country: (ex.country as string) || row.country,
    location: (ex.location as string) || row.city,
    distance: (ex.distanceKm as number) ?? (ex.distance as number) ?? 0,
    dateStart: ex.dateStart as string | undefined,
    dateEnd: ex.dateEnd as string | undefined,
    size: (ex.size as Festival['size']) || 'Mittel',
    latitude: ex.latitude as number | undefined,
    longitude: ex.longitude as number | undefined,
    distanceKm: (ex.distanceKm as number) ?? undefined,
    applicationUrl: ex.applicationUrl as string | undefined,
    applicationPeriod: ex.applicationPeriod as Festival['applicationPeriod'],
    genresDetected: ex.genresDetected as Festival['genresDetected'],
    genreMatchScore: ex.genreMatchScore as number | undefined,
    showcaseStatus: ex.showcaseStatus as Festival['showcaseStatus'],
    recommendation: ex.recommendation as Festival['recommendation'],
    explanation: ex.explanation as string | undefined,
    sourceUrls: row.url ? [normalizeUrl(row.url)] : undefined,
  };
}

/**
 * Merge phase 1: Process crawler_results into festivals (source = crawler).
 * Processes one row at a time to link each row to the created festival_id.
 */
export async function mergeCrawlerResultsToFestivals(genres: string[]): Promise<Festival[]> {
  const rows = await crawlerResultsService.getUnprocessedCrawlerResults();
  const added: Festival[] = [];
  for (const row of rows) {
    const festival = festivalFromCrawlerRow(row, genres);
    const inserted = await festivalService.addFestivals([festival]);
    if (inserted.length > 0 && inserted[0].id) {
      await crawlerResultsService.markProcessed(row.id, inserted[0].id);
      added.push(inserted[0]);
    }
  }
  return added;
}

/**
 * Merge phase 2: Process band_events unique locations → find website, classify, add to festivals or venues (or link if duplicate).
 * Crawler has priority: if a festival/venue with same name+location already exists, only append source_detail and set band_events IDs.
 */
export async function mergeBandEventsToFestivalsAndVenues(genres: string[]): Promise<{
  festivals: Festival[];
  venues: Venue[];
}> {
  const locations = await bandEventsService.getUniqueLocationsFromBandEvents();
  const addedFestivals: Festival[] = [];
  const addedVenues: Venue[] = [];
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  const googleKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const googleId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  for (const loc of locations) {
    const searchQuery = `${loc.location_name} ${loc.city} ${loc.country} offizielle Website`;
    let targetUrl: string | null = null;
    let title = '';
    let description = '';

    if (apiKey) {
      const results = await searchBrave(searchQuery, apiKey);
      if (results.length > 0) {
        targetUrl = results[0].url;
        title = results[0].title;
        description = results[0].description ?? '';
      }
      await new Promise((r) => setTimeout(r, 1000));
    } else if (googleKey && googleId) {
      const results = await searchGoogle(searchQuery, googleKey, googleId);
      if (results.length > 0) {
        targetUrl = results[0].link;
        title = results[0].title;
        description = results[0].snippet ?? '';
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!targetUrl) {
      console.log(`No website found for ${loc.location_name}, ${loc.city}`);
      continue;
    }

    let html: string;
    try {
      const res = await fetchWithRetry(targetUrl);
      html = await res.text();
    } catch (e) {
      console.error(`Failed to fetch ${targetUrl}:`, e);
      continue;
    }

    const { type } = await classifyPlaceFromPage(targetUrl, title, description, html);
    const bandDetail = `Ähnliche Bands: ${loc.band_names.join(', ')}`;

    if (type === 'festival') {
      const contactInfo = await extractContactInfo(html, targetUrl);
      const regexExtracted = extractFestivalInfo(html, targetUrl);
      const llmExtracted = process.env.OPENAI_API_KEY
        ? await extractFestivalInfoWithLLM(html, targetUrl)
        : null;
      const extracted = llmExtracted
        ? {
            ...regexExtracted,
            ...llmExtracted,
            latitude: regexExtracted.latitude ?? llmExtracted.latitude,
            longitude: regexExtracted.longitude ?? llmExtracted.longitude,
            distanceKm: regexExtracted.distanceKm ?? llmExtracted.distanceKm,
          }
        : regexExtracted;
      const festivalText = getTextFromHtml(html, 6000);
      const genreResult =
        process.env.OPENAI_API_KEY ?
          await analyzeGenreMatch(genres, festivalText, festivalText)
        : null;
      const { recommendation, explanation: recExplanation } = getRecommendation(
        extracted.redFlagsDetected,
        genreResult?.genreMatchScore ?? 0,
        extracted.showcaseStatus
      );

      const existing = await festivalService.findByNameAndLocation(
        loc.location_name,
        loc.city,
        loc.country
      );
      if (existing) {
        await festivalService.appendSourceDetail(existing.id, bandDetail);
        await bandEventsService.updateProcessedEventsByLocation(
          loc.location_name,
          loc.city,
          loc.country,
          { festivalId: existing.id }
        );
        continue;
      }

      const dist =
        extracted.latitude != null && extracted.longitude != null
          ? distanceKm(extracted.latitude, extracted.longitude)
          : 0;
      const festival: Partial<Festival> = {
        name: loc.location_name,
        website: normalizeUrl(targetUrl),
        location: loc.city,
        country: loc.country,
        distance: dist,
        distanceKm: extracted.distanceKm ?? dist,
        dateStart: extracted.dateStart,
        dateEnd: extracted.dateEnd,
        size: extracted.estimatedFestivalSize ?? 'Mittel',
        latitude: extracted.latitude,
        longitude: extracted.longitude,
        applicationUrl: extracted.applicationUrl ?? contactInfo.contactPageUrl,
        applicationPeriod: extracted.applicationPeriod,
        contactType: determineContactType(contactInfo),
        contactEmail: contactInfo.email ?? undefined,
        genres,
        genresDetected: genreResult?.detectedFestivalGenres,
        genreMatchScore: genreResult?.genreMatchScore,
        showcaseStatus:
          extracted.showcaseStatus === 'unknown' ? 'unknown' : extracted.showcaseStatus,
        recommendation,
        explanation: [genreResult?.explanation, recExplanation].filter(Boolean).join(' ') || undefined,
        source: 'similar_bands',
        sourceDetail: bandDetail,
        status: 'Neu',
        isRelevant: false,
        sourceUrls: [normalizeUrl(targetUrl)],
      };
      const inserted = await festivalService.addFestivals([festival]);
      if (inserted.length > 0) {
        addedFestivals.push(inserted[0]);
        await bandEventsService.updateProcessedEventsByLocation(
          loc.location_name,
          loc.city,
          loc.country,
          { festivalId: inserted[0].id }
        );
      }
    } else {
      const contactInfo = await extractContactInfo(html, targetUrl);
      const existing = await venueService.findByNameAndLocation(
        loc.location_name,
        loc.city,
        loc.country
      );
      if (existing) {
        await venueService.appendSourceDetail(existing.id, bandDetail);
        await bandEventsService.updateProcessedEventsByLocation(
          loc.location_name,
          loc.city,
          loc.country,
          { venueId: existing.id }
        );
        continue;
      }

      const venue: Partial<Venue> = {
        name: loc.location_name,
        location: loc.city,
        country: loc.country,
        distance: 0,
        venueType: 'Sonstiges',
        genres,
        contactType: determineContactType(contactInfo),
        contactEmail: contactInfo.email ?? undefined,
        website: normalizeUrl(targetUrl),
        source: 'similar_bands',
        sourceDetail: bandDetail,
        status: 'Neu',
        isRelevant: false,
        applyFrequency: 'monthly',
        recurring: true,
      };
      const inserted = await venueService.addVenues([venue]);
      if (inserted.length > 0) {
        addedVenues.push(inserted[0]);
        await bandEventsService.updateProcessedEventsByLocation(
          loc.location_name,
          loc.city,
          loc.country,
          { venueId: inserted[0].id }
        );
      }
    }
  }

  return { festivals: addedFestivals, venues: addedVenues };
}
