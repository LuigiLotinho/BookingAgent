-- Nur die Venues-Tabelle anlegen (wenn "Error fetching venues" / "table not in schema cache" kommt).
-- Im Supabase Dashboard: SQL Editor → New query → diesen Inhalt einfügen → Run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  country TEXT,
  distance INTEGER,
  venue_type TEXT CHECK (venue_type IN ('Club', 'Bar', 'Konzertsaal', 'Open Air', 'Theater', 'Kulturzentrum', 'Sonstiges')),
  capacity INTEGER,
  genres TEXT[],
  contact_type TEXT CHECK (contact_type IN ('E-Mail', 'Formular', 'Unbekannt')),
  contact_email TEXT,
  website TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  description TEXT,
  status TEXT DEFAULT 'Neu' CHECK (status IN ('Neu', 'Freigegeben', 'Ignoriert')),
  source TEXT,
  is_relevant BOOLEAN DEFAULT FALSE,
  apply_frequency TEXT DEFAULT 'monthly' CHECK (apply_frequency IN ('monthly', 'quarterly', 'on-demand')),
  last_applied_at TIMESTAMP WITH TIME ZONE,
  recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schema-Cache neu laden, damit die API die Tabelle sofort erkennt (sonst: "Could not find the table 'public.venues' in the schema cache")
NOTIFY pgrst, 'reload schema';
