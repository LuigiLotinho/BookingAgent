import { supabase } from '../supabase';

export type BandEventSource = 'bandsintown' | 'official_website';

export interface BandEventInsert {
  event_name?: string;
  event_date: string;
  location_name: string;
  city: string;
  country: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  source: BandEventSource;
  source_url?: string;
}

export interface BandEventRecord extends BandEventInsert {
  id: string;
  band_id: string;
  festival_id: string | null;
  venue_id: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface UniqueLocation {
  location_name: string;
  city: string;
  country: string;
  band_event_ids: string[];
  band_names: string[];
}

export const bandEventsService = {
  /**
   * Get or create a similar_bands row by name. Returns id.
   */
  async ensureSimilarBand(name: string): Promise<string | null> {
    const { data: existing } = await supabase
      .from('similar_bands')
      .select('id')
      .ilike('name', name.trim())
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: inserted, error } = await supabase
      .from('similar_bands')
      .insert({ name: name.trim(), source: 'user_input' })
      .select('id')
      .single();
    if (error) {
      console.error('Error ensuring similar band:', error.message);
      return null;
    }
    return inserted?.id ?? null;
  },

  /**
   * Insert events for one band. Duplicates (same band, date, location, city) are skipped by DB unique index.
   */
  async insertBandEvents(bandId: string, events: BandEventInsert[]): Promise<BandEventRecord[]> {
    if (events.length === 0) return [];
    const payloads = events.map((e) => ({
      band_id: bandId,
      event_name: e.event_name ?? null,
      event_date: e.event_date,
      location_name: e.location_name,
      city: e.city,
      country: e.country,
      country_code: e.country_code ?? null,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      source: e.source,
      source_url: e.source_url ?? null,
    }));
    const { data, error } = await supabase
      .from('band_events')
      .upsert(payloads, {
        onConflict: 'band_id,event_date,location_name,city',
        ignoreDuplicates: true,
      })
      .select();
    if (error) {
      console.error('Error inserting band events:', error.message, error.details);
      return [];
    }
    return (data || []) as BandEventRecord[];
  },

  /**
   * Get unique (location_name, city, country) that are not yet processed (festival_id and venue_id are null),
   * with list of band_event ids and band names for each location.
   */
  async getUniqueLocationsFromBandEvents(): Promise<UniqueLocation[]> {
    const { data: rows, error } = await supabase
      .from('band_events')
      .select(`
        id,
        location_name,
        city,
        country,
        band_id,
        similar_bands!inner(name)
      `)
      .is('festival_id', null)
      .is('venue_id', null);
    if (error) {
      console.error('Error fetching unique locations from band_events:', error.message);
      return [];
    }
    const byKey = new Map<string, { band_event_ids: string[]; band_names: string[] }>();
    const locationMap = new Map<string, { location_name: string; city: string; country: string }>();
    for (const r of rows || []) {
      const loc = r as {
        id: string;
        location_name: string;
        city: string;
        country: string;
        band_id: string;
        similar_bands: { name: string } | { name: string }[] | null;
      };
      const key = `${(loc.location_name || '').toLowerCase()}|${(loc.city || '').toLowerCase()}|${(loc.country || '').toLowerCase()}`;
      if (!byKey.has(key)) {
        byKey.set(key, { band_event_ids: [], band_names: [] });
        locationMap.set(key, {
          location_name: loc.location_name || '',
          city: loc.city || '',
          country: loc.country || '',
        });
      }
      const entry = byKey.get(key)!;
      entry.band_event_ids.push(loc.id);
      const band = loc.similar_bands;
      const bandName = Array.isArray(band) ? band[0]?.name : band?.name;
      if (bandName && !entry.band_names.includes(bandName)) entry.band_names.push(bandName);
    }
    return Array.from(byKey.entries()).map(([key]) => {
      const loc = locationMap.get(key)!;
      const { band_event_ids, band_names } = byKey.get(key)!;
      return { ...loc, band_event_ids, band_names };
    });
  },

  /**
   * Set festival_id or venue_id and processed_at for one band_event row.
   */
  async updateProcessedEvent(
    id: string,
    opts: { festivalId?: string; venueId?: string }
  ): Promise<boolean> {
    const update: Record<string, unknown> = { processed_at: new Date().toISOString() };
    if (opts.festivalId != null) update.festival_id = opts.festivalId;
    if (opts.venueId != null) update.venue_id = opts.venueId;
    const { error } = await supabase.from('band_events').update(update).eq('id', id);
    if (error) {
      console.error('Error updating band event processed:', error.message);
      return false;
    }
    return true;
  },

  /**
   * Set festival_id or venue_id and processed_at for all band_events with the given location.
   */
  async updateProcessedEventsByLocation(
    locationName: string,
    city: string,
    country: string,
    opts: { festivalId?: string; venueId?: string }
  ): Promise<number> {
    let q = supabase
      .from('band_events')
      .update({
        processed_at: new Date().toISOString(),
        ...(opts.festivalId != null && { festival_id: opts.festivalId }),
        ...(opts.venueId != null && { venue_id: opts.venueId }),
      })
      .eq('location_name', locationName)
      .eq('city', city)
      .eq('country', country)
      .is('festival_id', null)
      .is('venue_id', null);
    const { data, error } = await q.select('id');
    if (error) {
      console.error('Error updating band events by location:', error.message);
      return 0;
    }
    return (data?.length ?? 0);
  },
};
