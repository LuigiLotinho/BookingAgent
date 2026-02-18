/**
 * LLM-Relevanz (Option 3): Seite mit GPT-4o-mini bewerten.
 * Wird für Grenzfälle (Keyword-Score 35–55) genutzt.
 */

import OpenAI from 'openai'

const MODEL = 'gpt-4o-mini'

// Shared singleton to avoid creating a new client for every parallel call
let _openaiClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openaiClient) _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openaiClient;
}

const PROMPT_FESTIVAL = `Du bist ein Assistent zur Klassifikation von Webseiten.

Ist die folgende Seite die offizielle Website eines einzelnen Musikfestivals (keine Liste, kein Wikipedia, keine News)?

Antworte NUR mit JA oder NEIN und in einer kurzen Zeile Begründung.

Titel: {{title}}
Beschreibung: {{description}}

Auszug vom Seiteninhalt:
{{body}}`

const PROMPT_VENUE = `Du bist ein Assistent zur Klassifikation von Webseiten.

Ist die folgende Seite die offizielle Website einer einzelnen Konzertlocation / eines Clubs / Venues (keine Liste, kein Wikipedia, keine News)?

Antworte NUR mit JA oder NEIN und in einer kurzen Zeile Begründung.

Titel: {{title}}
Beschreibung: {{description}}

Auszug vom Seiteninhalt:
{{body}}`

function buildPrompt(
  template: string,
  title: string,
  description: string,
  bodySnippet: string
): string {
  const body = bodySnippet.slice(0, 1500).trim() || '(kein Inhalt)'
  return template
    .replace('{{title}}', title || '(kein Titel)')
    .replace('{{description}}', description || '(keine Beschreibung)')
    .replace('{{body}}', body)
}

function parseRelevant(content: string): boolean {
  const text = (content || '').trim().toUpperCase()
  if (text.startsWith('JA') || text.includes('\nJA ')) return true
  if (text.startsWith('NEIN') || text.includes('\nNEIN ')) return false
  if (text.startsWith('YES')) return true
  if (text.startsWith('NO')) return false
  return false
}

/**
 * Prüft mit GPT-4o-mini, ob die Seite eine relevante Festival-Seite ist.
 * @returns { relevant: true/false, reason?: string } oder bei Fehler/kein Key { relevant: false }
 */
export async function isRelevantFestivalPageWithLLM(
  title: string,
  description: string,
  bodySnippet: string
): Promise<{ relevant: boolean; reason?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { relevant: false }
  }

  try {
    const openai = getClient()
    const prompt = buildPrompt(PROMPT_FESTIVAL, title, description, bodySnippet)

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const relevant = parseRelevant(content)
    return { relevant, reason: content.slice(0, 200) }
  } catch (error) {
    console.error('LLM-Relevanz (Festival) Fehler:', error instanceof Error ? error.message : error)
    return { relevant: false }
  }
}

/**
 * Prüft mit GPT-4o-mini, ob die Seite eine relevante Venue-Seite ist.
 */
export async function isRelevantVenuePageWithLLM(
  title: string,
  description: string,
  bodySnippet: string
): Promise<{ relevant: boolean; reason?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { relevant: false }
  }

  try {
    const openai = getClient()
    const prompt = buildPrompt(PROMPT_VENUE, title, description, bodySnippet)

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const relevant = parseRelevant(content)
    return { relevant, reason: content.slice(0, 200) }
  } catch (error) {
    console.error('LLM-Relevanz (Venue) Fehler:', error instanceof Error ? error.message : error)
    return { relevant: false }
  }
}

const PROMPT_PLACE_TYPE = `Du bist ein Assistent zur Klassifikation von Webseiten.

Anhand des folgenden Inhalts: Ist diese Seite die offizielle Website eines MUSIKFESTIVALS (wiederkehrendes Event, z.B. jährlich) oder die Website eines festen VERANSTALTORTS / CLUBS / VENUES (dauerhafte Spielstätte mit vielen verschiedenen Konzerten)?

Antworte NUR mit genau einem Wort: FESTIVAL oder VENUE.
Danach optional eine kurze Begründung in einer Zeile.

Titel: {{title}}
Beschreibung: {{description}}

Auszug vom Seiteninhalt:
{{body}}`

export type PlaceTypeLLM = 'festival' | 'venue'

/**
 * Klassifiziert mit GPT-4o-mini: Ist die Seite ein Festival oder ein Venue?
 */
export async function classifyPlaceWithLLM(
  title: string,
  description: string,
  bodySnippet: string
): Promise<{ type: PlaceTypeLLM; reason?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { type: 'venue' }
  }

  try {
    const openai = getClient()
    const body = bodySnippet.slice(0, 2000).trim() || '(kein Inhalt)'
    const prompt = PROMPT_PLACE_TYPE
      .replace('{{title}}', title || '(kein Titel)')
      .replace('{{description}}', description || '(keine Beschreibung)')
      .replace('{{body}}', body)

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    })

    const content = (completion.choices[0]?.message?.content ?? '').trim().toUpperCase()
    if (content.startsWith('FESTIVAL')) return { type: 'festival', reason: content.slice(0, 200) }
    return { type: 'venue', reason: content.slice(0, 200) }
  } catch (error) {
    console.error('LLM Place-Classifier Fehler:', error instanceof Error ? error.message : error)
    return { type: 'venue' }
  }
}
