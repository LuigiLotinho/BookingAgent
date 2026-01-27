import { supabase } from '../supabase';
import { Festival } from '../mock-data';
import { festivalService } from './festival-service';

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
   */
  async runResearch(profileId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (!profile) return;

    console.log(`Starting research for band: ${profile.name}`);
    
    // This is where the AI logic would go. 
    // For this demo/setup, we'll insert the real festivals found by the assistant.
    const findings: Partial<Festival>[] = [
      {
        name: "Test Bewerbung an mich selbst",
        location: "Karlsruhe",
        country: "Deutschland",
        distance: 0,
        dateStart: new Date().toISOString().split('T')[0],
        dateEnd: new Date().toISOString().split('T')[0],
        size: "Klein",
        genres: ["Test"],
        website: "http://localhost:3001",
        description: "Dies ist eine Test-Bewerbung, um den E-Mail-Versand zu pruefen. Die E-Mail wird an dein Profil-Postfach gesendet.",
        contactEmail: profile.email,
        source: "Keyword"
      },
      {
        name: "Rudolstadt Festival 2026",
        location: "Rudolstadt",
        country: "Deutschland",
        distance: 280,
        dateStart: "2026-07-02",
        dateEnd: "2026-07-05",
        size: "Gross",
        genres: ["World Music", "Folk", "Roots"],
        website: "https://www.rudolstadt-festival.de",
        description: "Deutschlands groesstes Festival fuer Roots, Folk und Weltmusik.",
        source: "Keyword"
      },
      {
        name: "Black Forest On Fire 2026",
        location: "Berghaupten",
        country: "Deutschland",
        distance: 85,
        dateStart: "2026-07-31",
        dateEnd: "2026-08-02",
        size: "Mittel",
        genres: ["Reggae", "Dancehall"],
        website: "https://www.reggaeville.com/dates/festival-details/black-forest-on-fire-2026/overview/",
        description: "Reggae Festival im Schwarzwald.",
        source: "Keyword"
      },
      {
        name: "DAS FEST 2026",
        location: "Karlsruhe",
        country: "Deutschland",
        distance: 0,
        dateStart: "2026-07-23",
        dateEnd: "2026-07-26",
        size: "Gross",
        genres: ["Pop", "Rock", "World"],
        website: "https://www.dasfest.de",
        description: "Groesstes Familienfestival in Süddeutschland.",
        source: "Keyword"
      },
      {
        name: "Sunshine Reggae Festival 2026",
        location: "Roeschwoog",
        country: "Frankreich",
        distance: 40,
        dateStart: "2026-06-12",
        dateEnd: "2026-06-14",
        size: "Mittel",
        genres: ["Reggae", "World"],
        website: "https://www.sunshinereggae.org",
        description: "Reggae Festival direkt an der Grenze.",
        source: "Keyword"
      },
      {
        name: "Summerjam Festival 2026",
        location: "Koeln",
        country: "Deutschland",
        distance: 210,
        dateStart: "2026-07-03",
        dateEnd: "2026-07-05",
        size: "Gross",
        genres: ["Reggae", "Dancehall", "Hip-Hop"],
        website: "https://summerjam.de",
        description: "Eines der groessten Reggae-Festivals Europas.",
        source: "Keyword"
      }
    ];

    return await festivalService.addFestivals(findings);
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
