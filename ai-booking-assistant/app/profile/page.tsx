"use client"

import { useState, useMemo, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { mockBandProfile, type BandMaterial } from "@/lib/mock-data"
import { profileService } from "@/lib/services/profile-service"
import { sendTestApplicationAction } from "@/lib/actions/application-actions"
import { useToast } from "@/hooks/use-toast"
import { formatTemplate, getLanguageName } from "@/lib/i18n"
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
  Users,
  Loader2,
} from "lucide-react"

const availableLanguages = [
  { code: "DE" },
  { code: "EN" },
  { code: "ES" },
] as const

const documentTypes = [
  { type: "deck" },
  { type: "tech-rider" },
  { type: "press-kit" },
  { type: "hospitality-rider" },
  { type: "extra-doc-1" },
  { type: "extra-doc-2" },
] as const

const photoTypes = [
  { type: "photo-1" },
  { type: "photo-2" },
  { type: "photo-3" },
  { type: "photo-4" },
  { type: "photo-5" },
] as const

export default function ProfilePage() {
  const { language } = useLanguage()
  const copy = {
    DE: {
      title: "Band-Profil",
      subtitle: "Einmal einrichten - dann uebernimmt der Agent.",
      testEmail: "Testbewerbung an sich selbst schicken",
      save: "Speichern",
      saved: "Gespeichert",
      savedDesc: "Dein Profil wurde erfolgreich aktualisiert.",
      error: "Fehler",
      loadError: "Profil konnte nicht geladen werden.",
      saveError: "Profil konnte nicht gespeichert werden.",
      testSent: "Testbewerbung gesendet",
      testSentDesc: "Die Testbewerbung wurde an {email} gesendet.",
      testError: "Testbewerbung konnte nicht gesendet werden.",
      basicTitle: "Basisdaten",
      bandName: "Bandname",
      emailApplications: "E-Mail fuer Bewerbungen",
      contactPerson: "Kontaktperson",
      contactPersonPlaceholder: "Vor- und Nachname",
      contactRole: "Rolle der Kontaktperson",
      contactRolePlaceholder: "z.B. Band Manager, Booking",
      phone: "Telefon",
      city: "Stadt",
      country: "Land",
      genres: "Genres",
      genreRemove: "Genre {genre} entfernen",
      genrePlaceholder: "Genre hinzufuegen...",
      languagesTitle: "Sprachen",
      languagesHint: "Waehle die Sprachen, in denen Bewerbungen versendet werden sollen.",
      languagesMissing: "Eine oder mehrere aktive Sprachen haben noch keine Bewerbungsemail hinterlegt.",
      similarBandsTitle: "Aehnliche Bands (fuer Recherche)",
      similarBandsHint: "Gib bis zu 7 Bands an. Die KI sucht, wo diese in den letzten 10 Jahren gespielt haben.",
      similarBandLabel: "Band {index}",
      similarBandPlaceholder: "Name der Band...",
      materialsTitle: "Material",
      emailTemplateLabel: "Bewerbungsemail Vorlage",
      emailTemplatePlaceholder:
        "Bewerbungstext auf {language}...\n\nBeispiel:\nLiebes [FESTIVAL_NAME] Team,\n\nwir moechten uns hiermit sehr gerne mit unserer Band {bandName} fuer einen Auftritt bewerben...",
      emailTemplateHint:
        "Verwende [FESTIVAL_NAME] als Platzhalter fuer den Festivalnamen. Links und Dokumente werden automatisch angehaengt.",
      linksTitle: "Links",
      openInstagram: "Instagram Profil oeffnen",
      openFacebook: "Facebook Profil oeffnen",
      openTikTok: "TikTok Profil oeffnen",
      openWebsite: "Webseite oeffnen",
      websiteLabel: "Webseite",
      openSpotify: "Spotify Profil oeffnen",
      openYouTube: "YouTube Kanal oeffnen",
      epkLabel: "EPK URL",
      extraLinksTitle: "Extra Links",
      extraLinkLabel: "Extra Link {index}",
      documentsTitle: "Dokumente",
      documentsHint: "Lade wichtige Dokumente hoch oder verlinke sie.",
      documentPlaceholder: "{label} URL oder Datei...",
      photosTitle: "Fotos",
      emailPreviewTitle: "Bewerbungsmail Vorschau ({language})",
      emailPreviewHint:
        "So wird die generierte E-Mail aussehen, die der Agent versendet. [FESTIVAL_NAME] wird durch den tatsaechlichen Festivalnamen ersetzt.",
      emailPreviewMissing:
        "Bitte fuege eine Bewerbungsemail-Vorlage fuer {language} hinzu, um die Vorschau zu sehen.",
    },
    EN: {
      title: "Band Profile",
      subtitle: "Set it up once - then the agent takes over.",
      testEmail: "Send test application to yourself",
      save: "Save",
      saved: "Saved",
      savedDesc: "Your profile was updated successfully.",
      error: "Error",
      loadError: "Profile could not be loaded.",
      saveError: "Profile could not be saved.",
      testSent: "Test application sent",
      testSentDesc: "The test application was sent to {email}.",
      testError: "Test application could not be sent.",
      basicTitle: "Basic data",
      bandName: "Band name",
      emailApplications: "Application email address",
      contactPerson: "Contact person",
      contactPersonPlaceholder: "First and last name",
      contactRole: "Role of contact person",
      contactRolePlaceholder: "e.g. Band manager, booking",
      phone: "Phone",
      city: "City",
      country: "Country",
      genres: "Genres",
      genreRemove: "Remove genre {genre}",
      genrePlaceholder: "Add genre...",
      languagesTitle: "Languages",
      languagesHint: "Choose the languages in which applications should be sent.",
      languagesMissing: "One or more active languages do not have an application email yet.",
      similarBandsTitle: "Similar bands (for research)",
      similarBandsHint:
        "Add up to 7 bands. The AI searches where they have played in the last 10 years.",
      similarBandLabel: "Band {index}",
      similarBandPlaceholder: "Band name...",
      materialsTitle: "Materials",
      emailTemplateLabel: "Application email template",
      emailTemplatePlaceholder:
        "Application text in {language}...\n\nExample:\nDear [FESTIVAL_NAME] team,\n\nwe would like to apply with our band {bandName} for a performance...",
      emailTemplateHint:
        "Use [FESTIVAL_NAME] as a placeholder for the festival name. Links and documents are attached automatically.",
      linksTitle: "Links",
      openInstagram: "Open Instagram profile",
      openFacebook: "Open Facebook profile",
      openTikTok: "Open TikTok profile",
      openWebsite: "Open website",
      websiteLabel: "Website",
      openSpotify: "Open Spotify profile",
      openYouTube: "Open YouTube channel",
      epkLabel: "EPK URL",
      extraLinksTitle: "Extra links",
      extraLinkLabel: "Extra link {index}",
      documentsTitle: "Documents",
      documentsHint: "Upload important documents or link them.",
      documentPlaceholder: "{label} URL or file...",
      photosTitle: "Photos",
      emailPreviewTitle: "Application email preview ({language})",
      emailPreviewHint:
        "This is how the generated email will look. [FESTIVAL_NAME] will be replaced by the actual festival name.",
      emailPreviewMissing:
        "Please add an application email template for {language} to see the preview.",
    },
    ES: {
      title: "Perfil de la Banda",
      subtitle: "Configuralo una vez y el agente se encarga.",
      testEmail: "Enviar solicitud de prueba a ti mismo",
      save: "Guardar",
      saved: "Guardado",
      savedDesc: "Tu perfil se actualizo correctamente.",
      error: "Error",
      loadError: "No se pudo cargar el perfil.",
      saveError: "No se pudo guardar el perfil.",
      testSent: "Solicitud de prueba enviada",
      testSentDesc: "La solicitud de prueba se envio a {email}.",
      testError: "No se pudo enviar la solicitud de prueba.",
      basicTitle: "Datos basicos",
      bandName: "Nombre de la banda",
      emailApplications: "Correo para solicitudes",
      contactPerson: "Persona de contacto",
      contactPersonPlaceholder: "Nombre y apellido",
      contactRole: "Rol de la persona de contacto",
      contactRolePlaceholder: "ej. manager de banda, booking",
      phone: "Telefono",
      city: "Ciudad",
      country: "Pais",
      genres: "Generos",
      genreRemove: "Quitar genero {genre}",
      genrePlaceholder: "Agregar genero...",
      languagesTitle: "Idiomas",
      languagesHint: "Elige los idiomas en los que se enviaran solicitudes.",
      languagesMissing: "Uno o mas idiomas activos no tienen correo de solicitud.",
      similarBandsTitle: "Bandas similares (para investigacion)",
      similarBandsHint:
        "Agrega hasta 7 bandas. La IA busca donde han tocado en los ultimos 10 anos.",
      similarBandLabel: "Banda {index}",
      similarBandPlaceholder: "Nombre de la banda...",
      materialsTitle: "Material",
      emailTemplateLabel: "Plantilla de correo de solicitud",
      emailTemplatePlaceholder:
        "Texto de solicitud en {language}...\n\nEjemplo:\nEstimado equipo de [FESTIVAL_NAME],\n\nnos gustaria postular con nuestra banda {bandName} para tocar...",
      emailTemplateHint:
        "Usa [FESTIVAL_NAME] como marcador para el nombre del festival. Los enlaces y documentos se adjuntan automaticamente.",
      linksTitle: "Enlaces",
      openInstagram: "Abrir perfil de Instagram",
      openFacebook: "Abrir perfil de Facebook",
      openTikTok: "Abrir perfil de TikTok",
      openWebsite: "Abrir sitio web",
      websiteLabel: "Sitio web",
      openSpotify: "Abrir perfil de Spotify",
      openYouTube: "Abrir canal de YouTube",
      epkLabel: "URL de EPK",
      extraLinksTitle: "Enlaces extra",
      extraLinkLabel: "Enlace extra {index}",
      documentsTitle: "Documentos",
      documentsHint: "Sube documentos importantes o enlazalos.",
      documentPlaceholder: "URL o archivo de {label}...",
      photosTitle: "Fotos",
      emailPreviewTitle: "Vista previa del correo ({language})",
      emailPreviewHint:
        "Asi se vera el correo generado. [FESTIVAL_NAME] se reemplazara por el nombre real del festival.",
      emailPreviewMissing:
        "Agrega una plantilla de correo para {language} para ver la vista previa.",
    },
  }[language]

  const documentLabels = {
    DE: {
      "deck": "Deck",
      "tech-rider": "Tech Rider",
      "press-kit": "Press Kit",
      "hospitality-rider": "Hospitality Rider",
      "extra-doc-1": "Extra Dokument 1",
      "extra-doc-2": "Extra Dokument 2",
    },
    EN: {
      "deck": "Deck",
      "tech-rider": "Tech rider",
      "press-kit": "Press kit",
      "hospitality-rider": "Hospitality rider",
      "extra-doc-1": "Extra document 1",
      "extra-doc-2": "Extra document 2",
    },
    ES: {
      "deck": "Dossier",
      "tech-rider": "Tech rider",
      "press-kit": "Press kit",
      "hospitality-rider": "Hospitality rider",
      "extra-doc-1": "Documento extra 1",
      "extra-doc-2": "Documento extra 2",
    },
  }[language]

  const photoLabels = {
    DE: {
      "photo-1": "Foto 1",
      "photo-2": "Foto 2",
      "photo-3": "Foto 3",
      "photo-4": "Foto 4",
      "photo-5": "Foto 5",
    },
    EN: {
      "photo-1": "Photo 1",
      "photo-2": "Photo 2",
      "photo-3": "Photo 3",
      "photo-4": "Photo 4",
      "photo-5": "Photo 5",
    },
    ES: {
      "photo-1": "Foto 1",
      "photo-2": "Foto 2",
      "photo-3": "Foto 3",
      "photo-4": "Foto 4",
      "photo-5": "Foto 5",
    },
  }[language]
  const [profile, setProfile] = useState(mockBandProfile)
  const [newGenre, setNewGenre] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"DE" | "EN" | "ES">("DE")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await profileService.getProfile()
        if (data) {
          setProfile(data)
        }
      } catch (error) {
        console.error("Error loading profile:", error)
        toast({
        title: copy.error,
        description: copy.loadError,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await profileService.saveProfile(profile)
      toast({
        title: copy.saved,
        description: copy.savedDesc,
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: copy.error,
        description: copy.saveError,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestApplication = async () => {
    setSendingTest(true)
    try {
      const result = await sendTestApplicationAction(selectedLanguage)
      if (result?.success) {
        toast({
          title: copy.testSent,
          description: copy.testSentDesc.replace("{email}", profile.email),
        })
      } else {
        toast({
          title: copy.error,
          description: result?.error || copy.testError,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending test application:", error)
      toast({
        title: copy.error,
        description: copy.testError,
        variant: "destructive",
      })
    } finally {
      setSendingTest(false)
    }
  }

  const handleUpdateMaterial = (langCode: string, field: keyof BandMaterial, value: string) => {
    setProfile((prev) => {
      const materials = [...prev.materials]
      const index = materials.findIndex((m) => m.language === langCode)
      
      if (index >= 0) {
        materials[index] = { ...materials[index], [field]: value }
      } else {
        // Create new material if it doesn't exist
        const newMaterial: BandMaterial = {
          language: langCode as any,
          bioShort: "",
          bioLong: "",
          applicationEmail: "",
          [field]: value
        }
        materials.push(newMaterial)
      }
      
      return { ...prev, materials }
    })
  }

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

  const handleToggleLanguage = (langCode: "DE" | "EN" | "ES") => {
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

  const handleUpdateDocument = (type: string, value: string) => {
    setProfile((prev) => {
      const documents = [...prev.documents]
      const index = documents.findIndex((d) => d.type === type)
      
      if (index >= 0) {
        // If it looks like a URL, set url, otherwise fileName
        const isUrl = value.startsWith("http") || value.startsWith("https")
        documents[index] = { 
          ...documents[index], 
          url: isUrl ? value : "", 
          fileName: isUrl ? "" : value 
        }
      } else {
        const isUrl = value.startsWith("http") || value.startsWith("https")
        documents.push({
          id: crypto.randomUUID(),
          name: type,
          type: type as any,
          url: isUrl ? value : "",
          fileName: isUrl ? "" : value
        })
      }
      
      return { ...prev, documents }
    })
  }

  const emailCopy = {
    DE: {
      signature: "Herzliche Gruesse",
      phoneLabel: "Telefon",
      linksIntro: "Einen Eindruck unserer Musik und Live-Auftritte findet ihr hier:",
      documentsIntro: "Angehaengte Dokumente:",
      photosIntro: "Angehaengte Fotos:",
      attachmentLabel: "Anhang",
      labelYouTube: "YouTube",
      labelInstagram: "Instagram",
      labelSpotify: "Spotify",
      labelWebsite: "Website",
      labelFacebook: "Facebook",
      labelTikTok: "TikTok",
      labelEpk: "EPK",
      labelLink: "Link",
    },
    EN: {
      signature: "Best regards",
      phoneLabel: "Phone",
      linksIntro: "You can find an impression of our music and live shows here:",
      documentsIntro: "Attached documents:",
      photosIntro: "Attached photos:",
      attachmentLabel: "Attachment",
      labelYouTube: "YouTube",
      labelInstagram: "Instagram",
      labelSpotify: "Spotify",
      labelWebsite: "Website",
      labelFacebook: "Facebook",
      labelTikTok: "TikTok",
      labelEpk: "EPK",
      labelLink: "Link",
    },
    ES: {
      signature: "Saludos cordiales",
      phoneLabel: "Telefono",
      linksIntro: "Puedes encontrar una muestra de nuestra musica y shows en vivo aqui:",
      documentsIntro: "Documentos adjuntos:",
      photosIntro: "Fotos adjuntas:",
      attachmentLabel: "Adjunto",
      labelYouTube: "YouTube",
      labelInstagram: "Instagram",
      labelSpotify: "Spotify",
      labelWebsite: "Sitio web",
      labelFacebook: "Facebook",
      labelTikTok: "TikTok",
      labelEpk: "EPK",
      labelLink: "Enlace",
    },
  }[selectedLanguage]

  const emailDocumentLabels = {
    DE: {
      "deck": "Deck",
      "tech-rider": "Tech Rider",
      "press-kit": "Press Kit",
      "hospitality-rider": "Hospitality Rider",
      "extra-doc-1": "Extra Dokument 1",
      "extra-doc-2": "Extra Dokument 2",
    },
    EN: {
      "deck": "Deck",
      "tech-rider": "Tech rider",
      "press-kit": "Press kit",
      "hospitality-rider": "Hospitality rider",
      "extra-doc-1": "Extra document 1",
      "extra-doc-2": "Extra document 2",
    },
    ES: {
      "deck": "Dossier",
      "tech-rider": "Tech rider",
      "press-kit": "Press kit",
      "hospitality-rider": "Hospitality rider",
      "extra-doc-1": "Documento extra 1",
      "extra-doc-2": "Documento extra 2",
    },
  }[selectedLanguage]

  const emailPhotoLabels = {
    DE: {
      "photo-1": "Foto 1",
      "photo-2": "Foto 2",
      "photo-3": "Foto 3",
      "photo-4": "Foto 4",
      "photo-5": "Foto 5",
    },
    EN: {
      "photo-1": "Photo 1",
      "photo-2": "Photo 2",
      "photo-3": "Photo 3",
      "photo-4": "Photo 4",
      "photo-5": "Photo 5",
    },
    ES: {
      "photo-1": "Foto 1",
      "photo-2": "Foto 2",
      "photo-3": "Foto 3",
      "photo-4": "Foto 4",
      "photo-5": "Foto 5",
    },
  }[selectedLanguage]

  // Generate the complete email preview
  const generatedEmail = useMemo(() => {
    const material = getLanguageMaterial(selectedLanguage)
    if (!material?.applicationEmail) return null

    const festivalName = "[FESTIVAL_NAME]"
    let emailText = material.applicationEmail.replace(/\[FESTIVAL_NAME\]/g, festivalName)

    // Build links section
    const links: string[] = []
    if (material.youtubeUrl) links.push(`${emailCopy.labelYouTube}: ${material.youtubeUrl}`)
    if (material.instagramUrl) links.push(`${emailCopy.labelInstagram}: ${material.instagramUrl}`)
    if (material.spotifyUrl) links.push(`${emailCopy.labelSpotify}: ${material.spotifyUrl}`)
    if (material.websiteUrl) links.push(`${emailCopy.labelWebsite}: ${material.websiteUrl}`)
    if (material.facebookUrl) links.push(`${emailCopy.labelFacebook}: ${material.facebookUrl}`)
    if (material.tiktokUrl) links.push(`${emailCopy.labelTikTok}: ${material.tiktokUrl}`)
    if (material.epkUrl) links.push(`${emailCopy.labelEpk}: ${material.epkUrl}`)
    if (material.extraLink1) links.push(`${emailCopy.labelLink}: ${material.extraLink1}`)
    if (material.extraLink2) links.push(`${emailCopy.labelLink}: ${material.extraLink2}`)
    if (material.extraLink3) links.push(`${emailCopy.labelLink}: ${material.extraLink3}`)

    // Build documents section
    const docs: string[] = []
    for (const docType of documentTypes) {
      const doc = getDocumentByType(docType.type)
      if (doc) {
        const label = emailDocumentLabels[docType.type]
        if (doc.url) {
          docs.push(`${label}: ${doc.url}`)
        } else if (doc.fileName) {
          docs.push(`${label}: [${emailCopy.attachmentLabel}: ${doc.fileName}]`)
        }
      }
    }

    // Build photos section
    const photos: string[] = []
    for (const photoType of photoTypes) {
      const photo = getDocumentByType(photoType.type)
      if (photo) {
        const label = emailPhotoLabels[photoType.type]
        if (photo.url) {
          photos.push(`${label}: ${photo.url}`)
        } else if (photo.fileName) {
          photos.push(`${label}: [${emailCopy.attachmentLabel}: ${photo.fileName}]`)
        }
      }
    }

    // Build signature
    const signature = `\n\n${emailCopy.signature}\n${profile.contactPerson}\n${profile.contactRole} - ${profile.name}${profile.phone ? `\n${emailCopy.phoneLabel}: ${profile.phone}` : ""}`

    // Compose final email
    let finalEmail = emailText

    if (links.length > 0) {
      finalEmail += `\n\n${emailCopy.linksIntro}\n${links.join("\n")}`
    }

    if (docs.length > 0) {
      finalEmail += `\n\n${emailCopy.documentsIntro}\n${docs.join("\n")}`
    }

    if (photos.length > 0) {
      finalEmail += `\n\n${emailCopy.photosIntro}\n${photos.join("\n")}`
    }

    finalEmail += signature

    return finalEmail
  }, [profile, selectedLanguage])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
                  <p className="text-muted-foreground">
                    {copy.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <LanguageSwitcher />
                <Button
                  variant="outline"
                  onClick={handleSendTestApplication}
                  disabled={sendingTest || loading || !profile.email}
                  className="gap-2"
                >
                  {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {copy.testEmail}
                </Button>
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {copy.save}
                </Button>
              </div>
            </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
            {/* Basic Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="h-5 w-5 text-primary" />
                  {copy.basicTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bandName">{copy.bandName}</Label>
                    <Input
                      id="bandName"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{copy.emailApplications}</Label>
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
                    <Label htmlFor="contactPerson">{copy.contactPerson}</Label>
                    <Input
                      id="contactPerson"
                      value={profile.contactPerson}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, contactPerson: e.target.value }))
                      }
                      placeholder={copy.contactPersonPlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">{copy.contactRole}</Label>
                    <Input
                      id="contactRole"
                      value={profile.contactRole}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, contactRole: e.target.value }))
                      }
                      placeholder={copy.contactRolePlaceholder}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{copy.phone}</Label>
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
                    <Label htmlFor="city">{copy.city}</Label>
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
                    <Label htmlFor="country">{copy.country}</Label>
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
                  <Label>{copy.genres}</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="gap-1">
                        {genre}
                        <button
                          type="button"
                          onClick={() => handleRemoveGenre(genre)}
                          aria-label={formatTemplate(copy.genreRemove, { genre })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={copy.genrePlaceholder}
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
                  {copy.languagesTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {copy.languagesHint}
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
                            {getLanguageName(lang.code, language)}
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
                      {copy.languagesMissing}
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
                  {copy.similarBandsTitle}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {copy.similarBandsHint}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Label htmlFor={`similar-band-${i}`}>
                        {formatTemplate(copy.similarBandLabel, { index: i + 1 })}
                      </Label>
                      <Input 
                        id={`similar-band-${i}`} 
                        placeholder={copy.similarBandPlaceholder}
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
                  {copy.materialsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="DE" onValueChange={(v) => setSelectedLanguage(v as typeof selectedLanguage)}>
                  <TabsList className="mb-4 w-full justify-start overflow-x-auto">
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
                            {copy.emailTemplateLabel}
                          </Label>
                          <Textarea
                            placeholder={formatTemplate(copy.emailTemplatePlaceholder, {
                              language: getLanguageName(lang.code, language),
                              bandName: profile.name,
                            })}
                            value={material.applicationEmail || ""}
                            onChange={(e) => handleUpdateMaterial(lang.code, "applicationEmail", e.target.value)}
                            rows={10}
                            className="resize-none font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            {copy.emailTemplateHint}
                          </p>
                        </div>

                        <Separator />

                        {/* Links Section */}
                        <div className="space-y-4">
                          <h4 className="flex items-center gap-2 text-sm font-medium">
                            <LinkIcon className="h-4 w-4 text-primary" />
                            {copy.linksTitle}
                          </h4>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`instagram-${lang.code}`}>Instagram</Label>
                              <div className="relative">
                                <Input
                                  id={`instagram-${lang.code}`}
                                  placeholder="https://instagram.com/..."
                                  value={material.instagramUrl || ""}
                                  onChange={(e) => handleUpdateMaterial(lang.code, "instagramUrl", e.target.value)}
                                />
                                {material.instagramUrl && (
                                  <a
                                    href={material.instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={copy.openInstagram}
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
                                  onChange={(e) => handleUpdateMaterial(lang.code, "facebookUrl", e.target.value)}
                                />
                                {material.facebookUrl && (
                                  <a
                                    href={material.facebookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={copy.openFacebook}
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
                                  onChange={(e) => handleUpdateMaterial(lang.code, "tiktokUrl", e.target.value)}
                                />
                                {material.tiktokUrl && (
                                  <a
                                    href={material.tiktokUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={copy.openTikTok}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`website-${lang.code}`}>{copy.websiteLabel}</Label>
                              <div className="relative">
                                <Input
                                  id={`website-${lang.code}`}
                                  placeholder="https://..."
                                  value={material.websiteUrl || ""}
                                  onChange={(e) => handleUpdateMaterial(lang.code, "websiteUrl", e.target.value)}
                                />
                                {material.websiteUrl && (
                                  <a
                                    href={material.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={copy.openWebsite}
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
                                  onChange={(e) => handleUpdateMaterial(lang.code, "spotifyUrl", e.target.value)}
                                />
                                {material.spotifyUrl && (
                                  <a
                                    href={material.spotifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={copy.openSpotify}
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
                                  onChange={(e) => handleUpdateMaterial(lang.code, "youtubeUrl", e.target.value)}
                                />
                                {material.youtubeUrl && (
                                  <a
                                    href={material.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={copy.openYouTube}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`epk-${lang.code}`}>{copy.epkLabel}</Label>
                            <Input
                              id={`epk-${lang.code}`}
                              placeholder="https://..."
                              value={material.epkUrl || ""}
                              onChange={(e) => handleUpdateMaterial(lang.code, "epkUrl", e.target.value)}
                            />
                          </div>

                          <Separator />

                          <h4 className="text-sm font-medium">{copy.extraLinksTitle}</h4>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label htmlFor={`extra1-${lang.code}`}>
                                {formatTemplate(copy.extraLinkLabel, { index: 1 })}
                              </Label>
                              <Input
                                id={`extra1-${lang.code}`}
                                placeholder="https://..."
                                value={material.extraLink1 || ""}
                                onChange={(e) => handleUpdateMaterial(lang.code, "extraLink1", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`extra2-${lang.code}`}>
                                {formatTemplate(copy.extraLinkLabel, { index: 2 })}
                              </Label>
                              <Input
                                id={`extra2-${lang.code}`}
                                placeholder="https://..."
                                value={material.extraLink2 || ""}
                                onChange={(e) => handleUpdateMaterial(lang.code, "extraLink2", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`extra3-${lang.code}`}>
                                {formatTemplate(copy.extraLinkLabel, { index: 3 })}
                              </Label>
                              <Input
                                id={`extra3-${lang.code}`}
                                placeholder="https://..."
                                value={material.extraLink3 || ""}
                                onChange={(e) => handleUpdateMaterial(lang.code, "extraLink3", e.target.value)}
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
                  {copy.documentsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {copy.documentsHint}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {documentTypes.map(({ type }) => {
                    const doc = getDocumentByType(type)
                    const label = documentLabels[type]
                    return (
                      <div key={type} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={formatTemplate(copy.documentPlaceholder, { label })}
                            value={doc?.url || doc?.fileName || ""}
                            onChange={(e) => handleUpdateDocument(type, e.target.value)}
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

                <Separator className="my-6" />

                <h4 className="text-sm font-medium">{copy.photosTitle}</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {photoTypes.map(({ type }) => {
                    const photo = getDocumentByType(type)
                    const label = photoLabels[type]
                    return (
                      <div key={type} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={formatTemplate(copy.documentPlaceholder, { label })}
                            value={photo?.url || photo?.fileName || ""}
                            onChange={(e) => handleUpdateDocument(type, e.target.value)}
                            className="flex-1"
                          />
                          <Button variant="outline" size="icon">
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                        {photo && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {photo.url ? (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                <a href={photo.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {photo.name}
                                </a>
                              </>
                            ) : (
                              <>
                                <File className="h-3 w-3" />
                                <span>{photo.fileName}</span>
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
                  {formatTemplate(copy.emailPreviewTitle, {
                    language: selectedLanguage,
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {copy.emailPreviewHint}
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
                      {formatTemplate(copy.emailPreviewMissing, {
                        language: selectedLanguage,
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
