/**
 * Extract contact information (email, contact forms) from HTML content
 */

export interface ContactInfo {
  email?: string
  hasContactForm: boolean
  contactPageUrl?: string
}

/**
 * Extract email addresses from text using regex
 */
function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex) || []
  
  // Filter out common non-contact emails
  const filtered = matches.filter((email) => {
    const lower = email.toLowerCase()
    return !lower.includes('example.com') &&
           !lower.includes('test@') &&
           !lower.includes('noreply') &&
           !lower.includes('no-reply') &&
           !lower.includes('donotreply')
  })

  return [...new Set(filtered)] // Remove duplicates
}

/**
 * Check if page has a contact form
 */
function hasContactForm(html: string): boolean {
  const lowerHtml = html.toLowerCase()
  
  // Common contact form indicators
  const formIndicators = [
    'contact-form',
    'contactform',
    'contact_form',
    'form-contact',
    'booking-form',
    'bookingform',
    'anfrage',
    'kontaktformular',
    'formulario de contacto',
  ]

  return formIndicators.some((indicator) => lowerHtml.includes(indicator)) ||
         (lowerHtml.includes('<form') && (
           lowerHtml.includes('contact') ||
           lowerHtml.includes('booking') ||
           lowerHtml.includes('anfrage') ||
           lowerHtml.includes('kontakt')
         ))
}

/**
 * Find contact page URL from HTML
 */
function findContactPageUrl(html: string, baseUrl: string): string | undefined {
  const lowerHtml = html.toLowerCase()
  
  // Common contact page link patterns
  const contactPatterns = [
    /href=["']([^"']*\/contact[^"']*)["']/gi,
    /href=["']([^"']*\/kontakt[^"']*)["']/gi,
    /href=["']([^"']*\/booking[^"']*)["']/gi,
    /href=["']([^"']*\/anfrage[^"']*)["']/gi,
  ]

  for (const pattern of contactPatterns) {
    const matches = html.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        try {
          const url = new URL(match[1], baseUrl)
          return url.toString()
        } catch {
          // Invalid URL, skip
        }
      }
    }
  }

  return undefined
}

/**
 * Extract contact information from HTML content
 */
export async function extractContactInfo(html: string, url: string): Promise<ContactInfo> {
  const emails = extractEmails(html)
  const hasForm = hasContactForm(html)
  const contactPageUrl = findContactPageUrl(html, url)

  // Prefer emails that look like booking/contact emails
  const bookingEmails = emails.filter((email) => {
    const lower = email.toLowerCase()
    return lower.includes('booking') ||
           lower.includes('contact') ||
           lower.includes('info') ||
           lower.includes('booking') ||
           lower.includes('anfrage') ||
           lower.includes('kontakt')
  })

  const email = bookingEmails[0] || emails[0]

  return {
    email,
    hasContactForm: hasForm,
    contactPageUrl,
  }
}

/**
 * Determine contact type based on extracted information
 */
export function determineContactType(contactInfo: ContactInfo): 'E-Mail' | 'Formular' | 'Unbekannt' {
  if (contactInfo.email) {
    return 'E-Mail'
  }
  if (contactInfo.hasContactForm) {
    return 'Formular'
  }
  return 'Unbekannt'
}
