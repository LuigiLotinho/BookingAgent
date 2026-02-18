/**
 * LLM-Extraktion: Festival- und Venue-Infos sinnvoll aus Seitentext auslesen.
 * Nutzt GPT-4o-mini; bei Fehler oder fehlendem OPENAI_API_KEY null.
 */

import OpenAI from 'openai';
import { getTextFromHtml } from './page-relevance';
import type { ExtractedFestivalInfo } from './festival-extractor';

const MODEL = 'gpt-4o-mini';

const FESTIVAL_EXTRACT_PROMPT = `Du bist ein Assistent, der aus einer Festival- oder Veranstaltungs-Webseite strukturierte Daten extrahiert.

Lies den folgenden Seiteninhalt und gib NUR ein gültiges JSON-Objekt zurück (kein Markdown, kein anderer Text).
Falls etwas nicht erkennbar ist, nutze null. Datum im Format YYYY-MM-DD. Land als deutscher oder englischer Name.

{
  "city": "Stadt oder null",
  "country": "Land (z.B. Deutschland, Germany) oder null",
  "dateStart": "YYYY-MM-DD oder null",
  "dateEnd": "YYYY-MM-DD oder null",
  "estimatedFestivalSize": "Klein" | "Mittel" | "Gross" | null,
  "applicationUrl": "URL zur Bewerbung/Kontakt oder null",
  "applicationPeriod": "explicit" | "estimated" | null,
  "showcaseStatus": true | false | "unknown",
  "redFlagsDetected": ["Liste von erkannten Red-Flags z.B. showcase, pay to play, Bewerbungsgebühr"]
}

Red-Flags: showcase, submission fee, pay to play, Bewerbungsgebühr, Tickets verkaufen, Wettbewerb.
showcaseStatus: true wenn explizit Showcase, false bei anderen Red-Flags, sonst "unknown".

Seitentext:
{{body}}`;

/**
 * Extrahiert Festival-Infos per LLM aus HTML/Text.
 * Gibt null zurück bei Fehler oder fehlendem OPENAI_API_KEY.
 */
export async function extractFestivalInfoWithLLM(
  html: string,
  _pageUrl: string
): Promise<ExtractedFestivalInfo | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const body = getTextFromHtml(html, 6000).trim() || '(kein Inhalt)';
  const prompt = FESTIVAL_EXTRACT_PROMPT.replace('{{body}}', body);

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const redFlags = Array.isArray(raw.redFlagsDetected)
      ? (raw.redFlagsDetected as string[])
      : [];
    const showcaseStatus =
      raw.showcaseStatus === true
        ? true
        : raw.showcaseStatus === false
          ? false
          : 'unknown';

    return {
      city: typeof raw.city === 'string' ? raw.city : undefined,
      country: typeof raw.country === 'string' ? raw.country : 'Deutschland',
      dateStart: typeof raw.dateStart === 'string' ? raw.dateStart : undefined,
      dateEnd: typeof raw.dateEnd === 'string' ? raw.dateEnd : undefined,
      estimatedFestivalSize:
        raw.estimatedFestivalSize === 'Klein' ||
        raw.estimatedFestivalSize === 'Mittel' ||
        raw.estimatedFestivalSize === 'Gross'
          ? raw.estimatedFestivalSize
          : undefined,
      applicationUrl:
        typeof raw.applicationUrl === 'string' ? raw.applicationUrl : undefined,
      applicationPeriod:
        raw.applicationPeriod === 'explicit' || raw.applicationPeriod === 'estimated'
          ? raw.applicationPeriod
          : undefined,
      showcaseStatus,
      redFlagsDetected: redFlags,
    };
  } catch (error) {
    console.error('LLM-Extraktion (Festival) Fehler:', error instanceof Error ? error.message : error);
    return null;
  }
}
