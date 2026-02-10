import { supabase } from '../supabase';

export interface AppSettings {
  gmail_user: string;
  gmail_app_password: string;
  agent_active: boolean;
  similar_band_feature: boolean;
  notify_new_festivals: boolean;
  notify_application_sent: boolean;
  notify_errors: boolean;
  max_per_month: number;
  max_per_day: number;
  enable_venue_crawling?: boolean;
  venue_apply_frequency?: 'monthly' | 'quarterly' | 'on-demand';
  max_venues_per_crawl?: number;
}

const DEFAULT_ID = '00000000-0000-0000-0000-000000000000';

export const settingsService = {
  /**
   * Get application settings
   */
  async getSettings(): Promise<AppSettings | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', DEFAULT_ID)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data;
  },

  /**
   * Save or update settings
   */
  async saveSettings(settings: Partial<AppSettings>) {
    const { error } = await supabase
      .from('settings')
      .update(settings)
      .eq('id', DEFAULT_ID);

    if (error) {
      console.error('Error saving settings:', error);
      throw error;
    }

    return true;
  }
};
