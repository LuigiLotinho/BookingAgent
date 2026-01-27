'use server'

import { applicationService } from '../services/application-service';

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
