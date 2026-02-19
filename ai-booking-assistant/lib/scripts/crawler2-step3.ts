#!/usr/bin/env tsx
/**
 * CRAWLER 2 – Step 3: Venues crawlen → Booking-Email + offizielle Website extrahieren
 *
 * Verwendet die Venue-Kandidaten aus Step 1 (c2_venue_candidates in Supabase
 * oder direkt aus dem Profil falls --direct genutzt wird).
 *
 * Verwendung:
 *   npx tsx lib/scripts/crawler2-step3.ts            → Dry-Run (nur Ausgabe)
 *   npx tsx lib/scripts/crawler2-step3.ts --commit   → Speichert in c2_venue_contacts
 *   npx tsx lib/scripts/crawler2-step3.ts --bands "La Flecha Negra,Another Band"
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { crawlVenueForBookingInfo } from '../services/crawler2/venue-crawler'

// ─── .env.local laden ────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const IS_COMMIT   = process.argv.includes('--commit')
const BRAVE_KEY   = process.env.BRAVE_SEARCH_API_KEY ?? ''
const OPENAI_KEY  = process.env.OPENAI_API_KEY ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Optionale Band-Filter: --bands "Band A,Band B"
const bandsArg = process.argv.find((a) => a.startsWith('--bands='))
  ?? (process.argv.indexOf('--bands') >= 0
    ? process.argv[process.argv.indexOf('--bands') + 1]
    : undefined)
const FILTER_BANDS: string[] = bandsArg
  ? bandsArg.replace(/^--bands=/, '').split(',').map((s) => s.trim()).filter(Boolean)
  : []

// ─── Terminal-Farben ─────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  gray:   '\x1b[90m',
}
const ok   = (s: string) => `${C.green}✓${C.reset} ${s}`
const warn = (s: string) => `${C.yellow}⚠${C.reset} ${s}`
const err  = (s: string) => `${C.red}✗${C.reset} ${s}`
const info = (s: string) => `${C.cyan}→${C.reset} ${s}`
const dim  = (s: string) => `${C.gray}${s}${C.reset}`
const bold = (s: string) => `${C.bold}${s}${C.reset}`

function separator(char = '─', width = 64) {
  return C.gray + char.repeat(width) + C.reset
}

// ─── Venue-Kandidaten aus Supabase laden ─────────────────────────────────────
async function loadVenueCandidatesFromDB(
  supabase: ReturnType<typeof createClient>
): Promise<{ name: string; city: string; url?: string }[]> {
  const { data, error } = await supabase
    .from('c2_venue_candidates')
    .select('name_hint, city_hint, url, gig_count, discovered_via_bands')
    .order('gig_count', { ascending: false })

  if (error) throw new Error(`DB-Fehler: ${error.message}`)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    name: String(r.name_hint ?? ''),
    city: String(r.city_hint ?? ''),
    url:  r.url ? String(r.url) : undefined,
    gigCount: Number(r.gig_count ?? 1),
    bands: r.discovered_via_bands,
  })).filter((v) => v.name)
}

// ─── Venue-Kandidaten aus Gig-Historie laden (Fallback) ──────────────────────
async function loadVenueCandidatesFromGigHistory(
  supabase: ReturnType<typeof createClient>,
  filterBands?: string[]
): Promise<{ name: string; city: string; url?: string }[]> {
  let query = supabase
    .from('c2_band_gig_history')
    .select('venue_name, venue_city, venue_url, similar_band_name')
    .not('venue_name', 'is', null)

  if (filterBands && filterBands.length > 0) {
    query = query.in('similar_band_name', filterBands)
  }

  const { data, error } = await query
  if (error) throw new Error(`DB-Fehler: ${error.message}`)

  const map = new Map<string, { name: string; city: string; url?: string }>()
  for (const row of (data ?? [])) {
    const key = `${row.venue_name}__${row.venue_city}`.toLowerCase()
    if (!map.has(key) && row.venue_name) {
      map.set(key, {
        name: String(row.venue_name),
        city: String(row.venue_city ?? ''),
        url:  row.venue_url ?? undefined,
      })
    }
  }
  return Array.from(map.values())
}

// ─── In c2_venue_contacts speichern ──────────────────────────────────────────
async function saveContactToDb(
  supabase: ReturnType<typeof createClient>,
  data: {
    venueName: string
    venueCity: string
    websiteUrl: string | null
    bookingEmail: string | null
    bookingFormUrl: string | null
    contactPageUrl: string | null
    method: string
  }
) {
  const { error } = await supabase
    .from('c2_venue_contacts')
    .upsert(
      {
        venue_name:        data.venueName,
        venue_city:        data.venueCity,
        website_url:       data.websiteUrl,
        booking_email:     data.bookingEmail,
        booking_form_url:  data.bookingFormUrl,
        contact_page_url:  data.contactPageUrl,
        crawl_method:      data.method,
        last_crawled_at:   new Date().toISOString(),
      },
      { onConflict: 'venue_name,venue_city', ignoreDuplicates: false }
    )
  if (error) throw error
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────
async function main() {
  console.log()
  console.log(bold('╔═══════════════════════════════════════════════════════════╗'))
  console.log(bold('║  CRAWLER 2 – STEP 3: Venue-Websites + Booking-Emails      ║'))
  console.log(bold('╚═══════════════════════════════════════════════════════════╝'))
  console.log()
  console.log(IS_COMMIT
    ? `${C.yellow}Modus: COMMIT – Ergebnisse in c2_venue_contacts speichern${C.reset}`
    : `${C.cyan}Modus: DRY-RUN – Nur Ausgabe, nichts gespeichert${C.reset}`)
  console.log(dim('  (Zum Speichern: npx tsx lib/scripts/crawler2-step3.ts --commit)'))
  console.log()

  if (!BRAVE_KEY)  { console.error(err('BRAVE_SEARCH_API_KEY fehlt in .env.local')); process.exit(1) }
  if (!OPENAI_KEY) { console.error(err('OPENAI_API_KEY fehlt in .env.local'));        process.exit(1) }
  if (!SUPABASE_URL) { console.error(err('NEXT_PUBLIC_SUPABASE_URL fehlt'));           process.exit(1) }

  console.log(ok(`Brave API Key: ...${BRAVE_KEY.slice(-6)}`))
  console.log(ok(`OpenAI API Key: ...${OPENAI_KEY.slice(-6)}`))
  console.log(ok(`Supabase: ${SUPABASE_URL}`))

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Venue-Kandidaten laden
  console.log()
  console.log(separator())
  console.log(bold('Venue-Kandidaten laden...'))

  let venues: { name: string; city: string; url?: string }[] = []
  try {
    venues = await loadVenueCandidatesFromDB(supabase)
    console.log(ok(`${venues.length} Kandidaten aus c2_venue_candidates`))
  } catch {
    console.log(warn('c2_venue_candidates nicht erreichbar, lade aus c2_band_gig_history...'))
    venues = await loadVenueCandidatesFromGigHistory(supabase, FILTER_BANDS.length ? FILTER_BANDS : undefined)
    console.log(ok(`${venues.length} Venues aus c2_band_gig_history geladen`))
  }

  if (venues.length === 0) {
    console.log(warn('Keine Venue-Kandidaten vorhanden.'))
    console.log(dim('  Zuerst Step 1 ausführen: npx tsx lib/scripts/crawler2-step1.ts --commit'))
    process.exit(0)
  }

  if (FILTER_BANDS.length > 0) {
    console.log(info(`Band-Filter aktiv: ${FILTER_BANDS.join(', ')}`))
  }

  console.log()

  // ─ Pro Venue crawlen ─
  const results: {
    venueName: string
    venueCity: string
    websiteUrl: string | null
    bookingEmail: string | null
    bookingFormUrl: string | null
    contactPageUrl: string | null
    method: string
    error?: string
  }[] = []

  let successCount = 0
  let emailCount   = 0

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i]
    const idx   = `${String(i + 1).padStart(2, ' ')}/${venues.length}`

    console.log(separator('─', 64))
    console.log(bold(`  ${idx}  ${venue.name}`))
    if (venue.city) console.log(`       ${dim(venue.city)}`)
    console.log()

    process.stdout.write(`  ${C.gray}Suche offizielle Website...${C.reset}`)

    const crawlResult = await crawlVenueForBookingInfo(
      venue.name,
      venue.city,
      BRAVE_KEY,
      OPENAI_KEY
    )

    process.stdout.write('\r' + ' '.repeat(50) + '\r')

    // Ausgabe
    if (crawlResult.websiteUrl) {
      console.log(`  ${ok('Website:')}           ${C.blue}${crawlResult.websiteUrl}${C.reset}`)
      successCount++
    } else {
      console.log(`  ${warn('Website:')}           ${dim('nicht gefunden')}`)
    }

    if (crawlResult.contactPageUrl) {
      console.log(`  ${info('Kontaktseite:')}      ${C.blue}${crawlResult.contactPageUrl}${C.reset}`)
    }

    if (crawlResult.bookingEmail) {
      console.log(`  ${ok('Booking-Email:')}     ${C.green}${C.bold}${crawlResult.bookingEmail}${C.reset}  ${dim(`[${crawlResult.method}]`)}`)
      emailCount++
    } else {
      console.log(`  ${warn('Booking-Email:')}     ${dim('nicht gefunden')}  ${dim(`[${crawlResult.method}]`)}`)
    }

    if (crawlResult.bookingFormUrl) {
      console.log(`  ${info('Booking-Formular:')} ${C.blue}${crawlResult.bookingFormUrl}${C.reset}`)
    }

    if (crawlResult.error) {
      console.log(`  ${err('Fehler:')} ${crawlResult.error}`)
    }

    results.push({
      venueName:      venue.name,
      venueCity:      venue.city,
      websiteUrl:     crawlResult.websiteUrl,
      bookingEmail:   crawlResult.bookingEmail,
      bookingFormUrl: crawlResult.bookingFormUrl,
      contactPageUrl: crawlResult.contactPageUrl,
      method:         crawlResult.method,
      error:          crawlResult.error,
    })

    // In DB speichern (wenn --commit)
    if (IS_COMMIT && (crawlResult.websiteUrl || crawlResult.bookingEmail)) {
      try {
        await saveContactToDb(supabase, {
          venueName:      venue.name,
          venueCity:      venue.city,
          websiteUrl:     crawlResult.websiteUrl,
          bookingEmail:   crawlResult.bookingEmail,
          bookingFormUrl: crawlResult.bookingFormUrl,
          contactPageUrl: crawlResult.contactPageUrl,
          method:         crawlResult.method,
        })
        console.log(`  ${dim('✓ in c2_venue_contacts gespeichert')}`)
      } catch (e) {
        console.log(`  ${err(`DB-Fehler: ${e instanceof Error ? e.message : String(e)}`)}`)
      }
    }

    console.log()
    // Kurze Pause zwischen Venues (Brave Rate-Limit)
    if (i < venues.length - 1) {
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  // ─ Zusammenfassung ─
  console.log(separator('═', 64))
  console.log(bold('  ERGEBNIS STEP 3'))
  console.log(separator('═', 64))
  console.log(`  ${info(`Venues verarbeitet:          ${venues.length}`)}`)
  console.log(`  ${info(`Websites gefunden:           ${successCount}/${venues.length}`)}`)
  console.log(`  ${info(`Booking-Emails gefunden:     ${emailCount}/${venues.length}`)}`)
  console.log(separator('═', 64))
  console.log()

  // Detailansicht: alle gefundenen Emails
  const withEmail = results.filter((r) => r.bookingEmail)
  if (withEmail.length > 0) {
    console.log(bold('  Gefundene Booking-Emails:'))
    console.log()
    for (const r of withEmail) {
      const city = r.venueCity ? ` · ${r.venueCity}` : ''
      console.log(`  ${bold(r.venueName)}${city}`)
      console.log(`    ${C.green}${r.bookingEmail}${C.reset}`)
      if (r.websiteUrl) console.log(`    ${dim(r.websiteUrl)}`)
      console.log()
    }
  }

  if (!IS_COMMIT) {
    console.log(dim('DRY-RUN – nichts gespeichert.'))
    console.log(dim('Zum Speichern: npx tsx lib/scripts/crawler2-step3.ts --commit'))
  } else {
    console.log(ok('Step 3 abgeschlossen.'))
    console.log(dim('Die Kontakt-Daten sind in c2_venue_contacts gespeichert.'))
  }
  console.log()
}

main().catch((e) => {
  console.error('\n' + err('Unerwarteter Fehler:'), e)
  process.exit(1)
})
