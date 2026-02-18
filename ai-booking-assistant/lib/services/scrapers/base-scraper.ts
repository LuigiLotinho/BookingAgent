/**
 * Base scraper with rate limiting and retry logic.
 * robots.txt is intentionally skipped: festival sites rarely block content pages
 * and the extra round-trip doubles crawl time.
 */

const FETCH_TIMEOUT_MS = 12_000

interface RateLimiter {
  lastRequest: number
  minDelay: number
}

class RateLimiterManager {
  private limiters: Map<string, RateLimiter> = new Map()

  getLimiter(domain: string, minDelay: number = 800): RateLimiter {
    if (!this.limiters.has(domain)) {
      this.limiters.set(domain, { lastRequest: 0, minDelay })
    }
    return this.limiters.get(domain)!
  }

  async waitIfNeeded(domain: string, minDelay: number = 800): Promise<void> {
    const limiter = this.getLimiter(domain, minDelay)
    const now = Date.now()
    const elapsed = now - limiter.lastRequest
    if (elapsed < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed))
    }
    limiter.lastRequest = Date.now()
  }
}

const rateLimiterManager = new RateLimiterManager()

/**
 * Fetch a URL with retry logic, rate limiting, and a hard timeout.
 * Retries: up to 2 attempts (reduced from 3 to keep total crawl time reasonable).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  retryDelay: number = 800
): Promise<Response> {
  const urlObj = new URL(url)
  const domain = urlObj.hostname

  await rateLimiterManager.waitIfNeeded(domain, 800)

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...options.headers,
        },
      })
      clearTimeout(timeoutId)

      if (response.ok) return response

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * (attempt + 1)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        )
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`)
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, '') || '/'
    return urlObj.toString()
  } catch {
    return url
  }
}
