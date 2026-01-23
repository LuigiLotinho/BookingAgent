"use client"

import { useState, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { mockBandProfile } from "@/lib/mock-data"
import {
  Music,
  Globe,
  FileText,
  Save,
  AlertCircle,
  ExternalLink,
  X,
  Plus,
  Upload,
  Link as LinkIcon,
  Mail,
  File,
  Eye,
} from "lucide-react"

const availableLanguages = [
  { code: "DE", name: "Deutsch" },
  { code: "EN", name: "Englisch" },
  { code: "FR", name: "Franzoesisch" },
  { code: "ES", name: "Spanisch" },
] as const

const documentTypes = [
  { type: "deck", label: "Deck" },
  { type: "tech-rider", label: "Tech Rider" },
  { type: "press-kit", label: "Press Kit" },
  { type: "hospitality-rider", label: "Hospitality Rider" },
  { type: "extra-doc-1", label: "Extra Dokument 1" },
  { type: "extra-doc-2", label: "Extra Dokument 2" },
] as const

export default function ProfilePage() {
  const [profile, setProfile] = useState(mockBandProfile)
  const [newGenre, setNewGenre] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"DE" | "EN" | "FR" | "ES">("DE")

  const handleAddGenre = () => {
    if (newGenre.trim() && !profile.genres.includes(newGenre.trim())) {
      setProfile((prev) => ({
        ...prev,
        genres: [...prev.genres, newGenre.trim()],
      }))
      setNewGenre("")
    }
  }

  const handleRemoveGenre = (genre: string) => {
    setProfile((prev) => ({
      ...prev,
      genres: prev.genres.filter((g) => g !== genre),
    }))
  }

  const handleToggleLanguage = (langCode: "DE" | "EN" | "FR" | "ES") => {
    setProfile((prev) => {
      const hasLanguage = prev.languages.includes(langCode)
      if (hasLanguage) {
        return {
          ...prev,
          languages: prev.languages.filter((l) => l !== langCode),
        }
      } else {
        return {
          ...prev,
          languages: [...prev.languages, langCode],
        }
      }
    })
  }

  const getLanguageMaterial = (langCode: string) => {
    return profile.materials.find((m) => m.language === langCode)
  }

  const hasLanguageMaterial = (langCode: string) => {
    const material = getLanguageMaterial(langCode)
    return material && material.applicationEmail
  }

  const getDocumentByType = (type: string) => {
    return profile.documents.find((d) => d.type === type)
  }

  // Generate the complete email preview
  const generatedEmail = useMemo(() => {
    const material = getLanguageMaterial(selectedLanguage)
    if (!material?.applicationEmail) return null

    const festivalName = "[FESTIVAL_NAME]"
    let emailText = material.applicationEmail.replace(/\[FESTIVAL_NAME\]/g, festivalName)

    // Build links section
    const links: string[] = []
    if (material.youtubeUrl) links.push(`YouTube: ${material.youtubeUrl}`)
    if (material.instagramUrl) links.push(`Instagram: ${material.instagramUrl}`)
    if (material.spotifyUrl) links.push(`Spotify: ${material.spotifyUrl}`)
    if (material.websiteUrl) links.push(`Website: ${material.websiteUrl}`)
    if (material.facebookUrl) links.push(`Facebook: ${material.facebookUrl}`)
    if (material.tiktokUrl) links.push(`TikTok: ${material.tiktokUrl}`)
    if (material.epkUrl) links.push(`EPK: ${material.epkUrl}`)
    if (material.extraLink1) links.push(`Link: ${material.extraLink1}`)
    if (material.extraLink2) links.push(`Link: ${material.extraLink2}`)
    if (material.extraLink3) links.push(`Link: ${material.extraLink3}`)

    // Build documents section
    const docs: string[] = []
    for (const docType of documentTypes) {
      const doc = getDocumentByType(docType.type)
      if (doc) {
        if (doc.url) {
          docs.push(`${docType.label}: ${doc.url}`)
        } else if (doc.fileName) {
          docs.push(`${docType.label}: [Anhang: ${doc.fileName}]`)
        }
      }
    }

    // Build signature
    const signature = `\n\nHerzliche Gruesse\n${profile.contactPerson}\n${profile.contactRole} - ${profile.name}${profile.phone ? `\nTelefon: ${profile.phone}` : ""}`

    // Compose final email
    let finalEmail = emailText

    if (links.length > 0) {
      finalEmail += `\n\nEinen Eindruck unserer Musik und Live-Auftritte findet ihr hier:\n${links.join("\n")}`
    }

    if (docs.length > 0) {
      finalEmail += `\n\nAngehaengte Dokumente:\n${docs.join("\n")}`
    }

    finalEmail += signature

    return finalEmail
  }, [profile, selectedLanguage])

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Band-Profil</h1>
              <p className="text-muted-foreground">
                Einmal einrichten - dann uebernimmt der Agent.
              </p>
            </div>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Speichern
            </Button>
          </div>

          <div className="space-y-6">
            {/* Basic Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="h-5 w-5 text-primary" />
                  Basisdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bandName">Bandname</Label>
                    <Input
                      id="bandName"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail fuer Bewerbungen</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Kontaktperson</Label>
                    <Input
                      id="contactPerson"
                      value={profile.contactPerson}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, contactPerson: e.target.value }))
                      }
                      placeholder="Vor- und Nachname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">Rolle der Kontaktperson</Label>
                    <Input
                      id="contactRole"
                      value={profile.contactRole}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, contactRole: e.target.value }))
                      }
                      placeholder="z.B. Band Manager, Booking"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Stadt</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="country">Land</Label>
                    <Input
                      id="country"
                      value={profile.country}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, country: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="gap-1">
                        {genre}
                        <button
                          type="button"
                          onClick={() => handleRemoveGenre(genre)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Genre hinzufuegen..."
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddGenre()}
                    />
                    <Button variant="outline" onClick={handleAddGenre}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-primary" />
                  Sprachen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Waehle die Sprachen, in denen Bewerbungen versendet werden sollen.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {availableLanguages.map((lang) => {
                    const isActive = profile.languages.includes(lang.code)
                    const hasMaterial = hasLanguageMaterial(lang.code)
                    return (
                      <div
                        key={lang.code}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`lang-${lang.code}`}
                            checked={isActive}
                            onCheckedChange={() => handleToggleLanguage(lang.code)}
                          />
                          <Label htmlFor={`lang-${lang.code}`} className="cursor-pointer">
                            {lang.name}
                          </Label>
                        </div>
                        {isActive && !hasMaterial && (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    )
                  })}
                </div>
                {profile.languages.some((l) => !hasLanguageMaterial(l)) && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-warning" />
                    <p className="text-sm text-muted-foreground">
                      Eine oder mehrere aktive Sprachen haben noch keine Bewerbungsemail hinterlegt.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Similar Bands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Aehnliche Bands (fuer Recherche)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gib bis zu 7 Bands an. Die KI sucht, wo diese in den letzten 10 Jahren gespielt haben.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Label htmlFor={`similar-band-${i}`}>Band {i + 1}</Label>
                      <Input 
                        id={`similar-band-${i}`} 
                        placeholder="Name der Band..." 
                        value={profile.similarBands?.[i] || ""}
                        onChange={(e) => {
                          const newSimilar = [...(profile.similarBands || ["", "", "", "", "", "", ""])];
                          newSimilar[i] = e.target.value;
                          setProfile({ ...profile, similarBands: newSimilar });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Material
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="DE" onValueChange={(v) => setSelectedLanguage(v as typeof selectedLanguage)}>
                  <TabsList className="mb-4">
                    {availableLanguages.map((lang) => (
                      <TabsTrigger key={lang.code} value={lang.code}>
                        {lang.code}
                        {profile.languages.includes(lang.code) && (
                          <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-success" />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {availableLanguages.map((lang) => {
                    const material = getLanguageMaterial(lang.code) || {
                      language: lang.code,
                      applicationEmail: "",
                    }
                    return (
                      <TabsContent key={lang.code} value={lang.code} className="space-y-6">
                        {/* Bewerbungsemail Template */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            Bewerbungsemail Vorlage
                          </Label>
                          <Textarea
                            placeholder={`Bewerbungstext auf ${lang.name}...\n\nBeispiel:\nLiebes [FESTIVAL_NAME] Team,\n\nwir moechten uns hiermit sehr gerne mit unserer Band ${profile.name} fuer einen Auftritt bewerben...`}
                            value={material.applicationEmail || ""}
                            rows={10}
                            className="resize-none font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Verwende [FESTIVAL_NAME] als Platzhalter fuer den Festivalnamen. Links und Dokumente werden automatisch angehaengt.
                          </p>
                        </div>

                        <Separator />

                        {/* Links Section */}
                        <div className="space-y-4">
                          <h4 className="flex items-center gap-2 text-sm font-medium">
                            <LinkIcon className="h-4 w-4 text-primary" />
                            Links
                          </h4>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`instagram-${lang.code}`}>Instagram</Label>
                              <div className="relative">
                                <Input
                                  id={`instagram-${lang.code}`}
                                  placeholder="https://instagram.com/..."
                                  value={material.instagramUrl || ""}
                                />
                                {material.instagramUrl && (
                                  <a
                                    href={material.instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`facebook-${lang.code}`}>Facebook</Label>
                              <div className="relative">
                                <Input
                                  id={`facebook-${lang.code}`}
                                  placeholder="https://facebook.com/..."
                                  value={material.facebookUrl || ""}
                                />
                                {material.facebookUrl && (
                                  <a
                                    href={material.facebookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`tiktok-${lang.code}`}>TikTok</Label>
                              <div className="relative">
                                <Input
                                  id={`tiktok-${lang.code}`}
                                  placeholder="https://tiktok.com/@..."
                                  value={material.tiktokUrl || ""}
                                />
                                {material.tiktokUrl && (
                                  <a
                                    href={material.tiktokUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`website-${lang.code}`}>Webseite</Label>
                              <div className="relative">
                                <Input
                                  id={`website-${lang.code}`}
                                  placeholder="https://..."
                                  value={material.websiteUrl || ""}
                                />
                                {material.websiteUrl && (
                                  <a
                                    href={material.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`spotify-${lang.code}`}>Spotify</Label>
                              <div className="relative">
                                <Input
                                  id={`spotify-${lang.code}`}
                                  placeholder="https://open.spotify.com/artist/..."
                                  value={material.spotifyUrl || ""}
                                />
                                {material.spotifyUrl && (
                                  <a
                                    href={material.spotifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`youtube-${lang.code}`}>YouTube</Label>
                              <div className="relative">
                                <Input
                                  id={`youtube-${lang.code}`}
                                  placeholder="https://youtube.com/@..."
                                  value={material.youtubeUrl || ""}
                                />
                                {material.youtubeUrl && (
                                  <a
                                    href={material.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`epk-${lang.code}`}>EPK URL</Label>
                            <Input
                              id={`epk-${lang.code}`}
                              placeholder="https://..."
                              value={material.epkUrl || ""}
                            />
                          </div>

                          <Separator />

                          <h4 className="text-sm font-medium">Extra Links</h4>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label htmlFor={`extra1-${lang.code}`}>Extra Link 1</Label>
                              <Input
                                id={`extra1-${lang.code}`}
                                placeholder="https://..."
                                value={material.extraLink1 || ""}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`extra2-${lang.code}`}>Extra Link 2</Label>
                              <Input
                                id={`extra2-${lang.code}`}
                                placeholder="https://..."
                                value={material.extraLink2 || ""}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`extra3-${lang.code}`}>Extra Link 3</Label>
                              <Input
                                id={`extra3-${lang.code}`}
                                placeholder="https://..."
                                value={material.extraLink3 || ""}
                              />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <File className="h-5 w-5 text-primary" />
                  Dokumente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Lade wichtige Dokumente hoch oder verlinke sie.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {documentTypes.map(({ type, label }) => {
                    const doc = getDocumentByType(type)
                    return (
                      <div key={type} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={`${label} URL oder Datei...`}
                            value={doc?.url || doc?.fileName || ""}
                            className="flex-1"
                          />
                          <Button variant="outline" size="icon">
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                        {doc && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {doc.url ? (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {doc.name}
                                </a>
                              </>
                            ) : (
                              <>
                                <File className="h-3 w-3" />
                                <span>{doc.fileName}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Generated Email Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5 text-primary" />
                  Bewerbungsmail Vorschau ({selectedLanguage})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  So wird die generierte E-Mail aussehen, die der Agent versendet. [FESTIVAL_NAME] wird durch den tatsaechlichen Festivalnamen ersetzt.
                </p>
                {generatedEmail ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                      {generatedEmail}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 p-4">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <p className="text-sm text-muted-foreground">
                      Bitte fuege eine Bewerbungsemail-Vorlage fuer {selectedLanguage} hinzu, um die Vorschau zu sehen.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
