/**
 * Brave Search API scraper for finding festivals and venues
 * 
 * Brave Search API offers a free tier:
 * - 1 query/second
 * - Up to 2,000 queries/month
 * - Free tier: $0
 * 
 * Sign up at: https://brave.com/search/api/
 */

interface BraveSearchResult {
  title: string
  url: string
  description: string
  age?: string
}

interface BraveSearchResponse {
  web?: {
    results: BraveSearchResult[]
  }
  query?: {
    original: string
  }
}

/**
 * Search Brave for festivals/venues using Brave Search API
 * 
 * @param query Search query
 * @param apiKey Brave Search API key (get it from https://brave.com/search/api/)
 * @returns Array of search results
 */
export async function searchBrave(
  query: string,
  apiKey: string
): Promise<BraveSearchResult[]> {
  if (!apiKey) {
    console.warn('Brave Search API key not configured')
    return []
  }

  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search')
    url.searchParams.set('q', query)
    url.searchParams.set('count', '10') // Max 10 results per request

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Brave Search API rate limit reached')
        return []
      }
      if (response.status === 401) {
        console.warn('Brave Search API authentication failed')
        return []
      }
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`)
    }

    const data: BraveSearchResponse = await response.json()
    return data.web?.results || []
  } catch (error) {
    console.error('Error searching Brave:', error)
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

  // Gezielte Queries zuerst: offizielle Website + Bewerbung
  genres.forEach((genre) => {
    queries.push(`${genre} Festival ${location} ${year} offizielle Website`)
    queries.push(`${genre} Festival ${location} Bewerbung Bands`)
  })
  // Genre + Festival + Ort + Jahr
  genres.forEach((genre) => {
    queries.push(`${genre} Festival ${location} ${year}`)
    queries.push(`${genre} Festival ${location}`)
  })
  // Eine generische Query (kleines/indie)
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
