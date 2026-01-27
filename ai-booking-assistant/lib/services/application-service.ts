import { supabase } from '../supabase';
import { festivalService } from './festival-service';
import { profileService } from './profile-service';
import { settingsService } from './settings-service';
import { sendEmail } from './mail-service';
import { Festival, BandMaterial } from '../mock-data';

export const applicationService = {
  /**
   * Draft and send an application for a festival
   */
  async processApplication(festivalId: string) {
    console.log(`Processing application for festival: ${festivalId}`);

    // 1. Get settings (for Gmail credentials)
    const settings = await settingsService.getSettings();
    if (!settings || !settings.gmail_user || !settings.gmail_app_password) {
      console.error('Gmail settings missing. Please configure them in Settings.');
      return;
    }

    if (!settings.agent_active) {
      console.log('Agent is paused in settings. Skipping application.');
      return;
    }

    // 2. Get festival data
    const { data: festival } = await supabase
      .from('festivals')
      .select('*')
      .eq('id', festivalId)
      .single();

    if (!festival || !festival.is_relevant) {
      console.error('Festival not found or not marked as relevant');
      return;
    }

    // 2. Get band profile
    const profile = await profileService.getProfile();
    if (!profile) {
      console.error('Band profile not found');
      return;
    }

    // 3. Select language (Default to DE, fallback to EN)
    // In a real AI agent, we would detect the festival's preferred language.
    const language = festival.country === 'Frankreich' ? 'FR' : 
                     (festival.country === 'Spanien' ? 'ES' : 'DE');
    
    let material = profile.materials.find(m => m.language === language);
    if (!material || !material.applicationEmail) {
      material = profile.materials.find(m => m.language === 'DE') || profile.materials[0];
    }

    if (!material || !material.applicationEmail) {
      console.error('No suitable application template found');
      return;
    }

    // 4. Draft email
    const subject = `Bewerbung: ${profile.name} für ${festival.name}`;
    let body = material.applicationEmail.replace(/\[FESTIVAL_NAME\]/g, festival.name);

    // Add links automatically
    const links: string[] = [];
    if (material.spotifyUrl) links.push(`Spotify: ${material.spotifyUrl}`);
    if (material.youtubeUrl) links.push(`YouTube: ${material.youtubeUrl}`);
    if (material.instagramUrl) links.push(`Instagram: ${material.instagramUrl}`);
    if (material.websiteUrl) links.push(`Website: ${material.websiteUrl}`);
    
    if (links.length > 0) {
      body += `\n\nLinks:\n${links.join('\n')}`;
    }

    // 5. Create application record in DB
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        festival_id: festivalId,
        festival_name: festival.name,
        year: new Date().getFullYear(),
        language: material.language,
        application_type: 'E-Mail',
        status: 'Vorgeschrieben',
        subject: subject,
        body: body
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating application record:', appError);
      return;
    }

    // 6. Send Email (if contact email exists)
    if (festival.contact_email) {
      console.log(`Sending email to: ${festival.contact_email}`);
      const emailResult = await sendEmail({
        to: festival.contact_email,
        subject: subject,
        text: body,
        auth: {
          user: settings.gmail_user,
          pass: settings.gmail_app_password
        }
      });

      if (emailResult.success) {
        await supabase
          .from('applications')
          .update({ status: 'Gesendet', sent_at: new Date().toISOString() })
          .eq('id', application.id);
        
        await supabase
          .from('festivals')
          .update({ status: 'Sent' }) // Should be 'Sent' according to status states in .cursorrules
          .eq('id', festivalId);
      } else {
        await supabase
          .from('applications')
          .update({ status: 'Fehler', error_message: JSON.stringify(emailResult.error) })
          .eq('id', application.id);
      }
    } else {
      console.warn('No contact email found for festival, application stays as "Vorgeschrieben"');
    }

    return application;
  }
};
