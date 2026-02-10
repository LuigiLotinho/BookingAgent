import { supabase } from '../supabase';
import { Venue } from '../mock-data';

// Helper to map DB venue to Frontend venue
const mapVenue = (dbVenue: any): Venue => ({
  id: dbVenue.id,
  name: dbVenue.name,
  location: dbVenue.location,
  country: dbVenue.country,
  distance: dbVenue.distance,
  venueType: dbVenue.venue_type,
  capacity: dbVenue.capacity,
  genres: dbVenue.genres || [],
  contactType: dbVenue.contact_type,
  contactEmail: dbVenue.contact_email,
  website: dbVenue.website,
  facebookUrl: dbVenue.facebook_url,
  instagramUrl: dbVenue.instagram_url,
  tiktokUrl: dbVenue.tiktok_url,
  description: dbVenue.description,
  status: dbVenue.status,
  source: dbVenue.source,
  isRelevant: dbVenue.is_relevant,
  applyFrequency: dbVenue.apply_frequency || 'monthly',
  lastAppliedAt: dbVenue.last_applied_at,
  recurring: dbVenue.recurring ?? true,
});

export const venueService = {
  /**
   * Fetch all venues from Supabase
   */
  async getVenues() {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching venues:', error.message || error.code || error, error.details);
      return [];
    }

    return (data || []).map(mapVenue);
  },

  /**
   * Fetch latest "New" venues for the dashboard
   */
  async getNewVenues(limit = 5) {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('status', 'Neu')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching new venues:', error.message || error.code || error, error.details);
      return [];
    }

    return (data || []).map(mapVenue);
  },

  /**
   * Get stats for the dashboard
   */
  async getStats() {
    const { count: totalVenues, error: totalError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true });

    const { count: relevantVenues, error: relevantError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('is_relevant', true);

    if (totalError || relevantError) {
      console.error('Error fetching venue stats:', totalError?.message || totalError, relevantError?.message || relevantError);
    }

    return {
      totalVenues: totalVenues || 0,
      relevantVenues: relevantVenues || 0,
    };
  },

  /**
   * Mark a venue as relevant/irrelevant
   */
  async toggleRelevance(id: string, isRelevant: boolean) {
    const { data, error } = await supabase
      .from('venues')
      .update({ 
        is_relevant: isRelevant,
        status: isRelevant ? 'Freigegeben' : 'Neu'
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating venue relevance:', error.message || error.code || error, error.details);
      return null;
    }

    return data[0] ? mapVenue(data[0]) : null;
  },

  /**
   * Add multiple venues (used by the research agent)
   */
  async addVenues(venues: Partial<Venue>[]) {
    const payloads = venues.map(v => ({
      name: v.name,
      location: v.location,
      country: v.country,
      distance: v.distance,
      venue_type: v.venueType,
      capacity: v.capacity,
      genres: v.genres,
      contact_type: v.contactType || 'Unbekannt',
      contact_email: v.contactEmail,
      website: v.website,
      facebook_url: v.facebookUrl,
      instagram_url: v.instagramUrl,
      tiktok_url: v.tiktokUrl,
      description: v.description,
      status: v.status || 'Neu',
      source: v.source || 'Keyword',
      is_relevant: v.isRelevant || false,
      apply_frequency: v.applyFrequency || 'monthly',
      recurring: v.recurring ?? true,
    }));

    const { data, error } = await supabase
      .from('venues')
      .upsert(payloads, { onConflict: 'name,location' })
      .select();

    if (error) {
      console.error('Error adding venues:', error.message || error.code, error.details, error.hint);
      return [];
    }

    return (data || []).map(mapVenue);
  },

  /**
   * Update last applied timestamp for a venue
   */
  async updateLastApplied(id: string) {
    const { error } = await supabase
      .from('venues')
      .update({ last_applied_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating venue last_applied_at:', error.message || error.code || error, error.details);
      return false;
    }

    return true;
  },

  /**
   * Get venues that are due for application based on frequency
   */
  async getVenuesDueForApplication() {
    const { data: venues, error } = await supabase
      .from('venues')
      .select('*')
      .eq('is_relevant', true)
      .eq('status', 'Freigegeben');

    if (error) {
      console.error('Error fetching venues due for application:', error.message || error.code || error, error.details);
      return [];
    }

    const now = new Date();
    const dueVenues = (venues || []).filter((venue) => {
      if (!venue.last_applied_at) {
        return true; // Never applied, so due
      }

      const lastApplied = new Date(venue.last_applied_at);
      const daysSinceLastApplied = Math.floor((now.getTime() - lastApplied.getTime()) / (1000 * 60 * 60 * 24));

      switch (venue.apply_frequency) {
        case 'monthly':
          return daysSinceLastApplied >= 30;
        case 'quarterly':
          return daysSinceLastApplied >= 90;
        case 'on-demand':
          return false; // Only apply manually
        default:
          return daysSinceLastApplied >= 30;
      }
    });

    return dueVenues.map(mapVenue);
  },
};
