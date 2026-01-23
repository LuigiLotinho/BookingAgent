import { supabase } from '../supabase';
import { Festival } from '../mock-data';

// Helper to map DB festival to Frontend festival
const mapFestival = (dbFestival: any): Festival => ({
  id: dbFestival.id,
  name: dbFestival.name,
  location: dbFestival.location,
  country: dbFestival.country,
  distance: dbFestival.distance,
  dateStart: dbFestival.date_start,
  dateEnd: dbFestival.date_end,
  size: dbFestival.size,
  genres: dbFestival.genres || [],
  contactType: dbFestival.contact_type,
  contactEmail: dbFestival.contact_email,
  status: dbFestival.status,
  source: dbFestival.source,
  description: dbFestival.description,
  website: dbFestival.website,
  isRelevant: dbFestival.is_relevant,
});

export const festivalService = {
  /**
   * Fetch all festivals from Supabase
   */
  async getFestivals() {
    const { data, error } = await supabase
      .from('festivals')
      .select('*')
      .order('date_start', { ascending: true });

    if (error) {
      console.error('Error fetching festivals:', error);
      return [];
    }

    return (data || []).map(mapFestival);
  },

  /**
   * Fetch latest "New" festivals for the dashboard
   */
  async getNewFestivals(limit = 5) {
    const { data, error } = await supabase
      .from('festivals')
      .select('*')
      .eq('status', 'Neu')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching new festivals:', error);
      return [];
    }

    return (data || []).map(mapFestival);
  },

  /**
   * Get stats for the dashboard
   */
  async getStats() {
    const { count: totalFestivals, error: totalError } = await supabase
      .from('festivals')
      .select('*', { count: 'exact', head: true });

    const { count: relevantFestivals, error: relevantError } = await supabase
      .from('festivals')
      .select('*', { count: 'exact', head: true })
      .eq('is_relevant', true);

    const { count: applicationsSent, error: appsError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Gesendet');

    if (totalError || relevantError || appsError) {
      console.error('Error fetching stats:', { totalError, relevantError, appsError });
    }

    return {
      totalFestivals: totalFestivals || 0,
      relevantFestivals: relevantFestivals || 0,
      applicationsSent: applicationsSent || 0,
      agentActive: true, // This might need its own table later
    };
  },

  /**
   * Mark a festival as relevant/irrelevant
   */
  async toggleRelevance(id: string, isRelevant: boolean) {
    const { data, error } = await supabase
      .from('festivals')
      .update({ 
        is_relevant: isRelevant,
        status: isRelevant ? 'Freigegeben' : 'Neu'
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating festival relevance:', error);
      return null;
    }

    return data[0] ? mapFestival(data[0]) : null;
  }
};
