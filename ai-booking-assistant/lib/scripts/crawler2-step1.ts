#!/usr/bin/env tsx
/**
 * CRAWLER 2 – Step 1 + 1.5: Band-Websites finden + Gig-Daten extrahieren + Venue-Namen anreichern
 *
 * Verwendung:
 *   npx tsx lib/scripts/crawler2-step1.ts            → Dry-Run (nichts gespeichert)
 *   npx tsx lib/scripts/crawler2-step1.ts --commit   → Speichert in c2_* Tabellen
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { findBandWebsite } from '../services/crawler2/band-finder'
import { extractGigsFromTourPage } from '../services/crawler2/tour-extractor'
import { enrichGigsWithVenues } from '../services/crawler2/venue-enricher'
import type { BandGig, VenueCandidate, Step1BandResult, Step1Result } from '../services/crawler2/types'

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

const IS_COMMIT = process.argv.includes('--commit')
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY ?? ''
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

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
const ok    = (s: string) => `${C.green}✓${C.reset} ${s}`
const warn  = (s: string) => `${C.yellow}⚠${C.reset} ${s}`
const err   = (s: string) => `${C.red}✗${C.reset} ${s}`
const info  = (s: string) => `${C.cyan}→${C.reset} ${s}`
const dim   = (s: string) => `${C.gray}${s}${C.reset}`
const bold  = (s: string) => `${C.bold}${s}${C.reset}`

function separator(char = '─', width = 60) {
  return C.gray + char.repeat(width) + C.reset
}

// ─── Venue-Kandidaten aus Gigs ableiten ──────────────────────────────────────
function buildVenueCandidates(gigs: BandGig[]): VenueCandidate[] {
  const map = new Map<string, VenueCandidate>()
  for (const gig of gigs) {
    if (!gig.venueUrl && !gig.venueName) continue
    const key = gig.venueUrl ?? `${gig.venueName}__${gig.venueCity}`.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.gigCount += 1
      if (!existing.discoveredViaBands.includes(gig.bandName)) {
        existing.discoveredViaBands.push(gig.bandName)
      }
    } else {
      map.set(key, {
        url: gig.venueUrl ?? '',   // leere URL → wird in Step 3 per Brave gesucht
        nameHint: gig.venueName,
        cityHint: gig.venueCity,
        countryHint: gig.venueCountry,
        discoveredViaBands: [gig.bandName],
        gigCount: 1,
      })
    }
  }
  return Array.from(map.values())
}

// ─── Supabase-Writes ─────────────────────────────────────────────────────────
async function saveToDatabase(results: Step1Result): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  let gigsInserted = 0
  let candidatesInserted = 0

  for (const band of results.bands) {
    if (band.gigs.length > 0) {
      const payload = band.gigs.map((g) => ({
        similar_band_name: g.bandName,
        event_date: g.eventDate ?? null,
        venue_name: g.venueName ?? null,
        venue_city: g.venueCity ?? null,
        venue_country: g.venueCountry ?? null,
        venue_url: g.venueUrl ?? null,
        event_name: g.eventName ?? null,
        source: g.source,
        source_url: g.sourceUrl,
      }))
      const { error, count } = await supabase
        .from('c2_band_gig_history')
        .insert(payload)
        .select('id', { count: 'exact', head: true })
      if (error) console.error(`  DB-Fehler (gigs ${band.bandName}):`, error.message)
      else gigsInserted += count ?? payload.length
    }

    for (const vc of band.venueCandidates) {
      if (!vc.url) continue
      const { error } = await supabase
        .from('c2_venue_candidates')
        .upsert(
          {
            url: vc.url,
            name_hint: vc.nameHint,
            city_hint: vc.cityHint,
            country_hint: vc.countryHint,
            discovered_via_bands: vc.discoveredViaBands,
            discovery_sources: ['band_website'],
            gig_count: vc.gigCount,
          },
          { onConflict: 'url', ignoreDuplicates: false }
        )
      if (error) console.error(`  DB-Fehler (candidate ${vc.url}):`, error.message)
      else candidatesInserted += 1
    }
  }

  console.log()
  console.log(ok(`${gigsInserted} Gigs in c2_band_gig_history gespeichert`))
  console.log(ok(`${candidatesInserted} Venue-Kandidaten in c2_venue_candidates gespeichert`))
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────
async function main() {
  console.log()
  console.log(bold('╔══════════════════════════════════════════════════╗'))
  console.log(bold('║  CRAWLER 2 – STEP 1: Band-Websites + Gig-Daten  ║'))
  console.log(bold('╚══════════════════════════════════════════════════╝'))
  console.log()
  console.log(IS_COMMIT
    ? `${C.yellow}Modus: COMMIT – Ergebnisse werden in Supabase (c2_*) gespeichert${C.reset}`
    : `${C.cyan}Modus: DRY-RUN – Nur Ausgabe, nichts wird gespeichert${C.reset}`)
  console.log(dim('  (Zum Speichern: npx tsx lib/scripts/crawler2-step1.ts --commit)'))
  console.log()

  // ─ API-Keys prüfen ─
  if (!BRAVE_KEY) { console.error(err('BRAVE_SEARCH_API_KEY fehlt in .env.local')); process.exit(1) }
  if (!OPENAI_KEY) { console.error(err('OPENAI_API_KEY fehlt in .env.local')); process.exit(1) }
  console.log(ok(`Brave API Key: ...${BRAVE_KEY.slice(-6)}`))
  console.log(ok(`OpenAI API Key: ...${OPENAI_KEY.slice(-6)}`))
  if (IS_COMMIT) {
    if (!SUPABASE_URL) { console.error(err('NEXT_PUBLIC_SUPABASE_URL fehlt')); process.exit(1) }
    console.log(ok(`Supabase: ${SUPABASE_URL}`))
  }

  // ─ Profil laden ─
  console.log()
  console.log(separator())
  console.log(bold('Band-Profil laden...'))
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: profiles } = await supabase.from('profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) {
    console.error(err('Kein Band-Profil in Supabase gefunden.'))
    process.exit(1)
  }
  const profile = profiles[0]
  const similarBands: string[] = (profile.similar_bands ?? []).filter((b: string) => b?.trim())
  console.log(ok(`Band: ${bold(profile.name)}`))
  console.log(info(`Genres: ${(profile.genres ?? []).join(', ')}`))
  console.log(info(`Ähnliche Bands (${similarBands.length}): ${similarBands.join(', ')}`))

  if (similarBands.length === 0) {
    console.log(warn('Keine ähnlichen Bands im Profil. Bitte unter "Band-Profil" hinzufügen.'))
    process.exit(0)
  }

  // ─ Pro Band: Website + Tour-Seite + Gigs ─
  const allResults: Step1BandResult[] = []

  for (const bandName of similarBands) {
    console.log()
    console.log(separator('─', 60))
    console.log(bold(`  🎵  ${bandName}`))
    console.log(separator('─', 60))

    const result: Step1BandResult = {
      bandName,
      websiteUrl: null,
      tourPageUrl: null,
      gigs: [],
      venueCandidates: [],
      errors: [],
    }

    // 1. Offizielle Website finden
    process.stdout.write(`  ${C.gray}Suche offizielle Website...${C.reset}`)
    try {
      const found = await findBandWebsite(bandName, BRAVE_KEY)
      result.websiteUrl = found.websiteUrl
      result.tourPageUrl = found.tourPageUrl

      if (found.websiteUrl) {
        process.stdout.write('\r')
        console.log(`  ${ok(`Website gefunden [${found.confidence}]:`)} ${C.blue}${found.websiteUrl}${C.reset}`)
        if (found.tourPageUrl) {
          console.log(`  ${ok('Tour-Seite:')} ${C.blue}${found.tourPageUrl}${C.reset}`)
        } else {
          console.log(`  ${warn('Keine Tour-Seite auf der Website gefunden')}`)
        }
      } else {
        process.stdout.write('\r')
        console.log(`  ${err('Keine offizielle Website gefunden')}`)
      }
    } catch (e) {
      process.stdout.write('\r')
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ${err(`Fehler beim Suchen: ${msg}`)}`)
      result.errors.push(msg)
    }

    // 2. Tour-Seite crawlen + Gigs extrahieren
    const pageToExtract = result.tourPageUrl ?? result.websiteUrl
    if (pageToExtract) {
      process.stdout.write(`  ${C.gray}Extrahiere Gig-Daten per LLM...${C.reset}`)
      try {
        const { gigs, method } = await extractGigsFromTourPage(pageToExtract, bandName, OPENAI_KEY)
        result.gigs = gigs
        process.stdout.write('\r')

        if (gigs.length > 0) {
          console.log(`  ${ok(`${gigs.length} Gig(s) extrahiert`)} ${dim(`[${method}]`)}`)
          for (const g of gigs) {
            const date  = g.eventDate ? `${C.cyan}${g.eventDate}${C.reset}` : dim('(kein Datum)')
            const venue = g.venueName ? bold(g.venueName) : dim('(unbekannt)')
            const city  = g.venueCity ? ` · ${g.venueCity}` : ''
            const link  = g.venueUrl  ? ` ${C.blue}${g.venueUrl}${C.reset}` : ''
            console.log(`    ${date}  ${venue}${city}${link}`)
          }
        } else {
          console.log(`  ${warn(`Keine Gig-Daten gefunden`)} ${dim(`[Methode: ${method}]`)}`)
        }
      } catch (e) {
        process.stdout.write('\r')
        const msg = e instanceof Error ? e.message : String(e)
        console.log(`  ${err(`Fehler beim Extrahieren: ${msg}`)}`)
        result.errors.push(msg)
      }
    }

    // Step 1.5: Venue-Namen per Bandsintown/Brave anreichern
    if (result.gigs.length > 0) {
      console.log()
      console.log(`  ${info('Step 1.5 – Venue-Namen anreichern...')}`)
      const enriched = await enrichGigsWithVenues(
        result.gigs,
        BRAVE_KEY,
        OPENAI_KEY || undefined,
        (gig, res, i, total) => {
          const venueDisplay = res.venueNameResolved
            ? `${C.green}${res.venueNameResolved}${C.reset}`
            : dim('(nicht gefunden)')
          const methodLabel = res.enrichMethod !== 'none' ? dim(` [${res.enrichMethod}]`) : ''
          const city = gig.venueCity ? ` · ${gig.venueCity}` : ''
          console.log(`  ${dim(`${i}/${total}`)}  ${gig.eventDate ?? '?'}${city}  →  ${venueDisplay}${methodLabel}`)
        }
      )
      // Angereicherte Gigs zurückschreiben
      result.gigs = enriched

      const resolved = enriched.filter((g) => (g as { venueNameResolved?: string | null }).venueNameResolved)
      const pwCount    = enriched.filter((g) => (g as { enrichMethod?: string }).enrichMethod === 'bandsintown-pw').length
      const braveCount = enriched.filter((g) => (g as { enrichMethod?: string }).enrichMethod === 'brave-search').length
      console.log()
      console.log(`  ${ok(`${resolved.length}/${enriched.length} Venue-Namen gefunden`)} ` +
        dim(`(Bandsintown: ${pwCount}, Brave: ${braveCount})`))
    }

    // 3. Venue-Kandidaten ableiten (jetzt mit echten Venue-Namen)
    result.venueCandidates = buildVenueCandidates(result.gigs)
    const withUrl    = result.venueCandidates.filter((v) => v.url).length
    const withoutUrl = result.venueCandidates.filter((v) => !v.url).length
    console.log()
    console.log(`  ${info(`${result.venueCandidates.length} Venue-Kandidat(en):`)} ` +
      `${withUrl} mit URL, ${withoutUrl} ohne URL (Step 3 sucht diese)`)

    allResults.push(result)
    // Kurze Pause zwischen Bands
    await new Promise((r) => setTimeout(r, 600))
  }

  // ─ Zusammenfassung ─
  const totalGigs = allResults.reduce((s, r) => s + r.gigs.length, 0)
  const totalCandidates = allResults.reduce((s, r) => s + r.venueCandidates.length, 0)
  const bandsWithWebsite = allResults.filter((r) => r.websiteUrl).length
  const bandsWithTour = allResults.filter((r) => r.tourPageUrl).length

  const step1Result: Step1Result = {
    bands: allResults,
    totalGigs,
    totalVenueCandidates: totalCandidates,
    bandsWithWebsite,
    bandsWithTourPage: bandsWithTour,
  }

  console.log()
  console.log(separator('═', 60))
  console.log(bold('  ERGEBNIS STEP 1 + 1.5'))
  console.log(separator('═', 60))
  console.log(`  ${info(`Ähnliche Bands verarbeitet:    ${similarBands.length}`)}`)
  console.log(`  ${info(`Bands mit offizieller Website: ${bandsWithWebsite}/${similarBands.length}`)}`)
  console.log(`  ${info(`Bands mit Tour-Seite gefunden: ${bandsWithTour}/${similarBands.length}`)}`)
  console.log(`  ${info(`Gesamt Gigs extrahiert:        ${totalGigs}`)}`)
  console.log(`  ${info(`Venue-Kandidaten für Step 3:   ${totalCandidates}`)}`)
  console.log(separator('═', 60))
  console.log()

  if (IS_COMMIT) {
    console.log(bold('Speichere in Supabase (c2_band_gig_history + c2_venue_candidates)...'))
    await saveToDatabase(step1Result)
    console.log()
    console.log(ok('Step 1 abgeschlossen und gespeichert.'))
    console.log(dim('Nächster Schritt: npx tsx lib/scripts/crawler2-step3.ts'))
  } else {
    console.log(dim('DRY-RUN – nichts gespeichert.'))
    console.log(dim('Zum Speichern: npx tsx lib/scripts/crawler2-step1.ts --commit'))
  }
  console.log()
}

main().catch((e) => {
  console.error('\n' + err('Unerwarteter Fehler:'), e)
  process.exit(1)
})
