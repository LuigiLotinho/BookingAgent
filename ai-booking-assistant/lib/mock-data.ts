/** Genre mit Konfidenz (für Genre-Match-Analyse) */
export interface DetectedGenre {
  genre: string
  confidence: 'explicit' | 'implicit'
}

export interface Festival {
  id: string
  name: string
  location: string
  country: string
  distance: number
  dateStart: string
  dateEnd: string
  size: "Klein" | "Mittel" | "Gross"
  genres: string[]
  contactType: "E-Mail" | "Formular" | "Unbekannt"
  contactEmail?: string
  status: "Neu" | "Freigegeben" | "Ignoriert"
  source: "Keyword" | "Similar Band"
  description?: string
  website?: string
  isRelevant: boolean
  /** Erweiterte Felder (Crawler + Genre-Analyse) */
  latitude?: number
  longitude?: number
  distanceKm?: number
  applicationUrl?: string
  applicationPeriod?: 'explicit' | 'estimated'
  genresDetected?: DetectedGenre[]
  genreMatchScore?: number
  showcaseStatus?: boolean | 'unknown'
  recommendation?: 'apply' | 'watch' | 'skip'
  explanation?: string
  sourceUrls?: string[]
}

export interface Venue {
  id: string
  name: string
  location: string
  country: string
  distance: number
  venueType: "Club" | "Bar" | "Konzertsaal" | "Open Air" | "Theater" | "Kulturzentrum" | "Sonstiges"
  capacity?: number
  genres: string[]
  contactType: "E-Mail" | "Formular" | "Unbekannt"
  contactEmail?: string
  website?: string
  facebookUrl?: string
  instagramUrl?: string
  tiktokUrl?: string
  description?: string
  status: "Neu" | "Freigegeben" | "Ignoriert"
  source: "Keyword" | "Similar Band" | "Bandsintown" | "Social Media"
  isRelevant: boolean
  applyFrequency: "monthly" | "quarterly" | "on-demand"
  lastAppliedAt?: string
  recurring: boolean
}

export interface Application {
  id: string
  festivalId?: string
  venueId?: string
  targetType: "Festival" | "Venue"
  festivalName?: string
  venueName?: string
  year?: number // NULL for venues
  language: "DE" | "EN" | "FR" | "ES"
  applicationType: "E-Mail" | "Formular"
  status: "Wartend" | "Vorgeschrieben" | "Gesendet" | "Fehler"
  sentAt?: string
  subject?: string
  body?: string
  errorMessage?: string
}

export interface BandMaterial {
  language: "DE" | "EN" | "FR" | "ES"
  bioShort: string
  bioLong: string
  applicationEmail: string
  epkUrl?: string
  spotifyUrl?: string
  youtubeUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  tiktokUrl?: string
  websiteUrl?: string
  extraLink1?: string
  extraLink2?: string
  extraLink3?: string
}

export interface BandDocument {
  id: string
  name: string
  type:
    | "deck"
    | "tech-rider"
    | "press-kit"
    | "hospitality-rider"
    | "extra-doc-1"
    | "extra-doc-2"
    | "photo-1"
    | "photo-2"
    | "photo-3"
    | "photo-4"
    | "photo-5"
  url?: string
  fileName?: string
}

export interface BandProfile {
  name: string
  city: string
  country: string
  genres: string[]
  email: string
  contactPerson: string
  contactRole: string
  phone?: string
  languages: ("DE" | "EN" | "FR" | "ES")[]
  similarBands?: string[]
  materials: BandMaterial[]
  documents: BandDocument[]
}

