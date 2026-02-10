/**
 * Social Media Scraper for Facebook, Instagram, and TikTok
 * 
 * Note: These APIs require authentication and have rate limits
 * For free usage:
 * - Facebook: Graph API (requires App ID and Access Token)
 * - Instagram: Basic Display API (requires OAuth)
 * - TikTok: No official API, would require web scraping (not recommended)
 */

interface SocialMediaPost {
  id: string
  text: string
  url: string
  createdTime?: string
  venueName?: string
  location?: string
}

/**
 * Search Facebook Pages for festivals/venues
 * Requires Facebook Graph API access token
 * 
 * Free tier: 200 requests/hour per user
 */
export async function searchFacebookPages(
  query: string,
  accessToken: string
): Promise<Array<{
  id: string
  name: string
  link?: string
  location?: {
    city?: string
    country?: string
  }
  category?: string
}>> {
  if (!accessToken) {
    console.warn('Facebook access token not configured')
    return []
  }

  try {
    const url = new URL('https://graph.facebook.com/v18.0/search')
    url.searchParams.set('q', query)
    url.searchParams.set('type', 'page')
    url.searchParams.set('fields', 'id,name,link,location,category')
    url.searchParams.set('access_token', accessToken)
    url.searchParams.set('limit', '10')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'BandBooker-Crawler/1.0',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Facebook API authentication failed')
        return []
      }
      if (response.status === 429) {
        console.warn('Facebook API rate limit reached')
        return []
      }
      throw new Error(`Facebook API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error searching Facebook:', error)
    return []
  }
}

/**
 * Search Instagram for festival/venue posts
 * Requires Instagram Basic Display API access token
 * 
 * Note: Instagram Basic Display API is limited and requires OAuth flow
 * For production, consider Instagram Graph API (requires Facebook Business account)
 */
export async function searchInstagramPosts(
  query: string,
  accessToken: string
): Promise<SocialMediaPost[]> {
  if (!accessToken) {
    console.warn('Instagram access token not configured')
    return []
  }

  try {
    // Instagram Basic Display API doesn't have a search endpoint
    // We would need to use Instagram Graph API for this
    // For now, return empty array
    console.warn('Instagram search requires Instagram Graph API (not Basic Display API)')
    return []
  } catch (error) {
    console.error('Error searching Instagram:', error)
    return []
  }
}

/**
 * Extract festival/venue information from social media posts
 * This is a simplified version - in production, you'd use more sophisticated NLP
 */
export function extractInfoFromSocialPost(post: SocialMediaPost): {
  name?: string
  location?: string
  date?: string
  website?: string
} {
  const text = post.text.toLowerCase()
  const info: {
    name?: string
    location?: string
    date?: string
    website?: string
  } = {}

  // Try to extract website URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = post.text.match(urlRegex)
  if (urls && urls.length > 0) {
    info.website = urls[0]
  }

  // Try to extract location (simplified)
  const locationKeywords = ['in ', 'at ', 'bei ', 'in ', 'à ', 'en ']
  for (const keyword of locationKeywords) {
    const index = text.indexOf(keyword)
    if (index !== -1) {
      const afterKeyword = post.text.substring(index + keyword.length)
      const words = afterKeyword.split(/\s+/).slice(0, 2)
      info.location = words.join(' ')
      break
    }
  }

  return info
}

/**
 * Search for festivals/venues across multiple social media platforms
 * 
 * @param query Search query
 * @param facebookToken Optional Facebook access token
 * @param instagramToken Optional Instagram access token
 * @returns Combined results from all platforms
 */
export async function searchSocialMedia(
  query: string,
  facebookToken?: string,
  instagramToken?: string
): Promise<Array<{
  platform: 'facebook' | 'instagram' | 'tiktok'
  name: string
  link?: string
  location?: string
  website?: string
}>> {
  const results: Array<{
    platform: 'facebook' | 'instagram' | 'tiktok'
    name: string
    link?: string
    location?: string
    website?: string
  }> = []

  // Search Facebook
  if (facebookToken) {
    try {
      const facebookResults = await searchFacebookPages(query, facebookToken)
      facebookResults.forEach((page) => {
        results.push({
          platform: 'facebook',
          name: page.name,
          link: page.link,
          location: page.location
            ? `${page.location.city || ''} ${page.location.country || ''}`.trim()
            : undefined,
        })
      })

      // Rate limiting: wait 1 second between Facebook requests
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error searching Facebook:', error)
    }
  }

  // Search Instagram (if token provided)
  if (instagramToken) {
    try {
      const instagramResults = await searchInstagramPosts(query, instagramToken)
      instagramResults.forEach((post) => {
        const info = extractInfoFromSocialPost(post)
        if (info.name || info.location) {
          results.push({
            platform: 'instagram',
            name: info.name || 'Unknown',
            link: post.url,
            location: info.location,
            website: info.website,
          })
        }
      })

      // Rate limiting: wait 1 second between Instagram requests
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error searching Instagram:', error)
    }
  }

  // TikTok: No official API, would require web scraping
  // This is not recommended due to ToS violations
  // In production, consider using TikTok Marketing API if available

  return results
}

/**
 * Build social media search queries for festivals
 */
export function buildFestivalSocialQueries(
  genres: string[],
  location: string,
  year: number
): string[] {
  const queries: string[] = []

  genres.forEach((genre) => {
    queries.push(`${genre} Festival ${location} ${year}`)
    queries.push(`${genre} Festival ${year}`)
  })

  queries.push(`Festival ${location} ${year}`)
  queries.push(`Musik Festival ${location}`)

  return queries
}

/**
 * Build social media search queries for venues
 */
export function buildVenueSocialQueries(
  genres: string[],
  location: string
): string[] {
  const queries: string[] = []

  genres.forEach((genre) => {
    queries.push(`${genre} Club ${location}`)
    queries.push(`${genre} Venue ${location}`)
    queries.push(`${genre} Konzert ${location}`)
  })

  queries.push(`Live Musik ${location}`)
  queries.push(`Konzert Location ${location}`)

  return queries
}
