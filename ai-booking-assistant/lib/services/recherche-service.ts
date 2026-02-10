import { supabase } from '../supabase';
import { Festival, Venue } from '../mock-data';
import { festivalService } from './festival-service';
import { venueService } from './venue-service';
import { profileService } from './profile-service';
import { settingsService } from './settings-service';
import { fetchWithRetry, getDomain, normalizeUrl } from './scrapers/base-scraper';
import { extractContactInfo, determineContactType } from './scrapers/contact-extractor';
import { searchGoogle, buildFestivalSearchQueries, buildVenueSearchQueries } from './scrapers/google-scraper';
import { searchBrave } from './scrapers/brave-scraper';
import { findVenuesBySimilarBands } from './scrapers/bandsintown-scraper';
import { isRelevantFestivalPage, isRelevantVenuePage, getTextFromHtml } from './scrapers/page-relevance';
import { extractFestivalLinksFromListPage, getPageTitleAndDescription } from './scrapers/list-link-extractor';
import { isRelevantFestivalPageWithLLM } from './scrapers/llm-relevance';
import { extractFestivalInfo } from './scrapers/festival-extractor';
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
  async runResearch(profileId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (!profile) {
      console.error('Profile not found');
      return;
    }

    console.log(`Starting research for band: ${profile.name}`);

    const settings = await settingsService.getSettings();
    const bandProfile = await profileService.getProfile();

    if (!bandProfile) {
      console.error('Band profile not found');
      return;
    }

    const genres = profile.genres || [];
    const location = profile.country || 'Deutschland';
    const year = new Date().getFullYear();

    // 1. Search for festivals using Brave Search API (preferred) or Google Custom Search
    const festivalFindings: Partial<Festival>[] = [];
    const festivalQueries = buildFestivalSearchQueries(genres, location, year);
    
    // Try Brave Search API first (free tier: 2000 queries/month)
    if (process.env.BRAVE_SEARCH_API_KEY) {
      for (const query of festivalQueries.slice(0, 5)) { // Limit to 5 queries
        try {
          const results = await searchBrave(query, process.env.BRAVE_SEARCH_API_KEY);

          for (const result of results.slice(0, 5)) {
            try {
              const response = await fetchWithRetry(result.url);
              const html = await response.text();

              // Keyword-Relevanz; bei Grenzfall (Score 35–55) zusätzlich GPT-4o-mini
              let { relevant, score, reason } = isRelevantFestivalPage(
                result.url,
                result.title,
                result.description,
                html
              );
              if (score >= 35 && score <= 55 && process.env.OPENAI_API_KEY) {
                const llm = await isRelevantFestivalPageWithLLM(
                  result.title,
                  result.description,
                  getTextFromHtml(html, 1500)
                );
                relevant = llm.relevant;
                if (llm.reason) reason = llm.reason;
              }
              if (!relevant) {
                console.log(`Übersprungen (${reason}, Score ${score}): ${result.title} – ${result.url}`);
                continue;
              }

              const contactInfo = await extractContactInfo(html, result.url);
              const extracted = extractFestivalInfo(html, result.url);
              const festivalText = getTextFromHtml(html, 6000);
              const genreResult = process.env.OPENAI_API_KEY
                ? await analyzeGenreMatch(genres, festivalText, festivalText)
                : null;
              const { recommendation, explanation: recExplanation } = getRecommendation(
                extracted.redFlagsDetected,
                genreResult?.genreMatchScore ?? 0,
                extracted.showcaseStatus
              );

              const festival: Partial<Festival> = {
                name: result.title,
                website: normalizeUrl(result.url),
                description: result.description,
                genres,
                contactType: determineContactType(contactInfo),
                contactEmail: contactInfo.email ?? undefined,
                source: 'Keyword',
                status: 'Neu',
                isRelevant: false,
                country: extracted.country,
                location: extracted.city ?? result.description?.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)?.[0],
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
                sourceUrls: [normalizeUrl(result.url)],
              };

              festivalFindings.push(festival);
            } catch (error) {
              console.error(`Error processing festival result ${result.url}:`, error);
            }
          }

          // Rate limiting: wait 1 second between Brave queries (free tier: 1 query/second)
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error searching Brave for "${query}":`, error);
        }
      }
    }
    // Fallback to Google Custom Search if Brave is not configured
    else if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
      for (const query of festivalQueries.slice(0, 5)) { // Limit to 5 queries to stay within free tier
        try {
          const results = await searchGoogle(
            query,
            process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
            process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID
          );

          for (const result of results.slice(0, 5)) {
            try {
              const response = await fetchWithRetry(result.link);
              const html = await response.text();

              let { relevant, score, reason } = isRelevantFestivalPage(
                result.link,
                result.title,
                result.snippet,
                html
              );
              if (score >= 35 && score <= 55 && process.env.OPENAI_API_KEY) {
                const llm = await isRelevantFestivalPageWithLLM(
                  result.title,
                  result.snippet,
                  getTextFromHtml(html, 1500)
                );
                relevant = llm.relevant;
                if (llm.reason) reason = llm.reason;
              }
              if (!relevant) {
                console.log(`Übersprungen (${reason}, Score ${score}): ${result.title} – ${result.link}`);
                continue;
              }

              const contactInfo = await extractContactInfo(html, result.link);
              const extracted = extractFestivalInfo(html, result.link);
              const festivalText = getTextFromHtml(html, 6000);
              const genreResult = process.env.OPENAI_API_KEY
                ? await analyzeGenreMatch(genres, festivalText, festivalText)
                : null;
              const { recommendation, explanation: recExplanation } = getRecommendation(
                extracted.redFlagsDetected,
                genreResult?.genreMatchScore ?? 0,
                extracted.showcaseStatus
              );

              const festival: Partial<Festival> = {
                name: result.title,
                website: normalizeUrl(result.link),
                description: result.snippet,
                genres,
                contactType: determineContactType(contactInfo),
                contactEmail: contactInfo.email ?? undefined,
                source: 'Keyword',
                status: 'Neu',
                isRelevant: false,
                country: extracted.country,
                location: extracted.city ?? result.snippet?.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)?.[0],
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
                sourceUrls: [normalizeUrl(result.link)],
              };

              festivalFindings.push(festival);
            } catch (error) {
              console.error(`Error processing festival result ${result.link}:`, error);
            }
          }

          // Rate limiting: wait 1 second between Google queries
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error searching Google for "${query}":`, error);
        }
      }
    } else {
      console.log('No search API configured. Skipping web-based festival search.');
      console.log('Tip: Add BRAVE_SEARCH_API_KEY to .env.local (free tier: 2000 queries/month)');
      console.log('Or: Add GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID');
    }

    // 1b. Listen-Phase: Festival-Links aus Listen-Seiten extrahieren und prüfen (nur mit Brave)
    const existingWebsites = new Set(festivalFindings.map((f) => f.website && normalizeUrl(f.website)).filter(Boolean) as string[]);
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const listQueries = [
        `Festivals ${location} ${year} Liste mit Links`,
        `Festivals ${location} ${year} Übersicht offizielle Websites`,
      ];
      const listCandidateUrls: { url: string; linkText: string }[] = [];
      for (const listQuery of listQueries.slice(0, 2)) {
        try {
          const listResults = await searchBrave(listQuery, process.env.BRAVE_SEARCH_API_KEY);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (listResults.length > 0) {
            const listPageUrl = listResults[0].url;
            const listResponse = await fetchWithRetry(listPageUrl);
            const listHtml = await listResponse.text();
            const links = extractFestivalLinksFromListPage(listHtml, listPageUrl);
            listCandidateUrls.push(...links);
          }
        } catch (error) {
          console.error(`Error fetching list page for "${listQuery}":`, error);
        }
      }
      const seenUrl = new Set<string>();
      const uniqueCandidates = listCandidateUrls.filter((c) => {
        const n = normalizeUrl(c.url);
        if (seenUrl.has(n)) return false;
        seenUrl.add(n);
        return true;
      });
      const maxListCandidates = 20;
      for (const candidate of uniqueCandidates.slice(0, maxListCandidates)) {
        const urlNorm = normalizeUrl(candidate.url);
        if (existingWebsites.has(urlNorm)) continue;
        try {
          const response = await fetchWithRetry(candidate.url);
          const html = await response.text();
          const { title, description } = getPageTitleAndDescription(html);
          let { relevant, score, reason } = isRelevantFestivalPage(candidate.url, title, description, html);
          if (score >= 35 && score <= 55 && process.env.OPENAI_API_KEY) {
            const llm = await isRelevantFestivalPageWithLLM(title, description, getTextFromHtml(html, 1500));
            relevant = llm.relevant;
            if (llm.reason) reason = llm.reason;
          }
          if (!relevant) {
            console.log(`Listen-Kandidat übersprungen (${reason}, Score ${score}): ${title} – ${candidate.url}`);
            continue;
          }
          existingWebsites.add(urlNorm);
          const contactInfo = await extractContactInfo(html, candidate.url);
          const extracted = extractFestivalInfo(html, candidate.url);
          const festivalText = getTextFromHtml(html, 6000);
          const genreResult = process.env.OPENAI_API_KEY
            ? await analyzeGenreMatch(genres, festivalText, festivalText)
            : null;
          const { recommendation, explanation: recExplanation } = getRecommendation(
            extracted.redFlagsDetected,
            genreResult?.genreMatchScore ?? 0,
            extracted.showcaseStatus
          );

          const festival: Partial<Festival> = {
            name: title,
            website: urlNorm,
            description: description,
            genres,
            contactType: determineContactType(contactInfo),
            contactEmail: contactInfo.email ?? undefined,
            source: 'Keyword',
            status: 'Neu',
            isRelevant: false,
            country: extracted.country,
            location: extracted.city ?? description?.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)?.[0],
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
          festivalFindings.push(festival);
        } catch (error) {
          console.error(`Error processing list candidate ${candidate.url}:`, error);
        }
      }
    }

    // 2. Search for venues using Bandsintown (if similar bands feature is enabled)
    const venueFindings: Partial<Venue>[] = [];

    if (settings?.similar_band_feature && profile.similar_bands && profile.similar_bands.length > 0) {
      try {
        const venues = await findVenuesBySimilarBands(profile.similar_bands);

        for (const venue of venues) {
          // Calculate distance if we have coordinates
          let distance = 0;
          if (venue.latitude && venue.longitude) {
            distance = Math.round(this.calculateDistanceFromKarlsruhe(venue.latitude, venue.longitude));
          }

          // Only include venues within 500km
          if (distance > 500) continue;

          // Try to find website and contact info via Brave Search (preferred) or Google Search
          let website: string | undefined;
          let contactEmail: string | undefined;
          let contactType: 'E-Mail' | 'Formular' | 'Unbekannt' = 'Unbekannt';

          if (process.env.BRAVE_SEARCH_API_KEY) {
            try {
              const searchQuery = `${venue.name} ${venue.city} ${venue.country} offizielle Website`;
              const results = await searchBrave(searchQuery, process.env.BRAVE_SEARCH_API_KEY);

              if (results.length > 0) {
                const first = results[0];
                try {
                  const response = await fetchWithRetry(first.url);
                  const html = await response.text();
                  const { relevant } = isRelevantVenuePage(first.url, first.title, first.description, html);
                  if (relevant) {
                    website = normalizeUrl(first.url);
                    const contactInfo = await extractContactInfo(html, first.url);
                    contactEmail = contactInfo.email;
                    contactType = determineContactType(contactInfo);
                  }
                } catch (error) {
                  console.error(`Error extracting contact info for ${venue.name}:`, error);
                }
              }

              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
              console.error(`Error searching Brave for venue website ${venue.name}:`, error);
            }
          } else if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
            try {
              const searchQuery = `${venue.name} ${venue.city} ${venue.country} offizielle Website`;
              const results = await searchGoogle(
                searchQuery,
                process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
                process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID
              );

              if (results.length > 0) {
                const first = results[0];
                try {
                  const response = await fetchWithRetry(first.link);
                  const html = await response.text();
                  const { relevant } = isRelevantVenuePage(first.link, first.title, first.snippet, html);
                  if (relevant) {
                    website = normalizeUrl(first.link);
                    const contactInfo = await extractContactInfo(html, first.link);
                    contactEmail = contactInfo.email;
                    contactType = determineContactType(contactInfo);
                  }
                } catch (error) {
                  console.error(`Error extracting contact info for ${venue.name}:`, error);
                }
              }
            } catch (error) {
              console.error(`Error searching Google for venue website ${venue.name}:`, error);
            }
          }

          const venueData: Partial<Venue> = {
            name: venue.name,
            location: venue.city,
            country: venue.country,
            distance: distance,
            genres: genres,
            website: website,
            contactEmail: contactEmail,
            contactType: contactType,
            source: 'Similar Band',
            status: 'Neu',
            isRelevant: false,
            applyFrequency: 'monthly',
            recurring: true,
          };

          venueFindings.push(venueData);
        }
      } catch (error) {
        console.error('Error finding venues by similar bands:', error);
      }
    }

    // 3. Add findings to database
    const addedFestivals = festivalFindings.length > 0 
      ? await festivalService.addFestivals(festivalFindings)
      : [];

    const addedVenues = venueFindings.length > 0 && settings?.enable_venue_crawling
      ? await venueService.addVenues(venueFindings)
      : [];

    console.log(`Research complete: Found ${addedFestivals.length} festivals and ${addedVenues.length} venues`);

    return {
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