export const mockFestivals: Festival[] = [
  {
    id: "1",
    name: "Rock am Ring",
    location: "Nuerburg",
    country: "Deutschland",
    distance: 120,
    dateStart: "2026-06-05",
    dateEnd: "2026-06-07",
    size: "Gross",
    genres: ["Rock", "Metal", "Alternative"],
    contactType: "E-Mail",
    contactEmail: "booking@rockamring.de",
    status: "Neu",
    source: "Keyword",
    description: "Eines der groessten Rockfestivals in Deutschland mit ueber 80.000 Besuchern jaehrlich.",
    website: "https://www.rock-am-ring.com",
    isRelevant: false,
  },
  {
    id: "2",
    name: "Wacken Open Air",
    location: "Wacken",
    country: "Deutschland",
    distance: 450,
    dateStart: "2026-07-30",
    dateEnd: "2026-08-01",
    size: "Gross",
    genres: ["Metal", "Heavy Metal", "Hard Rock"],
    contactType: "Formular",
    status: "Freigegeben",
    source: "Keyword",
    description: "Das weltweit groesste Heavy-Metal-Festival.",
    website: "https://www.wacken.com",
    isRelevant: true,
  },
  {
    id: "3",
    name: "Haldern Pop",
    location: "Haldern",
    country: "Deutschland",
    distance: 80,
    dateStart: "2026-08-13",
    dateEnd: "2026-08-15",
    size: "Mittel",
    genres: ["Indie", "Folk", "Alternative"],
    contactType: "E-Mail",
    contactEmail: "artists@haldernpop.com",
    status: "Neu",
    source: "Similar Band",
    description: "Indie-Festival mit familiärer Atmosphäre.",
    website: "https://www.haldernpop.com",
    isRelevant: false,
  },
  {
    id: "4",
    name: "Fusion Festival",
    location: "Laerz",
    country: "Deutschland",
    distance: 380,
    dateStart: "2026-06-24",
    dateEnd: "2026-06-28",
    size: "Gross",
    genres: ["Elektronisch", "Experimental", "Indie"],
    contactType: "Unbekannt",
    status: "Ignoriert",
    source: "Keyword",
    description: "Kulturelles Festival mit Musik, Kunst und Theater.",
    website: "https://www.fusion-festival.de",
    isRelevant: false,
  },
  {
    id: "5",
    name: "Openair Frauenfeld",
    location: "Frauenfeld",
    country: "Schweiz",
    distance: 280,
    dateStart: "2026-07-09",
    dateEnd: "2026-07-11",
    size: "Gross",
    genres: ["Hip-Hop", "Rap", "Urban"],
    contactType: "Formular",
    status: "Neu",
    source: "Similar Band",
    description: "Europas groesstes Hip-Hop Festival.",
    website: "https://www.openair-frauenfeld.ch",
    isRelevant: false,
  },
  {
    id: "6",
    name: "Donauinselfest",
    location: "Wien",
    country: "Oesterreich",
    distance: 520,
    dateStart: "2026-06-26",
    dateEnd: "2026-06-28",
    size: "Gross",
    genres: ["Pop", "Rock", "Elektronisch"],
    contactType: "E-Mail",
    contactEmail: "booking@donauinselfest.at",
    status: "Freigegeben",
    source: "Keyword",
    description: "Eines der groessten Open-Air-Festivals Europas mit freiem Eintritt.",
    website: "https://www.donauinselfest.at",
    isRelevant: true,
  },
  {
    id: "7",
    name: "Immergut Festival",
    location: "Neustrelitz",
    country: "Deutschland",
    distance: 320,
    dateStart: "2026-05-29",
    dateEnd: "2026-05-30",
    size: "Klein",
    genres: ["Indie", "Singer-Songwriter", "Folk"],
    contactType: "E-Mail",
    contactEmail: "booking@immergutrocken.de",
    status: "Neu",
    source: "Similar Band",
    description: "Charmantes Indie-Festival am See.",
    website: "https://www.immergutrocken.de",
    isRelevant: false,
  },
  {
    id: "8",
    name: "Southside Festival",
    location: "Neuhausen ob Eck",
    country: "Deutschland",
    distance: 350,
    dateStart: "2026-06-19",
    dateEnd: "2026-06-21",
    size: "Gross",
    genres: ["Rock", "Alternative", "Indie"],
    contactType: "Formular",
    status: "Neu",
    source: "Keyword",
    description: "Schwester-Festival von Hurricane mit aehnlichem Line-Up.",
    website: "https://www.southside.de",
    isRelevant: false,
  },
]

