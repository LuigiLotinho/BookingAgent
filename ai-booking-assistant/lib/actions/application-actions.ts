'use server'

import { applicationService } from '../services/application-service';
import { profileService } from '../services/profile-service';
import { settingsService } from '../services/settings-service';
import { sendEmail } from '../services/mail-service';

/**
 * Server Action to process an application.
 * This ensures nodemailer and other node-only modules stay on the server.
 */
export async function processApplicationAction(festivalId: string) {
  try {
    return await applicationService.processApplication(festivalId);
  } catch (error) {
    console.error('Server Action Error:', error);
    throw error;
  }
}

/**
 * Server Action to process a venue application.
 * This ensures nodemailer and other node-only modules stay on the server.
 */
export async function processVenueApplicationAction(venueId: string) {
  try {
    return await applicationService.processVenueApplication(venueId);
  } catch (error) {
    console.error('Server Action Error:', error);
    throw error;
  }
}

export async function sendTestApplicationAction(language: "DE" | "EN" | "FR" | "ES") {
  try {
    const settings = await settingsService.getSettings();
    if (!settings?.gmail_user || !settings?.gmail_app_password) {
      return { success: false, error: "Gmail Einstellungen fehlen. Bitte in den Einstellungen hinterlegen." };
    }

    const profile = await profileService.getProfile();
    if (!profile?.email) {
      return { success: false, error: "Profil-E-Mail fehlt. Bitte im Band-Profil eintragen." };
    }

    const material =
      profile.materials.find((m) => m.language === language) ||
      profile.materials.find((m) => m.language === "DE") ||
      profile.materials[0];

    if (!material?.applicationEmail) {
      return { success: false, error: "Keine Bewerbungsvorlage vorhanden." };
    }

    const subject = `Testbewerbung: ${profile.name}`;
    let body = material.applicationEmail.replace(/\[FESTIVAL_NAME\]/g, "Testfestival");

    const links: string[] = [];
    if (material.spotifyUrl) links.push(`Spotify: ${material.spotifyUrl}`);
    if (material.youtubeUrl) links.push(`YouTube: ${material.youtubeUrl}`);
    if (material.instagramUrl) links.push(`Instagram: ${material.instagramUrl}`);
    if (material.websiteUrl) links.push(`Website: ${material.websiteUrl}`);
    if (material.facebookUrl) links.push(`Facebook: ${material.facebookUrl}`);
    if (material.tiktokUrl) links.push(`TikTok: ${material.tiktokUrl}`);
    if (material.epkUrl) links.push(`EPK: ${material.epkUrl}`);
    if (material.extraLink1) links.push(`Link: ${material.extraLink1}`);
    if (material.extraLink2) links.push(`Link: ${material.extraLink2}`);
    if (material.extraLink3) links.push(`Link: ${material.extraLink3}`);

    if (links.length > 0) {
      body += `\n\nLinks:\n${links.join("\n")}`;
    }

    const photoDocs = profile.documents.filter((doc) => doc.type.startsWith("photo-"));
    const photoLinks = photoDocs
      .filter((doc) => doc.url)
      .map((doc) => doc.url as string);
    const photoFileNames = photoDocs
      .filter((doc) => !doc.url && doc.fileName)
      .map((doc) => doc.fileName as string);

    if (photoLinks.length > 0) {
      body += `\n\nFotos (Links):\n${photoLinks.join("\n")}`;
    }

    if (photoFileNames.length > 0) {
      body += `\n\nFotos (Dateinamen):\n${photoFileNames.join("\n")}`;
    }

    const photoAttachments = photoDocs
      .filter((doc) => doc.url)
      .slice(0, 5)
      .map((doc, index) => ({
        filename: doc.fileName || doc.name || `foto-${index + 1}.jpg`,
        path: doc.url,
      }));

    const emailResult = await sendEmail({
      to: profile.email,
      subject,
      text: body,
      attachments: photoAttachments.length > 0 ? photoAttachments : undefined,
      auth: {
        user: settings.gmail_user,
        pass: settings.gmail_app_password,
      },
    });

    if (!emailResult.success) {
      return { success: false, error: "E-Mail konnte nicht gesendet werden." };
    }

    return { success: true };
  } catch (error) {
    console.error("Test E-Mail Error:", error);
    return { success: false, error: "Unerwarteter Fehler beim Senden der Testbewerbung." };
  }
}
