"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Venue } from "@/lib/mock-data"
import { useLanguage } from "@/components/language-provider"
import { getContactTypeLabel, getVenueTypeLabel, getApplyFrequencyLabel } from "@/lib/i18n"
import {
  MapPin,
  Users,
  Mail,
  FileText,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Music,
  Sparkles,
  Calendar,
  Facebook,
  Instagram,
  Video,
} from "lucide-react"

interface VenueDrawerProps {
  venue: Venue | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleRelevant: (id: string) => void
}

export function VenueDrawer({
  venue,
  open,
  onOpenChange,
  onToggleRelevant,
}: VenueDrawerProps) {
  const { language } = useLanguage()

  const copy = {
    DE: {
      distance: "{distance} km entfernt",
      venueType: "Veranstaltungsort-Typ",
      capacity: "Kapazitaet",
      noContact: "Kein Bewerbungsweg bekannt",
      genres: "Genres",
      whyTitle: "Warum dieser Veranstaltungsort?",
      similarBand: "Aehnliche Bands spielen dort",
      genreMatch: "Genre-Uebereinstimmung",
      removeApproval: "Freigabe entfernen",
      markRelevant: "Als relevant markieren",
      openWebsite: "Website oeffnen",
      applyFrequency: "Bewerbungsfrequenz",
      lastApplied: "Zuletzt beworben",
      neverApplied: "Noch nie beworben",
      socialMedia: "Social Media",
    },
    EN: {
      distance: "{distance} km away",
      venueType: "Venue type",
      capacity: "Capacity",
      noContact: "No application channel known",
      genres: "Genres",
      whyTitle: "Why this venue?",
      similarBand: "Similar bands play there",
      genreMatch: "Genre match",
      removeApproval: "Remove approval",
      markRelevant: "Mark as relevant",
      openWebsite: "Open website",
      applyFrequency: "Application frequency",
      lastApplied: "Last applied",
      neverApplied: "Never applied",
      socialMedia: "Social Media",
    },
    ES: {
      distance: "{distance} km de distancia",
      venueType: "Tipo de lugar",
      capacity: "Capacidad",
      noContact: "No se conoce via de solicitud",
      genres: "Generos",
      whyTitle: "Por que este lugar?",
      similarBand: "Bandas similares tocan alli",
      genreMatch: "Coincidencia de genero",
      removeApproval: "Quitar aprobacion",
      markRelevant: "Marcar como relevante",
      openWebsite: "Abrir sitio web",
      applyFrequency: "Frecuencia de solicitud",
      lastApplied: "Ultima solicitud",
      neverApplied: "Nunca solicitado",
      socialMedia: "Redes Sociales",
    },
  }[language]

  if (!venue) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "DE" ? "de-DE" : language === "EN" ? "en-US" : "es-ES")
  }

  const getContactIcon = (type: Venue["contactType"]) => {
    switch (type) {
      case "E-Mail":
        return <Mail className="h-4 w-4" />
      case "Formular":
        return <FileText className="h-4 w-4" />
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{venue.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          {venue.description && (
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {venue.description}
              </p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{venue.location}, {venue.country}</p>
                <p className="text-xs text-muted-foreground">
                  {copy.distance.replace("{distance}", String(venue.distance))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Music className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{getVenueTypeLabel(venue.venueType, language)}</p>
                <p className="text-xs text-muted-foreground">{copy.venueType}</p>
              </div>
            </div>

            {venue.capacity && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{venue.capacity}</p>
                  <p className="text-xs text-muted-foreground">{copy.capacity}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                {getContactIcon(venue.contactType)}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {getContactTypeLabel(venue.contactType, language)}
                </p>
                {venue.contactEmail && (
                  <p className="text-xs text-muted-foreground">{venue.contactEmail}</p>
                )}
                {venue.contactType === "Unbekannt" && (
                  <p className="text-xs text-destructive">{copy.noContact}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{getApplyFrequencyLabel(venue.applyFrequency, language)}</p>
                <p className="text-xs text-muted-foreground">
                  {venue.lastAppliedAt 
                    ? `${copy.lastApplied}: ${formatDate(venue.lastAppliedAt)}`
                    : copy.neverApplied}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Genres */}
          <div>
            <h4 className="mb-3 text-sm font-medium flex items-center gap-2">
              <Music className="h-4 w-4" />
              {copy.genres}
            </h4>
            <div className="flex flex-wrap gap-2">
              {venue.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Social Media Links */}
          {(venue.facebookUrl || venue.instagramUrl || venue.tiktokUrl) && (
            <>
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {copy.socialMedia}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {venue.facebookUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={venue.facebookUrl} target="_blank" rel="noopener noreferrer">
                        <Facebook className="mr-2 h-4 w-4" />
                        Facebook
                      </a>
                    </Button>
                  )}
                  {venue.instagramUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer">
                        <Instagram className="mr-2 h-4 w-4" />
                        Instagram
                      </a>
                    </Button>
                  )}
                  {venue.tiktokUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={venue.tiktokUrl} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-4 w-4" />
                        TikTok
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Why Relevant */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="mb-2 text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {copy.whyTitle}
            </h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                {copy.genreMatch}: {venue.genres[0]}
              </li>
              {venue.source === "Similar Band" && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  {copy.similarBand}
                </li>
              )}
            </ul>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant={venue.isRelevant ? "outline" : "default"}
              onClick={() => onToggleRelevant(venue.id)}
            >
              {venue.isRelevant ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {copy.removeApproval}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {copy.markRelevant}
                </>
              )}
            </Button>
          </div>

          {venue.website && (
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <a href={venue.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {copy.openWebsite}
              </a>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