export const mockApplications: Application[] = [
  {
    id: "1",
    festivalId: "2",
    festivalName: "Wacken Open Air",
    year: 2026,
    language: "DE",
    applicationType: "Formular",
    status: "Gesendet",
    sentAt: "2026-01-15T14:30:00",
    subject: "Bewerbung - SUDAKA",
    body: `Liebes Wacken-Team,

wir moechten uns hiermit sehr gerne mit unserer Band SUDAKA fuer einen Auftritt beim Wacken Open Air bewerben.

SUDAKA ist eine sechskoepfige New-Cumbia- und Worldmusic-Band aus Karlsruhe mit musikalischen Wurzeln in Chile, Argentinien, Peru und Deutschland.

Mit freundlichen Gruessen,
SUDAKA`,
  },
  {
    id: "2",
    festivalId: "6",
    festivalName: "Donauinselfest",
    year: 2026,
    language: "DE",
    applicationType: "E-Mail",
    status: "Vorgeschrieben",
    subject: "Kuenstlerbewerbung - SUDAKA",
    body: `Liebes Donauinselfest-Team,

wir moechten uns hiermit sehr gerne mit unserer Band SUDAKA fuer einen Auftritt beim Donauinselfest bewerben...

Mit besten Gruessen,
SUDAKA`,
  },
  {
    id: "3",
    festivalId: "1",
    festivalName: "Rock am Ring",
    year: 2026,
    language: "EN",
    applicationType: "E-Mail",
    status: "Wartend",
  },
  {
    id: "4",
    festivalId: "5",
    festivalName: "Openair Frauenfeld",
    year: 2026,
    language: "DE",
    applicationType: "Formular",
    status: "Fehler",
    sentAt: "2026-01-10T10:00:00",
    errorMessage: "E-Mail konnte nicht zugestellt werden: Postfach voll",
  },
  {
    id: "5",
    festivalId: "3",
    festivalName: "Haldern Pop",
    year: 2026,
    language: "DE",
    applicationType: "E-Mail",
    status: "Fehler",
    sentAt: "2026-01-12T09:15:00",
    errorMessage: "SMTP-Fehler: Verbindung zum Server fehlgeschlagen",
  },
]

const defaultApplicationEmail = `Liebes [FESTIVAL_NAME] Team,

wir moechten uns hiermit sehr gerne mit unserer Band SUDAKA fuer einen Auftritt beim [FESTIVAL_NAME] bewerben.

SUDAKA ist eine sechskoepfige New-Cumbia- und Worldmusic-Band aus Karlsruhe mit musikalischen Wurzeln in Chile, Argentinien, Peru und Deutschland. Unsere Musik verbindet traditionelle suedamerikanische Rhythmen mit Reggae, Ska, treibender Percussion und modernen, urbanen Einfluessen. Das Ergebnis ist ein sehr tanzbarer, warmer und energiegeladener Sound, der besonders im Open-Air-Kontext seine volle Wirkung entfaltet.

Das [FESTIVAL_NAME] spricht uns besonders an, weil es fuer kulturelle Vielfalt, Offenheit und internationale Begegnung steht. Unsere Konzerte verstehen wir als gemeinsames Erlebnis: publikumsnah, verbindend und getragen von Bewegung, Rhythmus und kollektiver Energie.

In den letzten Jahren haben wir zahlreiche Stadt- und Sommerfestivals gespielt und erleben immer wieder, dass unsere Musik Menschen unterschiedlicher Hintergruende zusammenbringt.

Mit freundlichen Gruessen,
SUDAKA`

