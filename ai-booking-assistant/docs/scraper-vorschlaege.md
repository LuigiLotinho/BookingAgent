# 3 Vorschläge: Scraper so verbessern, dass das Richtige gefunden wird

---

## Vorschlag 1: Gezieltere Suchanfragen + „Offizielle Website“-Fokus

### Idee
Statt breiter Queries wie „Rock Festival Deutschland 2025“ suchst du gezielt nach der **offiziellen Website** eines Festivals. Dadurch landen Suchmaschinen eher auf der echten Festival-Seite als auf Listen oder News.

### Konkret
- **Suchanfragen anpassen** (in `buildFestivalSearchQueries`):
  - Zusätzlich oder statt: `"[Genre] Festival [Ort] 2025 offizielle Website"`  
  - Oder: `"[Genre] Festival [Ort] Bewerbung Bands"`  
  - Für Venues: `"[Venue-Name] [Stadt] offizielle Website"` oder `"[Venue-Name] Booking Kontakt"`
- **Brave/Google:** Pro Query weiterhin nur die **ersten 3–5 Treffer** prüfen (nicht alle 10), um API zu sparen und Fokus auf Top-Ergebnisse zu legen.
- **Domain-Signal:** Wenn die URL so aussieht wie der Festival-/Venue-Name (z. B. `hurricane-festival.de`, `kulturclub.de`), als „wahrscheinlich offizielle Seite“ höher gewichten oder direkt als relevant markieren (zusätzlich zur bestehenden Relevanz-Prüfung).

### Warum dadurch das Richtige gefunden wird
- Suchmaschinen ranken oft die **offizielle Website** höher, wenn „offizielle Website“ oder „Bewerbung“ in der Query steht.
- „Bewerbung Bands“ trifft eher Seiten, die wirklich Booking/Apply anbieten, nicht nur Übersichtsseiten.
- Weniger generische Queries → weniger Listen in den Top-Ergebnissen → weniger „Generalisierte“ Treffer.

### Aufwand
- Klein: Nur Query-Builder und ggf. Relevanz-Score (Domain = Name) anpassen.

---

## Vorschlag 2: Zwei-Phasen-Scraping – Listen als Quelle für echte URLs

### Idee
Du nutzt **eine** bekannte Liste oder **wenige** Suchanfragen, um **Listen-Seiten** zu finden (z. B. Festivalticker, eine „Festivals 2025“-Seite). Aus diesen Listen **extrahiert** du Links zu Festival-Websites und rufst **nur diese** URLs auf. Die Relevanz-Prüfung bleibt; die Such-API wird aber vor allem genutzt, um die Liste zu finden, nicht jeden Festival-Treffer.

### Konkret
- **Phase 1 – Liste finden:**
  - 1–2 Brave-Queries wie: `"Festivals Deutschland 2025 Liste mit Links"` oder eine feste URL (z. B. eine vertrauenswürdige Übersichtsseite).
  - Nur die **erste** Treffer-URL (oder 2–3) abrufen.
- **Phase 2 – Links aus der Liste ziehen:**
  - HTML der Listen-Seite parsen.
  - Alle Links `href` sammeln, die:
    - auf **andere Domains** zeigen (nicht nur interne Navigation),
    - und/oder im umgebenden Text typische Festival-Begriffe haben („Festival“, „Bewerbung“, „Line-up“, „offizielle Seite“).
  - Diese URLs als **Kandidaten** speichern.
- **Phase 3 – Wie bisher:**
  - Jede Kandidaten-URL fetchen, Relevanz-Prüfung (dein jetziges `page-relevance`) anwenden, nur bei „relevant“ als Festival übernehmen.

