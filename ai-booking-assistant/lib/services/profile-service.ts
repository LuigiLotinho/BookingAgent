import { supabase } from '../supabase';
import { BandProfile, BandMaterial, BandDocument } from '../mock-data';

// Helper to map DB profile to Frontend BandProfile
const mapProfile = (dbProfile: any, dbMaterials: any[], dbDocuments: any[]): BandProfile => ({
  name: dbProfile.name,
  city: dbProfile.city,
  country: dbProfile.country,
  genres: dbProfile.genres || [],
  email: dbProfile.email,
  contactPerson: dbProfile.contact_person,
  contactRole: dbProfile.contact_role,
  phone: dbProfile.phone,
  languages: dbProfile.languages || [],
  similarBands: dbProfile.similar_bands || [],
  materials: dbMaterials.map(m => ({
    language: m.language,
    bioShort: m.bio_short,
    bioLong: m.bio_long,
    applicationEmail: m.application_email_template,
    epkUrl: m.epk_url,
    spotifyUrl: m.spotify_url,
    youtubeUrl: m.youtube_url,
    instagramUrl: m.instagram_url,
    facebookUrl: m.facebook_url,
    tiktokUrl: m.tiktok_url,
    websiteUrl: m.website_url,
    extraLink1: m.extra_links?.[0] || '',
    extraLink2: m.extra_links?.[1] || '',
    extraLink3: m.extra_links?.[2] || '',
  })),
  documents: dbDocuments.map(d => ({
    id: d.id,
    name: d.name,
    type: d.type,
    url: d.url,
    fileName: d.file_name,
  })),
});

export const profileService = {
  /**
   * Get the band profile (assuming single profile for V1)
   */
  async getProfile() {
    // For V1, we just take the first profile
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      if (profileError) console.error('Error fetching profile:', profileError);
      return null;
    }

    const profile = profiles[0];

    const { data: materials, error: materialsError } = await supabase
      .from('band_materials')
      .select('*')
      .eq('profile_id', profile.id);

    const { data: documents, error: documentsError } = await supabase
      .from('band_documents')
      .select('*')
      .eq('profile_id', profile.id);

    if (materialsError) console.error('Error fetching materials:', materialsError);
    if (documentsError) console.error('Error fetching documents:', documentsError);

    return mapProfile(profile, materials || [], documents || []);
  },

  /**
   * Save or update the band profile
   */
  async saveProfile(profileData: BandProfile) {
    // 1. Get or create profile
    let { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    let profileId: string;

    const profilePayload = {
      name: profileData.name,
      city: profileData.city,
      country: profileData.country,
      genres: profileData.genres,
      email: profileData.email,
      contact_person: profileData.contactPerson,
      contact_role: profileData.contactRole,
      phone: profileData.phone,
      languages: profileData.languages,
      similar_bands: profileData.similarBands,
    };

    if (profiles && profiles.length > 0) {
      profileId = profiles[0].id;
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', profileId);
      
      if (updateError) throw updateError;
    } else {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();
      
      if (insertError) throw insertError;
      profileId = newProfile.id;
    }

    // 2. Save materials
    // First, delete old ones to keep it simple for V1
    await supabase.from('band_materials').delete().eq('profile_id', profileId);

    const materialsPayload = profileData.materials.map(m => ({
      profile_id: profileId,
      language: m.language,
      bio_short: m.bioShort,
      bio_long: m.bioLong,
      application_email_template: m.applicationEmail,
      epk_url: m.epkUrl,
      spotify_url: m.spotifyUrl,
      youtube_url: m.youtubeUrl,
      instagram_url: m.instagramUrl,
      facebook_url: m.facebookUrl,
      tiktok_url: m.tiktokUrl,
      website_url: m.websiteUrl,
      extra_links: [m.extraLink1, m.extraLink2, m.extraLink3].filter(Boolean),
    }));

    if (materialsPayload.length > 0) {
      const { error: materialsError } = await supabase
        .from('band_materials')
        .insert(materialsPayload);
      
      if (materialsError) throw materialsError;
    }

    // 3. Save documents
    // Delete old ones
    await supabase.from('band_documents').delete().eq('profile_id', profileId);

    const documentsPayload = profileData.documents.map(d => ({
      profile_id: profileId,
      name: d.name,
      type: d.type,
      url: d.url,
      file_name: d.fileName,
    }));

    if (documentsPayload.length > 0) {
      const { error: documentsError } = await supabase
        .from('band_documents')
        .insert(documentsPayload);
      
      if (documentsError) throw documentsError;
    }

    return true;
  }
};
