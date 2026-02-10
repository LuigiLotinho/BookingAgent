/**
 * Bandsintown API scraper for finding venues where similar bands have played
 * 
 * Bandsintown API is free and doesn't require authentication for public data
 */

interface BandsintownEvent {
  id: string
  artist_id: string
  url: string
  on_sale_datetime?: string
  datetime: string
  description?: string
  venue: {
    name: string
    city: string
    region: string
    country: string
    latitude?: number
    longitude?: number
  }
  lineup: string[]
  offers?: Array<{
    type: string
    url: string
  }>
}

interface BandsintownResponse {
  events: BandsintownEvent[]
}

/**
 * Search for events by artist name on Bandsintown
 * 
 * @param artistName Name of the artist/band
 * @returns Array of events
 */
export async function searchBandsintownEvents(artistName: string): Promise<BandsintownEvent[]> {
  try {
    // Bandsintown API endpoint
    const encodedName = encodeURIComponent(artistName)
    const url = `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=BandBooker`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'BandBooker-Crawler/1.0',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        // Artist not found
        return []
      }
      throw new Error(`Bandsintown API error: ${response.status} ${response.statusText}`)
    }

    const data: BandsintownResponse = await response.json()
    return data.events || []
  } catch (error) {
    console.error(`Error searching Bandsintown for ${artistName}:`, error)
    return []
  }
}

/**
 * Extract unique venues from Bandsintown events
 */
export function extractVenuesFromEvents(events: BandsintownEvent[]): Array<{
  name: string
  city: string
  country: string
  latitude?: number
  longitude?: number
}> {
  const venueMap = new Map<string, {
    name: string
    city: string
    country: string
    latitude?: number
    longitude?: number
  }>()

  events.forEach((event) => {
    const venue = event.venue
    const key = `${venue.name}-${venue.city}-${venue.country}`.toLowerCase()

    if (!venueMap.has(key)) {
      venueMap.set(key, {
        name: venue.name,
        city: venue.city,
        country: venue.country,
        latitude: venue.latitude,
        longitude: venue.longitude,
      })
    }
  })

  return Array.from(venueMap.values())
}

/**
 * Search for venues where similar bands have played
 * 
 * @param similarBands Array of similar band names
 * @returns Array of unique venues
 */
export async function findVenuesBySimilarBands(
  similarBands: string[]
): Promise<Array<{
  name: string
  city: string
  country: string
  latitude?: number
  longitude?: number
}>> {
  const allVenues: Array<{
    name: string
    city: string
    country: string
    latitude?: number
    longitude?: number
  }> = []

  // Search for each similar band
  for (const bandName of similarBands) {
    try {
      const events = await searchBandsintownEvents(bandName)
      const venues = extractVenuesFromEvents(events)
      allVenues.push(...venues)

      // Rate limiting: wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error processing band ${bandName}:`, error)
    }
  }

  // Remove duplicates
  const uniqueVenues = new Map<string, typeof allVenues[0]>()
  allVenues.forEach((venue) => {
    const key = `${venue.name}-${venue.city}-${venue.country}`.toLowerCase()
    if (!uniqueVenues.has(key)) {
      uniqueVenues.set(key, venue)
    }
  })

  return Array.from(uniqueVenues.values())
}
