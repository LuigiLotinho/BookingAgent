import { supabase } from '../supabase';
import { festivalService } from './festival-service';
import { venueService } from './venue-service';
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

    const photoDocs = profile.documents.filter((doc) => doc.type.startsWith("photo-"));
    const photoLinks = photoDocs
      .filter((doc) => doc.url)
      .map((doc) => doc.url as string);
    const photoFileNames = photoDocs
      .filter((doc) => !doc.url && doc.fileName)
      .map((doc) => doc.fileName as string);

    if (photoLinks.length > 0) {
      body += `\n\nFotos (Links):\n${photoLinks.join('\n')}`;
    }

    if (photoFileNames.length > 0) {
      body += `\n\nFotos (Dateinamen):\n${photoFileNames.join('\n')}`;
    }

    const photoAttachments = photoDocs
      .filter((doc) => doc.url)
      .slice(0, 5)
      .map((doc, index) => ({
        filename: doc.fileName || doc.name || `foto-${index + 1}.jpg`,
        path: doc.url,
      }));

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
        attachments: photoAttachments.length > 0 ? photoAttachments : undefined,
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
  },

  /**
   * Draft and send an application for a venue
   * Venues have periodic application logic (monthly, quarterly, on-demand)
   */
  async processVenueApplication(venueId: string) {
    console.log(`Processing application for venue: ${venueId}`);

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

    // 2. Get venue data
    const { data: venue } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (!venue || !venue.is_relevant) {
      console.error('Venue not found or not marked as relevant');
      return;
    }

    // Check if venue is due for application based on frequency
    if (venue.last_applied_at) {
      const lastApplied = new Date(venue.last_applied_at);
      const now = new Date();
      const daysSinceLastApplied = Math.floor((now.getTime() - lastApplied.getTime()) / (1000 * 60 * 60 * 24));

      switch (venue.apply_frequency) {
        case 'monthly':
          if (daysSinceLastApplied < 30) {
            console.log(`Venue ${venue.name} not due for application yet (${daysSinceLastApplied} days since last application)`);
            return;
          }
          break;
        case 'quarterly':
          if (daysSinceLastApplied < 90) {
            console.log(`Venue ${venue.name} not due for application yet (${daysSinceLastApplied} days since last application)`);
            return;
          }
          break;
        case 'on-demand':
          console.log(`Venue ${venue.name} is set to on-demand, skipping automatic application`);
          return;
      }
    }

    // 3. Get band profile
    const profile = await profileService.getProfile();
    if (!profile) {
      console.error('Band profile not found');
      return;
    }

    // 4. Select language (Default to DE, fallback to EN)
    // In a real AI agent, we would detect the venue's preferred language.
    const language = venue.country === 'Frankreich' ? 'FR' : 
                     (venue.country === 'Spanien' ? 'ES' : 'DE');
    
    let material = profile.materials.find(m => m.language === language);
    if (!material || !material.applicationEmail) {
      material = profile.materials.find(m => m.language === 'DE') || profile.materials[0];
    }

    if (!material || !material.applicationEmail) {
      console.error('No suitable application template found');
      return;
    }

    // 5. Draft email - replace [FESTIVAL_NAME] with venue name for now
    const subject = `Bewerbung: ${profile.name} für ${venue.name}`;
    let body = material.applicationEmail.replace(/\[FESTIVAL_NAME\]/g, venue.name);

    // Add links automatically
    const links: string[] = [];
    if (material.spotifyUrl) links.push(`Spotify: ${material.spotifyUrl}`);
    if (material.youtubeUrl) links.push(`YouTube: ${material.youtubeUrl}`);
    if (material.instagramUrl) links.push(`Instagram: ${material.instagramUrl}`);
    if (material.websiteUrl) links.push(`Website: ${material.websiteUrl}`);
    
    if (links.length > 0) {
      body += `\n\nLinks:\n${links.join('\n')}`;
    }

    const photoDocs = profile.documents.filter((doc) => doc.type.startsWith("photo-"));
    const photoLinks = photoDocs
      .filter((doc) => doc.url)
      .map((doc) => doc.url as string);
    const photoFileNames = photoDocs
      .filter((doc) => !doc.url && doc.fileName)
      .map((doc) => doc.fileName as string);

    if (photoLinks.length > 0) {
      body += `\n\nFotos (Links):\n${photoLinks.join('\n')}`;
    }

    if (photoFileNames.length > 0) {
      body += `\n\nFotos (Dateinamen):\n${photoFileNames.join('\n')}`;
    }

    const photoAttachments = photoDocs
      .filter((doc) => doc.url)
      .slice(0, 5)
      .map((doc, index) => ({
        filename: doc.fileName || doc.name || `foto-${index + 1}.jpg`,
        path: doc.url,
      }));

    // 6. Create application record in DB
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        venue_id: venueId,
        venue_name: venue.name,
        target_type: 'Venue',
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

    // 7. Send Email (if contact email exists)
    if (venue.contact_email) {
      console.log(`Sending email to: ${venue.contact_email}`);
      const emailResult = await sendEmail({
        to: venue.contact_email,
        subject: subject,
        text: body,
        attachments: photoAttachments.length > 0 ? photoAttachments : undefined,
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
        
        // Update venue's last_applied_at timestamp
        await venueService.updateLastApplied(venueId);
      } else {
        await supabase
          .from('applications')
          .update({ status: 'Fehler', error_message: JSON.stringify(emailResult.error) })
          .eq('id', application.id);
      }
    } else {
      console.warn('No contact email found for venue, application stays as "Vorgeschrieben"');
    }

    return application;
  }
};
