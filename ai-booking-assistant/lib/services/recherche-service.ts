import { supabase } from '../supabase';
import { Festival, Venue } from '../mock-data';
import { festivalService } from './festival-service';
import { venueService } from './venue-service';
import { profileService } from './profile-service';
import { settingsService } from './settings-service';
import { crawlerResultsService, type CrawlerResultRow } from './crawler-results-service';
import { bandEventsService } from './band-events-service';
import { mergeBandEventsToFestivalsAndVenues } from './merge-service';
import { fetchWithRetry, normalizeUrl } from './scrapers/base-scraper';
import { extractContactInfo, determineContactType } from './scrapers/contact-extractor';
import { searchGoogle, buildFestivalSearchQueries } from './scrapers/google-scraper';
import { searchBrave } from './scrapers/brave-scraper';
import { searchBandsintownEvents } from './scrapers/bandsintown-scraper';
import { fetchBandEventsFromWebsite } from './scrapers/band-website-scraper';
import { isRelevantFestivalPage, getTextFromHtml } from './scrapers/page-relevance';
import { extractFestivalLinksFromListPage, getPageTitleAndDescription } from './scrapers/list-link-extractor';
import { isRelevantFestivalPageWithLLM } from './scrapers/llm-relevance';
import { extractFestivalInfo, lookupCityCoords } from './scrapers/festival-extractor';
import { analyzeGenreMatch, getRecommendation } from './scrapers/genre-match-analyzer';

/**
 * Service to handle festival research based on similar bands and keywords.
 */
