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
  latitude: dbFestival.latitude,
  longitude: dbFestival.longitude,
  distanceKm: dbFestival.distance_km,
  applicationUrl: dbFestival.application_url,
  applicationPeriod: dbFestival.application_period,
  genresDetected: dbFestival.genres_detected,
  genreMatchScore: dbFestival.genre_match_score,
  showcaseStatus: dbFestival.showcase_status === 'unknown' ? 'unknown' : dbFestival.showcase_status === 'true',
  recommendation: dbFestival.recommendation,
  explanation: dbFestival.explanation,
  sourceUrls: dbFestival.source_urls,
  sourceDetail: dbFestival.source_detail,
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
  },

  /**
   * Add multiple festivals (used by the research agent)
   */
  async addFestivals(festivals: Partial<Festival>[]) {
    const results: Festival[] = [];

    for (const f of festivals) {
      const payload = {
        name: f.name,
        location: f.location,
        country: f.country,
        distance: f.distance,
        date_start: f.dateStart,
        date_end: f.dateEnd,
        size: f.size,
        genres: f.genres,
        contact_type: f.contactType || 'Unbekannt',
        contact_email: f.contactEmail,
        website: f.website,
        description: f.description,
        status: f.status || 'Neu',
        source: f.source || 'Keyword',
        is_relevant: f.isRelevant || false,
        latitude: f.latitude,
        longitude: f.longitude,
        distance_km: f.distanceKm,
        application_url: f.applicationUrl,
        application_period: f.applicationPeriod,
        genres_detected: f.genresDetected,
        genre_match_score: f.genreMatchScore,
        showcase_status: f.showcaseStatus === undefined ? null : f.showcaseStatus === true ? 'true' : f.showcaseStatus === false ? 'false' : 'unknown',
        recommendation: f.recommendation,
        explanation: f.explanation,
        source_urls: f.sourceUrls,
        source_detail: f.sourceDetail ?? null,
      };

      try {
        // If we have a website URL, check for an existing row first and update it
        if (f.website) {
          const { data: existing } = await supabase
            .from('festivals')
            .select('id')
            .eq('website', f.website)
            .maybeSingle();

          if (existing?.id) {
            const { data: updated, error: updateErr } = await supabase
              .from('festivals')
              .update(payload)
              .eq('id', existing.id)
              .select()
              .single();
            if (!updateErr && updated) {
              results.push(mapFestival(updated));
              continue;
            }
          }
        }

        // No existing row → insert
        const { data: inserted, error: insertErr } = await supabase
          .from('festivals')
          .insert(payload)
          .select()
          .single();

        if (insertErr) {
          console.error('Error inserting festival:', insertErr.message);
        } else if (inserted) {
          results.push(mapFestival(inserted));
        }
      } catch (err) {
        console.error('Unexpected error in addFestivals:', err);
      }
    }

    return results;
  },

  /**
   * Find festival by name and location (for dedup when merging similar_bands).
   */
  async findByNameAndLocation(name: string, location: string, country: string): Promise<Festival | null> {
    const { data, error } = await supabase
      .from('festivals')
      .select('*')
      .ilike('name', name.trim())
      .ilike('location', location.trim())
      .ilike('country', country.trim())
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapFestival(data);
  },

  /**
   * Append text to source_detail (e.g. "Auch gefunden über ähnliche Bands: X, Y").
   */
  async appendSourceDetail(id: string, additionalDetail: string): Promise<boolean> {
    const { data: row } = await supabase.from('festivals').select('source_detail').eq('id', id).single();
    const current = (row?.source_detail as string) || '';
    const newDetail = current ? `${current}; ${additionalDetail}` : additionalDetail;
    const { error } = await supabase.from('festivals').update({ source_detail: newDetail }).eq('id', id);
    return !error;
  },
};
