/**
 * LLM-Relevanz (Option 3): Seite mit GPT-4o-mini bewerten.
 * Wird für Grenzfälle (Keyword-Score 35–55) genutzt.
 */

import OpenAI from 'openai'

const MODEL = 'gpt-4o-mini'

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
    const openai = new OpenAI({ apiKey })
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
    const openai = new OpenAI({ apiKey })
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
