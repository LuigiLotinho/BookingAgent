# Product Requirements Document (PRD): AI Booking Assistant

## 1. Ziel & Vision
### 🎯 Vision
Ein AI-gestützter Booking-Assistent, der für eine Band passende Festivals findet, bewertet und automatisch Bewerbungen verschickt, um manuelle Booking-Arbeit drastisch zu reduzieren.

### 🧭 Langfristige Vision
Ein einfach zu bedienendes Self-Service-Tool, das später von anderen Bands eigenständig genutzt werden kann, ohne dass Booking durch Dritte gemanagt wird.

## 2. Scope von Version 1 (V1)
### ✔️ In Scope
- Nutzung durch eine Band
- Architektur so aufgebaut, dass spätere Nutzung durch andere Bands möglich ist
- Fokus ausschließlich auf Festival-Bewerbungen
- Automatisierung des Recherche- und Bewerbungsprozesses

### ❌ Out of Scope (bewusst ausgeschlossen)
- Social-Media-Outreach
- Label- oder Artist-Management
- Gagenverhandlung
- Antwort-Management auf Booking-Mails
- Club- oder Venue-Booking (nur Festivals)
- Multi-Band-Accounts in V1

## 3. Zielgruppe
- Kleine / DIY-Bands
- Eigenständiges Booking
- Begrenzte Zeit & Ressourcen
- Genres u. a.: Reggae, Cumbia, World, Latino (nicht strikt limitiert)

## 4. Kernversprechen (Value Proposition)
> „Findet passende Festivals und bewirbt sich automatisch – mit minimalem Aufwand für die Band.“

## 5. Automatisierungsgrad
### 🤖 Vollautomatisch (ohne menschlichen Eingriff)
- Festivals suchen (laufend)
- Festivals aktualisieren (jährliche Wiederholungen)
- Relevanz analysieren
- Bewerbungen vorbereiten
- Bewerbungen verschicken

### 🧑‍🎤 Menschliche Kontrolle (einmalig)
- **Initiale Relevanz-Freigabe:**
    - Beim ersten Start sieht die Band alle aktuell gefundenen Festivals.
    - Die Band markiert per Checkbox, welche Festivals grundsätzlich relevant sind.
    - Nur für diese Festivals darf sich der Agent in Zukunft automatisch bewerben.
- **Danach:** Automatische Bewerbung jedes neuen Jahrgangs dieses Festivals.

## 6. Festival-Findung
### 🔍 Methoden
- **Standard (V1):**
    - Genre- & Keyword-basierte Suche
    - Festival-Websites & öffentliche Verzeichnisse
- **Optionales Feature (abschaltbar):**
    - Similar-Band-Logik (Festivals, bei denen ähnliche Bands in den letzten Jahren gespielt haben)

## 7. Filter & Kriterien
- **Max. Entfernung:** 500 km von Karlsruhe
- **Region:** Alle Länder
- **Festival-Größe (Besucher):**
    - 0–500
    - 500–2.000
    - 2.000–5.000
    - 5.000–20.000
    - 20.000+

## 8. Sprachen
- **Unterstützte Sprachen (V1):** Deutsch (DE), Englisch (EN), Französisch (FR), Spanisch (ES)
- **Sprachlogik:**
    - Automatische Erkennung der bevorzugten Festival-Sprache
    - Fallback auf Englisch
    - Verwendung nur vorhandener Band-Materialien

## 9. Bewerbungsarten
- **V1:** ✅ E-Mail-Bewerbungen
- **V2 (Future):** ⏳ Webformulare, ⏳ Datei-Uploads & komplexe Formlogik

## 10. Band-Material & Assets
Die Band stellt einmalig bereit:
- Bio (pro Sprache, kurz/lang)
- EPKs (optional, pro Sprache)
- Links (Spotify, YouTube etc.)
- Kontakt-E-Mail

Der Agent:
- wählt automatisch Sprache & Material
- passt Ton & Länge an Festivalgröße an

## 11. User Flow (V1)
1. Band richtet Profil & Materialien ein
2. System sucht & sammelt Festivals
3. Band prüft initiale Festival-Liste
4. Band markiert relevante Festivals
5. Agent bewirbt sich automatisch (jährlich, fristgerecht)
6. Band erhält Benachrichtigungen über neue Festivals und versendete Bewerbungen

## 12. Erfolgsmessung (KPIs)
- **Primär:** Anzahl gefundener relevanter Festivals, Einfachheit der Bedienung (UX-Fokus)
- **Sekundär:** Anzahl versendeter Bewerbungen, Zeitersparnis

## 13. Nicht-Ziele (klar definiert)
- Keine Kommunikation nach der Bewerbung
- Keine Verhandlungen
- Keine Angebotsverwaltung
- Keine Social-Media-Nachrichten

## 14. Technische Leitplanken (High-Level)
- Web-Scraping öffentlicher Quellen
- AI nur dort, wo nötig (Bewertung, Text)
- Ergebnisse werden gecached (keine Doppelanalyse)
- Alle Aktionen sind nachvollziehbar (Logs)

## 15. Risiken & Annahmen
- **Annahmen:** Großteil relevanter Festivals ist öffentlich auffindbar; Bands akzeptieren Automatisierung nach Freigabe.
- **Risiken:** Unvollständige Websites, unterschiedliche Bewerbungsprozesse, Vertrauensfrage.

## 16. Zukunft (nicht Teil von V1)
- Multi-Band-Nutzung
- Webformulare
- Clubs & Venues
- Analytics & Erfolgsquoten
- Bezahlmodell

---
**Zusammenfassung:** V1 ist fokussiert, automatisiert, band-zentriert und technisch erweiterbar. Kein Overengineering, sondern ein echter AI-Assistent für Bands.