export const rechercheService = {
  /**
   * Search for festivals where similar bands have played in the last 10 years.
   * @param bands Array of similar band names
   */
  async findFestivalsBySimilarBands(bands: string[]) {
    console.log('Searching festivals for similar bands:', bands);
    
    // In V1, this is triggered manually or by a background job.
    // For now, we return the results found by the AI agent.
    return [];
  },

  /**
   * Run a full research cycle based on band profile
   * Now includes real crawling from Google, Bandsintown, and social media
   */
  async runResearch(profileId: string): Promise<{ success: boolean; error?: string; festivals?: Festival[]; venues?: Venue[] }> {
    const metrics = {
      braveEnabled: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      googleEnabled: Boolean(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID),
      openaiEnabled: Boolean(process.env.OPENAI_API_KEY),
      queriesRun: 0,
      braveResultsTotal: 0,
      bravePagesFetched: 0,
      braveRelevant: 0,
      festivalsWrittenPhase1: 0,
      listCandidates: 0,
      listPagesFetched: 0,
      listRelevant: 0,
      festivalsWrittenList: 0,
      crawlerRowsInserted: 0,
      similarBandsEnabled: false,
      similarBandsCount: 0,
    };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (!profile) {
      console.error('Profile not found');
      return { success: false, error: 'Kein Band-Profil gefunden. Bitte zuerst unter „Band-Profil“ anlegen.' };
    }

    console.log(`Starting research for band: ${profile.name}`);

    const settings = await settingsService.getSettings();
    const bandProfile = await profileService.getProfile();

    if (!bandProfile) {
      console.error('Band profile not found');
      return { success: false, error: 'Band-Profil konnte nicht geladen werden (Datenbankfehler?).' };
    }

    const genres = profile.genres || [];
    // Use city + country for more specific queries; fall back gracefully
    const city = profile.city || '';
    const country = profile.country || 'Deutschland';
    const location = city ? `${city}, ${country}` : country;
    const year = new Date().getFullYear();

    // Home coordinates for distance calculation
    const homeCoords: { lat: number; lng: number } | undefined = (() => {
      if (city) {
        const coords = lookupCityCoords(city);
        if (coords) return coords;
      }
      return undefined; // extractFestivalInfo falls back to Karlsruhe
    })();

    metrics.similarBandsEnabled = Boolean(settings?.similar_band_feature);
    metrics.similarBandsCount = Array.isArray(profile.similar_bands)
      ? (profile.similar_bands as string[]).filter((b) => b && b.trim().length > 0).length
      : 0;

    console.log(
      `[Research] env brave=${metrics.braveEnabled} google=${metrics.googleEnabled} openai=${metrics.openaiEnabled} similarBandsFeature=${metrics.similarBandsEnabled} similarBandsCount=${metrics.similarBandsCount}`
    );

    // Phase 1: Crawler (Brave + Listen) → crawler_results
    const crawlerRows: CrawlerResultRow[] = [];
    const existingCrawlerUrls = new Set<string>();
    const festivalQueries = buildFestivalSearchQueries(genres, location, year);

    // ─── Shared helper: process one URL as a potential festival page ────────────
    // Note: google_search is mapped to brave_search for the crawler_results table (same type)
    type CrawlerSource = 'brave_search' | 'google_search' | 'list_page';
    const processCandidateUrl = async (
      url: string,
      titleHint: string,
      descriptionHint: string,
      source: CrawlerSource,
      sourceDetail: string
    ): Promise<void> => {
      const urlNorm = normalizeUrl(url);
      if (existingCrawlerUrls.has(urlNorm)) return;
      // Mark as seen synchronously before any await to prevent duplicates across parallel tasks
      existingCrawlerUrls.add(urlNorm);

      let html: string;
      try {
        const response = await fetchWithRetry(url);
        html = await response.text();
      } catch (err) {
        console.error(`Fetch error ${url}:`, err);
        return;
      }

      // For list-phase, the title/description come from the page itself
      let title = titleHint;
      let description = descriptionHint;
      if (!title) {
        const meta = getPageTitleAndDescription(html);
        title = meta.title;
        description = meta.description;
      }

      if (source === 'list_page') metrics.listPagesFetched += 1;
      else metrics.bravePagesFetched += 1;

      let { relevant, score, reason } = isRelevantFestivalPage(url, title, description, html);
      // Widen LLM range: scores 20–55 are borderline – let the LLM decide
      if (score >= 20 && score <= 55 && process.env.OPENAI_API_KEY) {
        const llm = await isRelevantFestivalPageWithLLM(title, description, getTextFromHtml(html, 1500));
        relevant = llm.relevant;
        if (llm.reason) reason = llm.reason;
      }
      if (!relevant) {
        console.log(`Übersprungen (${reason}, Score ${score}): ${title} – ${url}`);
        return;
      }

      if (source === 'list_page') metrics.listRelevant += 1;
      else metrics.braveRelevant += 1;

      let contactInfo = await extractContactInfo(html, url);
      // Follow contact page to find email if the main page has none
      if (!contactInfo.email && contactInfo.contactPageUrl && contactInfo.contactPageUrl !== urlNorm) {
        try {
          const contactResp = await fetchWithRetry(contactInfo.contactPageUrl);
          const contactHtml = await contactResp.text();
          const deepContact = await extractContactInfo(contactHtml, contactInfo.contactPageUrl);
          if (deepContact.email) contactInfo = { ...contactInfo, email: deepContact.email };
        } catch { /* silent */ }
      }

      const extracted = extractFestivalInfo(html, url, homeCoords);
      const festivalText = getTextFromHtml(html, 6000);
      const genreResult = process.env.OPENAI_API_KEY
        ? await analyzeGenreMatch(genres, festivalText, festivalText)
        : null;
      const { recommendation, explanation: recExplanation } = getRecommendation(
        extracted.redFlagsDetected,
        genreResult?.genreMatchScore ?? 0,
        extracted.showcaseStatus,
        genreResult !== null
      );
      const locationHint = extracted.city ?? description?.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)?.[0];

      crawlerRows.push({
        name: title,
        url: urlNorm,
        city: extracted.city ?? undefined,
        country: extracted.country ?? undefined,
        raw_text: getTextFromHtml(html, 4000),
        relevance_score: score,
        source: source === 'google_search' ? 'brave_search' : source,
        source_detail: sourceDetail,
        extracted: {
          name: title,
          website: urlNorm,
          description,
          country: extracted.country,
          location: locationHint,
          distanceKm: extracted.distanceKm ?? 0,
          dateStart: extracted.dateStart,
          dateEnd: extracted.dateEnd,
          size: extracted.estimatedFestivalSize ?? 'Mittel',
          latitude: extracted.latitude,
          longitude: extracted.longitude,
          applicationUrl: extracted.applicationUrl ?? contactInfo.contactPageUrl,
          applicationPeriod: extracted.applicationPeriod,
          contactType: determineContactType(contactInfo),
          contactEmail: contactInfo.email ?? undefined,
          genresDetected: genreResult?.detectedFestivalGenres,
          genreMatchScore: genreResult?.genreMatchScore,
          showcaseStatus: extracted.showcaseStatus === 'unknown' ? 'unknown' : extracted.showcaseStatus,
          recommendation,
          explanation: [genreResult?.explanation, recExplanation].filter(Boolean).join(' ') || undefined,
        },
      });
      const festival: Partial<Festival> = {
        name: title,
        website: urlNorm,
        description,
        genres,
        contactType: determineContactType(contactInfo),
        contactEmail: contactInfo.email ?? undefined,
        source: 'crawler',
        sourceDetail,
        status: 'Neu',
        isRelevant: false,
        country: extracted.country,
        location: locationHint,
        distance: extracted.distanceKm ?? 0,
        dateStart: extracted.dateStart,
        dateEnd: extracted.dateEnd,
        size: extracted.estimatedFestivalSize ?? 'Mittel',
        latitude: extracted.latitude,
        longitude: extracted.longitude,
        distanceKm: extracted.distanceKm,
        applicationUrl: extracted.applicationUrl ?? contactInfo.contactPageUrl,
        applicationPeriod: extracted.applicationPeriod,
        genresDetected: genreResult?.detectedFestivalGenres,
        genreMatchScore: genreResult?.genreMatchScore,
        showcaseStatus: extracted.showcaseStatus === 'unknown' ? 'unknown' : extracted.showcaseStatus,
        recommendation,
        explanation: [genreResult?.explanation, recExplanation].filter(Boolean).join(' ') || undefined,
        sourceUrls: [urlNorm],
      };
      const written = await festivalService.addFestivals([festival]);
      if (source === 'list_page') metrics.festivalsWrittenList += written.length;
      else metrics.festivalsWrittenPhase1 += written.length;
    };
    // ────────────────────────────────────────────────────────────────────────────

    if (process.env.BRAVE_SEARCH_API_KEY) {
      for (const query of festivalQueries.slice(0, 8)) {
        metrics.queriesRun += 1;
        try {
          const results = await searchBrave(query, process.env.BRAVE_SEARCH_API_KEY);
          metrics.braveResultsTotal += results.length;
          // Process all results in parallel (different domains → minimal rate-limit contention)
          await Promise.allSettled(
            results.slice(0, 8).map((r) =>
              processCandidateUrl(r.url, r.title, r.description, 'brave_search', query)
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 400));
        } catch (error) {
          console.error(`Error searching Brave for "${query}":`, error);
        }
      }
    } else if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
      for (const query of festivalQueries.slice(0, 8)) {
        try {
          const results = await searchGoogle(
            query,
            process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
            process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID
          );
          await Promise.allSettled(
            results.slice(0, 8).map((r) =>
              processCandidateUrl(r.link, r.title, r.snippet, 'google_search', query)
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 400));
        } catch (error) {
          console.error(`Error searching Google for "${query}":`, error);
        }
      }
    } else {
      console.log('No search API configured. Skipping web-based festival search.');
    }

    // Listen-Phase: Links aus Listen-Seiten → crawler_results
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const listQueries = [
        `Festivals ${location} ${year} Liste offizielle Websites`,
        `Festivals ${location} ${year} Übersicht`,
        `Musikfestivals ${location} ${year} Kalender`,
        `${genres[0] ?? 'Musik'} Festival ${location} ${year} alle Termine`,
      ];
      const listCandidateUrls: { url: string; linkText: string }[] = [];
      for (const listQuery of listQueries.slice(0, 4)) {
        try {
          const listResults = await searchBrave(listQuery, process.env.BRAVE_SEARCH_API_KEY);
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (listResults.length > 0) {
            // Process the top 2 results per list query for more coverage
            for (const listResult of listResults.slice(0, 2)) {
              try {
                const listResponse = await fetchWithRetry(listResult.url);
                const listHtml = await listResponse.text();
                const links = extractFestivalLinksFromListPage(listHtml, listResult.url);
                listCandidateUrls.push(...links);
              } catch { /* silent */ }
            }
          }
        } catch (error) {
          console.error(`Error fetching list page for "${listQuery}":`, error);
        }
      }
      metrics.listCandidates = listCandidateUrls.length;
      const seenUrl = new Set<string>();
      const uniqueCandidates = listCandidateUrls.filter((c) => {
        const n = normalizeUrl(c.url);
        if (seenUrl.has(n)) return false;
        seenUrl.add(n);
        return true;
      });
      // Process list candidates in parallel batches of 8
      const candidateChunks: typeof uniqueCandidates[] = [];
      for (let i = 0; i < uniqueCandidates.length && i < 24; i += 8) {
        candidateChunks.push(uniqueCandidates.slice(i, i + 8));
      }
      for (const chunk of candidateChunks) {
        await Promise.allSettled(
          chunk.map((c) => processCandidateUrl(c.url, '', '', 'list_page', c.url))
        );
      }
    }

    if (crawlerRows.length > 0) {
      const inserted = await crawlerResultsService.insertCrawlerResults(crawlerRows);
      metrics.crawlerRowsInserted = inserted.length;
    }

    // Phase 2: Ähnliche Bands → band_events (Bandsintown, 10 Jahre)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    if (settings?.similar_band_feature && profile.similar_bands?.length) {
      const validBands = (profile.similar_bands as string[]).filter((b) => b && b.trim().length > 0);
      for (const bandName of validBands) {
        try {
          const bandId = await bandEventsService.ensureSimilarBand(bandName);
          if (!bandId) continue;
          const events = await searchBandsintownEvents(bandName);
          const eventsFiltered = events.filter((e) => {
            const d = new Date(e.datetime);
            return d >= tenYearsAgo && d <= oneYearAhead;
          });
          const toInsert = eventsFiltered.map((e) => ({
            event_name: e.venue?.name,
            event_date: e.datetime.slice(0, 10),
            location_name: e.venue?.name ?? '',
            city: e.venue?.city ?? '',
            country: e.venue?.country ?? '',
            latitude: e.venue?.latitude,
            longitude: e.venue?.longitude,
            source: 'bandsintown' as const,
            source_url: e.url,
          }));
          if (toInsert.length > 0) {
            await bandEventsService.insertBandEvents(bandId, toInsert);
          }
          await new Promise((r) => setTimeout(r, 1000));

          const websiteEvents = await fetchBandEventsFromWebsite(bandName);
          const websiteFiltered = websiteEvents.filter((e) => {
            const d = new Date(e.event_date);
            return d >= tenYearsAgo && d <= oneYearAhead;
          });
          if (websiteFiltered.length > 0) {
            await bandEventsService.insertBandEvents(bandId, websiteFiltered);
          }
          await new Promise((r) => setTimeout(r, 800));
        } catch (error) {
          console.error(`Error syncing band events for ${bandName}:`, error);
        }
      }
    }

    // Phase 3: Merge nur Band-Events (Crawler-Festivals sind bereits in Phase 1 live in DB)
    let addedFromBands = { festivals: [] as Festival[], venues: [] as Venue[] };
    if (settings?.similar_band_feature && profile.similar_bands?.length) {
      addedFromBands = await mergeBandEventsToFestivalsAndVenues(genres);
    }

    const addedFestivals = addedFromBands.festivals;
    const addedVenues = settings?.enable_venue_crawling ? addedFromBands.venues : [];

    console.log(`Research complete: ${addedFestivals.length} festivals, ${addedVenues.length} venues`);

    const totalWrittenPhase1 = metrics.festivalsWrittenPhase1 + metrics.festivalsWrittenList;
    if (totalWrittenPhase1 === 0 && addedFestivals.length === 0 && addedVenues.length === 0) {
      return {
        success: false,
        error:
          'Recherche abgeschlossen, aber 0 Ergebnisse wurden gespeichert. ' +
          `Debug: brave=${metrics.braveEnabled} openai=${metrics.openaiEnabled} queries=${metrics.queriesRun} ` +
          `braveResults=${metrics.braveResultsTotal} fetched=${metrics.bravePagesFetched} relevant=${metrics.braveRelevant} ` +
          `listCandidates=${metrics.listCandidates} listFetched=${metrics.listPagesFetched} listRelevant=${metrics.listRelevant} ` +
          `festivalsWrittenPhase1=${metrics.festivalsWrittenPhase1} festivalsWrittenList=${metrics.festivalsWrittenList} ` +
          `crawlerRowsInserted=${metrics.crawlerRowsInserted} similarBandsFeature=${metrics.similarBandsEnabled} similarBandsCount=${metrics.similarBandsCount}`,
      };
    }

    return {
      success: true,
      festivals: addedFestivals,
      venues: addedVenues,
    };
  },

  /**
   * Calculate distance from Karlsruhe (49.0069° N, 8.4037° E)
   * @param lat Latitude
   * @param lng Longitude
   */
  calculateDistanceFromKarlsruhe(lat: number, lng: number) {
    const KARLSRUHE_COORDS = { lat: 49.0069, lng: 8.4037 };
    
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat - KARLSRUHE_COORDS.lat) * (Math.PI / 180);
    const dLng = (lng - KARLSRUHE_COORDS.lng) * (Math.PI / 180);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(KARLSRUHE_COORDS.lat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};
