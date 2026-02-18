import { supabase } from '../supabase';

export type CrawlerResultSource = 'brave_search' | 'list_page' | 'keyword_expansion';

export interface CrawlerResultRow {
  name: string;
  url: string;
  city?: string;
  country?: string;
  raw_text?: string;
  relevance_score?: number;
  source: CrawlerResultSource;
  source_detail?: string;
  extracted?: Record<string, unknown>;
}

export interface CrawlerResultRecord extends CrawlerResultRow {
  id: string;
  processed_at: string | null;
  festival_id: string | null;
  created_at: string;
}

export const crawlerResultsService = {
  /**
   * Insert raw crawler findings (Brave/Listen). Data is kept permanently.
   */
  async insertCrawlerResults(rows: CrawlerResultRow[]): Promise<CrawlerResultRecord[]> {
    if (rows.length === 0) return [];
    const payloads = rows.map((r) => ({
      name: r.name,
      url: r.url,
      city: r.city ?? null,
      country: r.country ?? null,
      raw_text: r.raw_text ?? null,
      relevance_score: r.relevance_score ?? null,
      source: r.source,
      source_detail: r.source_detail ?? null,
      extracted: r.extracted ?? {},
    }));
    const { data, error } = await supabase
      .from('crawler_results')
      .insert(payloads)
      .select();
    if (error) {
      console.error('Error inserting crawler results:', error.message, error.details);
      return [];
    }
    return (data || []) as CrawlerResultRecord[];
  },

  /**
   * Get rows not yet merged into festivals (processed_at IS NULL).
   */
  async getUnprocessedCrawlerResults(limit?: number): Promise<CrawlerResultRecord[]> {
    let q = supabase
      .from('crawler_results')
      .select('*')
      .is('processed_at', null)
      .order('created_at', { ascending: true });
    if (limit != null) q = q.limit(limit);
    const { data, error } = await q;
    if (error) {
      console.error('Error fetching unprocessed crawler results:', error.message);
      return [];
    }
    return (data || []) as CrawlerResultRecord[];
  },

  /**
   * Mark a crawler result as processed and link to the created festival.
   */
  async markProcessed(id: string, festivalId: string): Promise<boolean> {
    const { error } = await supabase
      .from('crawler_results')
      .update({ processed_at: new Date().toISOString(), festival_id: festivalId })
      .eq('id', id);
    if (error) {
      console.error('Error marking crawler result processed:', error.message);
      return false;
    }
    return true;
  },
};