export const mockBandProfile: BandProfile = {
  name: "SUDAKA",
  city: "Karlsruhe",
  country: "Deutschland",
  genres: ["New-Cumbia", "Worldmusic", "Reggae", "Ska"],
  email: "booking@sudaka.de",
  contactPerson: "Thomas Eisenschmied",
  contactRole: "Management",
  phone: "01772370688",
  languages: ["DE", "EN", "ES"],
  similarBands: ["Chico Trujillo", "La Fanfare en Pétard", "Panteón Rococó", "Manu Chao", "Bomba Estéreo", "Combo Chimbita", "La Yegros"],
  materials: [
    {
      language: "DE",
      bioShort: "SUDAKA ist eine sechskoepfige New-Cumbia- und Worldmusic-Band aus Karlsruhe.",
      bioLong: "SUDAKA ist eine sechskoepfige New-Cumbia- und Worldmusic-Band aus Karlsruhe mit musikalischen Wurzeln in Chile, Argentinien, Peru und Deutschland. Unsere Musik verbindet traditionelle suedamerikanische Rhythmen mit Reggae, Ska, treibender Percussion und modernen, urbanen Einfluessen.",
      applicationEmail: defaultApplicationEmail,
      spotifyUrl: "https://open.spotify.com/artist/sudaka",
      youtubeUrl: "https://youtube.com/@sudaka",
      instagramUrl: "https://instagram.com/sudaka_band",
      facebookUrl: "https://facebook.com/sudakaband",
      tiktokUrl: "https://tiktok.com/@sudaka",
      websiteUrl: "https://sudaka.de",
      epkUrl: "https://sudaka.de/epk",
      extraLink1: "https://bandcamp.com/sudaka",
      extraLink2: "",
      extraLink3: "",
    },
    {
      language: "EN",
      bioShort: "SUDAKA is a six-piece New-Cumbia and World Music band from Karlsruhe, Germany.",
      bioLong: "SUDAKA is a six-piece New-Cumbia and World Music band from Karlsruhe, Germany, with musical roots in Chile, Argentina, Peru, and Germany. Our music combines traditional South American rhythms with Reggae, Ska, driving percussion, and modern urban influences.",
      applicationEmail: `Dear [FESTIVAL_NAME] Team,

We would like to apply with our band SUDAKA for a performance at [FESTIVAL_NAME].

SUDAKA is a six-piece New-Cumbia and World Music band from Karlsruhe, Germany...

Best regards,
SUDAKA`,
      spotifyUrl: "https://open.spotify.com/artist/sudaka",
      youtubeUrl: "https://youtube.com/@sudaka",
      instagramUrl: "https://instagram.com/sudaka_band",
      facebookUrl: "https://facebook.com/sudakaband",
      tiktokUrl: "",
      websiteUrl: "https://sudaka.de/en",
      epkUrl: "https://sudaka.de/epk-en",
    },
    {
      language: "ES",
      bioShort: "SUDAKA es una banda de New-Cumbia y World Music de Karlsruhe, Alemania.",
      bioLong: "SUDAKA es una banda de seis miembros de New-Cumbia y World Music de Karlsruhe, Alemania, con raices musicales en Chile, Argentina, Peru y Alemania.",
      applicationEmail: `Estimado equipo de [FESTIVAL_NAME],

Nos gustaria postularnos con nuestra banda SUDAKA para una presentacion en [FESTIVAL_NAME]...

Saludos cordiales,
SUDAKA`,
      spotifyUrl: "https://open.spotify.com/artist/sudaka",
      youtubeUrl: "https://youtube.com/@sudaka",
      instagramUrl: "https://instagram.com/sudaka_band",
      facebookUrl: "https://facebook.com/sudakaband",
      websiteUrl: "https://sudaka.de/es",
    },
  ],
  documents: [
    { id: "1", name: "Band Deck 2026", type: "deck", url: "https://sudaka.de/deck.pdf" },
    { id: "2", name: "Tech Rider", type: "tech-rider", fileName: "tech-rider.pdf" },
    { id: "3", name: "Press Kit", type: "press-kit", url: "https://sudaka.de/presskit" },
    { id: "4", name: "Hospitality Rider", type: "hospitality-rider", fileName: "hospitality-rider.pdf" },
  ],
}

export const mockStats = {
  totalFestivals: 156,
  relevantFestivals: 42,
  applicationsSent: 18,
  agentActive: true,
}
