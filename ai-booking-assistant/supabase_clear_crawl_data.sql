-- Alle Crawl-Daten löschen (Festivals, Venues, Staging)
-- Im Supabase SQL Editor ausführen.
-- Achtung: Bewerbungen (applications) bleiben erhalten, zeigen dann ggf. "gelöschtes Festival/Venue".

-- 1. Verknüpfungen in Staging-Tabellen zuerst (band_events verweist auf festivals/venues)
DELETE FROM band_events;

-- 2. Crawler-Rohdaten
DELETE FROM crawler_results;

-- 3. Festivals
DELETE FROM festivals;

-- 4. Venues
DELETE FROM venues;

-- similar_bands bleibt erhalten (deine Liste ähnlicher Bands)
-- NOTIFY für Schema-Cache (optional)
NOTIFY pgrst, 'reload schema';
