/**
 * Base scraper with rate limiting, retry logic, and robots.txt checking
 */

interface RateLimiter {
  lastRequest: number
  minDelay: number // milliseconds between requests
}

class RateLimiterManager {
  private limiters: Map<string, RateLimiter> = new Map()

  /**
   * Get or create a rate limiter for a domain
   */
  getLimiter(domain: string, minDelay: number = 1000): RateLimiter {
    if (!this.limiters.has(domain)) {
      this.limiters.set(domain, {
        lastRequest: 0,
        minDelay,
      })
    }
    return this.limiters.get(domain)!
  }

  /**
   * Wait if necessary to respect rate limits
   */
  async waitIfNeeded(domain: string, minDelay: number = 1000): Promise<void> {
    const limiter = this.getLimiter(domain, minDelay)
    const now = Date.now()
    const timeSinceLastRequest = now - limiter.lastRequest

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    limiter.lastRequest = Date.now()
  }
}

const rateLimiterManager = new RateLimiterManager()

/**
 * Check robots.txt for a given URL
 * Returns true if crawling is allowed, false otherwise
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url)
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`

    const response = await fetch(robotsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'BandBooker-Crawler/1.0',
      },
    })

    if (!response.ok) {
      // If robots.txt doesn't exist, assume crawling is allowed
      return true
    }

    const robotsContent = await response.text()
    
    // Simple check: if robots.txt contains "Disallow: /", crawling is not allowed
    // This is a simplified check - in production, you'd want a proper robots.txt parser
    if (robotsContent.includes('Disallow: /')) {
      return false
    }

    return true
  } catch (error) {
    // If we can't fetch robots.txt, assume crawling is allowed
    console.warn(`Could not check robots.txt for ${url}:`, error)
    return true
  }
}

/**
 * Fetch a URL with retry logic and rate limiting
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  const urlObj = new URL(url)
  const domain = urlObj.hostname

  // Check robots.txt first
  const allowed = await checkRobotsTxt(url)
  if (!allowed) {
    throw new Error(`Crawling not allowed by robots.txt for ${url}`)
  }

  // Wait for rate limiting
  await rateLimiterManager.waitIfNeeded(domain, 1000) // 1 second between requests per domain

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...options.headers,
        },
      })

      if (response.ok) {
        return response
      }

      // If it's a 429 (Too Many Requests), wait longer
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * (attempt + 1)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // For other errors, throw
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      lastError = error as Error
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        const waitTime = retryDelay * Math.pow(2, attempt) // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`)
}

/**
 * Extract domain from URL
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/**
 * Normalize URL (remove trailing slashes, etc.)
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, '') || '/'
    return urlObj.toString()
  } catch {
    return url
  }
}
