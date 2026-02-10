/**
 * Google Custom Search API scraper for finding festivals and venues
 * 
 * Note: Google Custom Search API provides 100 free searches per day
 * After that, it costs $5 per 1000 queries
 */

interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[]
  searchInformation?: {
    totalResults: string
  }
}

/**
 * Search Google for festivals/venues using Custom Search API
 * 
 * @param query Search query
 * @param apiKey Google Custom Search API key
 * @param searchEngineId Custom Search Engine ID
 * @returns Array of search results
 */
export async function searchGoogle(
  query: string,
  apiKey: string,
  searchEngineId: string
): Promise<GoogleSearchResult[]> {
  if (!apiKey || !searchEngineId) {
    console.warn('Google Custom Search API credentials not configured')
    return []
  }

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('cx', searchEngineId)
    url.searchParams.set('q', query)
    url.searchParams.set('num', '10') // Max 10 results per request

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'BandBooker-Crawler/1.0',
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Google Custom Search API rate limit reached')
        return []
      }
      throw new Error(`Google API error: ${response.status} ${response.statusText}`)
    }

    const data: GoogleSearchResponse = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error searching Google:', error)
    return []
  }
}

/**
 * Build search queries for festivals based on genres and location.
 * Prioritizes "offizielle Website" and "Bewerbung Bands" so top results are more likely official pages.
 */
export function buildFestivalSearchQueries(
  genres: string[],
  location: string = 'Deutschland',
  year: number = new Date().getFullYear()
): string[] {
  const queries: string[] = []

  genres.forEach((genre) => {
    queries.push(`${genre} Festival ${location} ${year} offizielle Website`)
    queries.push(`${genre} Festival ${location} Bewerbung Bands`)
  })
  genres.forEach((genre) => {
    queries.push(`${genre} Festival ${location} ${year}`)
    queries.push(`${genre} Festival ${location}`)
  })
  queries.push(`kleines Festival ${location} ${year}`)

  return queries
}

/**
 * Build search queries for venues based on genres and location.
 * Includes "offizielle Website" and "Booking Kontakt" for better official-page results.
 */
export function buildVenueSearchQueries(
  genres: string[],
  location: string = 'Deutschland'
): string[] {
  const queries: string[] = []

  genres.forEach((genre) => {
    queries.push(`${genre} Club ${location} offizielle Website`)
    queries.push(`${genre} Venue ${location} Booking Kontakt`)
    queries.push(`${genre} Club ${location}`)
    queries.push(`${genre} Venue ${location}`)
    queries.push(`${genre} Konzertsaal ${location}`)
  })

  queries.push(`Live Musik ${location}`)
  queries.push(`Konzert Location ${location}`)
  queries.push(`Musik Club ${location}`)

  return queries
}
