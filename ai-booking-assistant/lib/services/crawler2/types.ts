/**
 * Crawler 2 – Typen
 * Alle Daten bleiben in c2_* Tabellen bis Step 7 (Ausgabe in festivals/venues).
 */

export type GigSource = 'band_website' | 'bandsintown' | 'setlist_fm'

export interface BandWebsiteResult {
  bandName: string
  websiteUrl: string | null        // gefundene offizielle Website
  tourPageUrl: string | null       // Tour/Dates-Unterseite
  confidence: 'high' | 'medium' | 'low'
  searchQuery: string
}

export interface BandGig {
  bandName: string
  eventDate?: string               // ISO: 2026-07-12
  venueName?: string
  venueCity?: string
  venueCountry?: string
  venueUrl?: string                // direkte URL zur Venue (optional)
  eventName?: string
  source: GigSource
  sourceUrl: string
}

export interface VenueCandidate {
  url: string
  nameHint?: string
  cityHint?: string
  countryHint?: string
  discoveredViaBands: string[]
  gigCount: number
}

/** Ergebnis von Step 1 für eine einzelne Band */
export interface Step1BandResult {
  bandName: string
  websiteUrl: string | null
  tourPageUrl: string | null
  gigs: BandGig[]
  venueCandidates: VenueCandidate[]
  errors: string[]
}

/** Gesamtergebnis Step 1 */
export interface Step1Result {
  bands: Step1BandResult[]
  totalGigs: number
  totalVenueCandidates: number
  bandsWithWebsite: number
  bandsWithTourPage: number
}
