/**
 * Genre-Match-Analyse: Band-Genres vs. Festival-Text (LLM).
 * Gibt transparente Analyse zurück, keine Ja/Nein-Buchungsempfehlung.
 */

import OpenAI from 'openai';
import type { DetectedGenre } from '../../mock-data';

export interface GenreMatchResult {
  detectedFestivalGenres: { genre: string; confidence: 'explicit' | 'implicit' }[];
  negativeSignalsDetected: string[];
  genreMatchScore: number;
  explanation: string;
}

const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an analyst for genre compatibility between a band and a festival. Your job is NOT to make a yes/no booking decision, but to produce a transparent genre match analysis.

Output ONLY valid JSON, no other text.`;

const USER_PROMPT_TEMPLATE = `Analyze the genre compatibility between:
- band genres: {{bandGenres}}
- festival text (about, artists, FAQs): {{festivalText}}
- lineup text (past/current artists): {{lineupText}}
- negative genre keywords (incompatible with band): {{negativeKeywords}}

Instructions:
Step 1 – Extract festival genres: Identify explicitly stated and implicitly suggested genres. Return with confidence "explicit" or "implicit".
Step 2 – Detect negative genre signals: List any musical scene clearly incompatible with the band genres.
Step 3 – Compare band genres to festival genres: strong match, partial match, or weak/no match. Consider genre proximity (e.g. Reggae ↔ Ska ↔ World Music).
Step 4 – Score: Calculate genreMatchScore 0-100. Strong explicit matches increase score; partial/implicit increase moderately; negative signals reduce strongly. Be conservative.

Return ONLY this JSON (no markdown, no extra text):
{
  "detectedFestivalGenres": [{"genre": "World Music", "confidence": "explicit"}, {"genre": "Reggae", "confidence": "implicit"}],
  "negativeSignalsDetected": [],
  "genreMatchScore": 72,
  "explanation": "One sentence explaining the score."
}`;

function buildPrompt(
  bandGenres: string[],
  festivalText: string,
  lineupText: string,
  negativeKeywords: string[]
): string {
  return USER_PROMPT_TEMPLATE
    .replace('{{bandGenres}}', JSON.stringify(bandGenres))
    .replace('{{festivalText}}', festivalText.slice(0, 6000))
    .replace('{{lineupText}}', (lineupText || '(none)').slice(0, 2000))
    .replace('{{negativeKeywords}}', JSON.stringify(negativeKeywords));
}

const DEFAULT_NEGATIVE_KEYWORDS = ['Schlager', 'Volksmusik', 'Klassik', 'DJ only', 'Metalcore'];

/**
 * Führt Genre-Match-Analyse durch (LLM).
 * @param bandGenres Genres der Band
 * @param festivalText Volltext der Festival-Webseite (About, Künstler, FAQ)
 * @param lineupText Optional: Line-up-Text (Künstlerliste)
 * @param negativeGenreKeywords Optionale Liste inkompatibler Genres
 */
export async function analyzeGenreMatch(
  bandGenres: string[],
  festivalText: string,
  lineupText: string = '',
  negativeGenreKeywords: string[] = DEFAULT_NEGATIVE_KEYWORDS
): Promise<GenreMatchResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const content = buildPrompt(bandGenres, festivalText, lineupText, negativeGenreKeywords);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr) as {
      detectedFestivalGenres?: { genre: string; confidence: string }[];
      negativeSignalsDetected?: string[];
      genreMatchScore?: number;
      explanation?: string;
    };

    const detectedFestivalGenres: DetectedGenre[] = (parsed.detectedFestivalGenres || []).map((g) => ({
      genre: g.genre,
      confidence: g.confidence === 'explicit' ? 'explicit' : 'implicit',
    }));

    return {
      detectedFestivalGenres,
      negativeSignalsDetected: parsed.negativeSignalsDetected || [],
      genreMatchScore: Math.max(0, Math.min(100, Number(parsed.genreMatchScore) || 0)),
      explanation: parsed.explanation || '',
    };
  } catch (error) {
    console.error('Genre-Match-Analyse Fehler:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Regelbasierte Empfehlung: apply / watch / skip
 * Nutzt Red-Flags, Genre-Score und Showcase-Status.
 */
export function getRecommendation(
  redFlagsDetected: string[],
  genreMatchScore: number,
  showcaseStatus: true | false | 'unknown'
): { recommendation: 'apply' | 'watch' | 'skip'; explanation: string } {
  if (redFlagsDetected.length > 0) {
    const hasPayToPlay = redFlagsDetected.some((f) => /fee|pay|sell|contest|gebühr|wettbewerb/i.test(f));
    if (hasPayToPlay) {
      return { recommendation: 'skip', explanation: 'Red flags: ' + redFlagsDetected.join(', ') };
    }
    if (showcaseStatus === true) {
      return { recommendation: 'watch', explanation: 'Showcase/Fee-Signale – manuell prüfen.' };
    }
  }
  if (genreMatchScore >= 60) {
    return { recommendation: 'apply', explanation: 'Guter Genre-Match, keine Red-Flags.' };
  }
  if (genreMatchScore >= 40) {
    return { recommendation: 'watch', explanation: 'Mittlerer Genre-Match – Empfehlung zur manuellen Prüfung.' };
  }
  return { recommendation: 'skip', explanation: 'Niedriger Genre-Match.' };
}
