import { supabase } from '../supabase';
import { Festival } from '../mock-data';

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
    
    // TODO: Implement actual search logic (e.g., Setlist.fm API or AI search)
    // For now, this is a placeholder
    return [];
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