### Warum dadurch das Richtige gefunden wird
- Listen-Seiten **verlinken** oft direkt auf die offizielle Festival-Website. Du nutzt die Liste nur als „Link-Sammler“, die eigentliche Entscheidung „ist das die richtige Seite?“ trifft weiterhin deine Relevanz-Prüfung.
- Du reduzierst zufällige Treffer aus der Suchmaschine (kein „irgendein“ Artikel zum Suchbegriff), weil du gezielt von einer kuratierten Liste aus startest.
- Weniger Such-API-Calls (nur 1–2 für die Liste), mehr normale HTTP-Requests auf konkrete Kandidaten-URLs.

### Aufwand
- Mittel: Parser für Listen-HTML (Link-Extraktion + optional Text-Kontext), neue Funktion „findFestivalCandidatesFromListPage“, Integration in `runResearch`.

---

## Vorschlag 3: KI-basierte Relevanz (LLM) – Seite „verstehen“

### Idee
Die **gleiche** Such- und Fetch-Logik wie jetzt, aber die Entscheidung „Passt diese Seite zu einem einzelnen Festival/Venue?“ übernimmt ein **Sprachmodell**. Du schickst Titel, Meta-Beschreibung und einen Text-Ausschnitt der Seite an eine API (z. B. OpenAI, Anthropic, oder ein lokales Modell) und fragst explizit: „Ist das die offizielle Website eines einzelnen Festivals (keine Liste, kein Wikipedia)?“

### Konkret
- **Input für das Modell:**  
  `title`, `meta description`, erste ~1500 Zeichen Text aus dem HTML (bereits vorhanden via `getTextFromHtml`).
- **Prompt (Beispiel):**  
  „Du bist ein Assistent zur Klassifikation von Webseiten. Ist die folgende Seite die offizielle Website eines einzelnen Musikfestivals oder einer einzelnen Konzertlocation (Club/Venue)? Keine Listen, keine Wikipedia, keine News. Antworte nur mit JA oder NEIN und in einer Zeile Begründung.“
- **Auswertung:**  
  Antwort parsen (JA/NEIN). Nur bei „JA“ den Treffer behalten; bei „NEIN“ wie bisher verwerfen (evtl. Begründung loggen).
- **Optional:**  
  Nur für Treffer, die bei der **keyword-basierten** Relevanz im Grenzbereich liegen (z. B. Score 35–55), das LLM fragen – so sparst du API-Kosten.

### Warum dadurch das Richtige gefunden wird
- Das Modell **versteht** Kontext: z. B. „Hurricane Festival 2025 – Offizielle Seite“ vs. „Liste der besten Rock-Festivals“. Keyword-Scores können das oft nicht zuverlässig trennen.
- Du formulierst die Frage genau so, wie du „richtig“ definierst (einzelnes Festival, offizielle Seite, keine Liste) – das LLM wendet genau diese Kriterien an.
- Kombination mit deiner bestehenden Relevanz-Prüfung möglich: zuerst Keyword-Score, bei Unsicherheit LLM als Schiedsrichter.

### Aufwand
- Mittel: API-Anbindung (OpenAI/Anthropic/etc.), Prompt-Design, Fehlerbehandlung, evtl. Kosten-/Rate-Limits. Keine Änderung an Such- oder Fetch-Logik nötig.

---

## Kurz-Vergleich

| Vorschlag | Kernidee | Warum das Richtige gefunden wird | Aufwand |
|-----------|----------|-----------------------------------|---------|
| **1** | Bessere Suchanfragen + Domain-Signal | Suchmaschine liefert eher offizielle Seiten; Domain = Name bestätigt es. | Klein |
| **2** | Listen-Seiten → Links extrahieren → nur diese URLs prüfen | Listen verlinken auf echte Festival-Sites; Relevanz-Prüfung filtert weiter. | Mittel |
| **3** | LLM entscheidet „einzelnes Festival/Venue?“ | Modell versteht Kontext besser als reine Keywords. | Mittel |

**Empfehlung:** Zuerst **Vorschlag 1** umsetzen (schnell, sofort weniger Generalisierte). Dann je nach Qualität **2** (weniger Such-API, mehr Kontrolle über Quellen) oder **3** (beste Treffer-Qualität, dafür API-Kosten) ergänzen.
