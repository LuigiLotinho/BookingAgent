-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for the Band Profile
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  genres TEXT[], -- Array of genres
  email TEXT,
  contact_person TEXT,
  contact_role TEXT,
  phone TEXT,
  languages TEXT[], -- Array of language codes (DE, EN, etc.)
  similar_bands TEXT[], -- Up to 7 similar bands
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Festivals
CREATE TABLE IF NOT EXISTS festivals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  country TEXT,
  distance INTEGER,
  date_start DATE,
  date_end DATE,
  size TEXT CHECK (size IN ('Klein', 'Mittel', 'Gross')),
  genres TEXT[],
  contact_type TEXT CHECK (contact_type IN ('E-Mail', 'Formular', 'Unbekannt')),
  contact_email TEXT,
  website TEXT,
  description TEXT,
  status TEXT DEFAULT 'Neu' CHECK (status IN ('Neu', 'Freigegeben', 'Ignoriert')),
  source TEXT, -- 'Keyword' or 'Similar Band'
  is_relevant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Band Materials (per language)
CREATE TABLE IF NOT EXISTS band_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL, -- DE, EN, FR, ES
  bio_short TEXT,
  bio_long TEXT,
  application_email_template TEXT,
  epk_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  website_url TEXT,
  extra_links JSONB DEFAULT '[]'::jsonb, -- Store extra links as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Band Documents
CREATE TABLE IF NOT EXISTS band_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- deck, tech-rider, etc.
  url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  festival_id UUID REFERENCES festivals(id) ON DELETE SET NULL,
  festival_name TEXT, -- Denormalized for history if festival is deleted
  year INTEGER NOT NULL,
  language TEXT NOT NULL,
  application_type TEXT,
  status TEXT DEFAULT 'Wartend' CHECK (status IN ('Wartend', 'Vorgeschrieben', 'Gesendet', 'Fehler')),
  sent_at TIMESTAMP WITH TIME ZONE,
  subject TEXT,
  body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_festivals_updated_at BEFORE UPDATE ON festivals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_band_materials_updated_at BEFORE UPDATE ON band_materials FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
