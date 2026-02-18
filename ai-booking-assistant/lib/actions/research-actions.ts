'use server'

import { rechercheService } from '../services/recherche-service'

/**
 * Server Action: Recherche (Festivals + Venues) ausführen.
 * Läuft auf dem Server, damit Brave/Bandsintown-Fetches nicht an CORS scheitern.
 * Wird nur beim Klick auf "Festivals suchen" auf der Startseite aufgerufen.
 */
export async function runResearchAction(profileId: string) {
  try {
    const result = await rechercheService.runResearch(profileId)
    if (result.success === false) {
      return { success: false, error: result.error ?? 'Recherche fehlgeschlagen' }
    }
    return { success: true, festivals: result.festivals ?? [], venues: result.venues ?? [] }
  } catch (error) {
    console.error('runResearchAction error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Recherche fehlgeschlagen' }
  }
}
