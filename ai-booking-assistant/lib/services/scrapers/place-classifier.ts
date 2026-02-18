/**
 * Klassifiziert eine Webseite als offizielle Seite eines Festivals oder eines
 * festen Veranstaltungsorts (Venue/Club). Wird für Orte aus band_events genutzt.
 * Nutzt LLM (GPT-4o-mini), wenn OPENAI_API_KEY gesetzt ist; sonst Keyword-Heuristik.
 */

import { getTextFromHtml } from './page-relevance';
import { scoreFestivalRelevance, scoreVenueRelevance } from './page-relevance';
import { classifyPlaceWithLLM } from './llm-relevance';

export type PlaceType = 'festival' | 'venue';

/**
 * Entscheidet anhand des Seiteninhalts: Ist das die offizielle Seite eines
 * Festivals (wiederkehrendes Event) oder eines festen Veranstaltungsorts (Club, Location)?
 * Bei gesetztem OPENAI_API_KEY wird das LLM genutzt; sonst Keyword-Scores.
 */
export async function classifyPlaceFromPage(
  url: string,
  title: string,
  description: string,
  html: string
): Promise<{ type: PlaceType; festivalScore: number; venueScore: number; reason: string }> {
  const text = getTextFromHtml(html, 4000);
  const { score: festivalScore, reason: festivalReason } = scoreFestivalRelevance(
    url,
    title,
    description,
    text
  );
  const { score: venueScore, reason: venueReason } = scoreVenueRelevance(
    url,
    title,
    description,
    text
  );

  if (process.env.OPENAI_API_KEY) {
    const llm = await classifyPlaceWithLLM(title, description, text);
    return {
      type: llm.type,
      festivalScore,
      venueScore,
      reason: llm.reason ?? (llm.type === 'festival' ? festivalReason : venueReason),
    };
  }

  const festivalWins = festivalScore >= 45 && festivalScore >= venueScore;
  const venueWins = venueScore >= 40 && venueScore > festivalScore;

  if (festivalWins && !venueWins) {
    return { type: 'festival', festivalScore, venueScore, reason: festivalReason };
  }
  if (venueWins) {
    return { type: 'venue', festivalScore, venueScore, reason: venueReason };
  }
  if (festivalScore >= 45) {
    return { type: 'festival', festivalScore, venueScore, reason: festivalReason };
  }
  return {
    type: 'venue',
    festivalScore,
    venueScore,
    reason: venueScore >= 40 ? venueReason : 'Wenige Signale, standardmäßig als Venue gewertet',
  };
}
