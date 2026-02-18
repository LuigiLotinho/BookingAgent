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
import type { Festival } from "@/lib/mock-data"
import { useLanguage } from "@/components/language-provider"
import { getContactTypeLabel, getFestivalSizeLabel } from "@/lib/i18n"
import {
  MapPin,
  Calendar,
  Users,
  Mail,
  FileText,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Music,
  Sparkles,
  Send,
  TrendingUp,
} from "lucide-react"

interface FestivalDrawerProps {
  festival: Festival | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleRelevant: (id: string) => void
}

export function FestivalDrawer({
  festival,
  open,
  onOpenChange,
  onToggleRelevant,
}: FestivalDrawerProps) {
  const { language, locale } = useLanguage()

  const copy = {
    DE: {
      distance: "{distance} km entfernt",
      festivalDate: "Festivaldatum",
      sizeEstimated: "Festivalgroesse (geschaetzt)",
      noContact: "Kein Bewerbungsweg bekannt",
      genres: "Genres",
      whyTitle: "Warum dieses Festival?",
      similarBand: "Aehnliche Bands spielen dort",
      sizeFit: "Passende Festivalgroesse",
      removeApproval: "Freigabe entfernen",
      markRelevant: "Als relevant markieren",
      openWebsite: "Website oeffnen",
      applyNow: "Zur Bewerbungsseite",
      genreMatch: "Genre-Match",
      recommendation: "Empfehlung",
      recApply: "Bewerben",
      recWatch: "Manuell pruefen",
      recSkip: "Eher ueberspringen",
      explanation: "Analyse",
    },
    EN: {
      distance: "{distance} km away",
      festivalDate: "Festival dates",
      sizeEstimated: "Festival size (estimated)",
      noContact: "No application channel known",
      genres: "Genres",
      whyTitle: "Why this festival?",
      similarBand: "Similar bands play there",
      sizeFit: "Matching festival size",
      removeApproval: "Remove approval",
      markRelevant: "Mark as relevant",
      openWebsite: "Open website",
      applyNow: "Go to application page",
      genreMatch: "Genre match",
      recommendation: "Recommendation",
      recApply: "Apply",
      recWatch: "Review manually",
      recSkip: "Rather skip",
      explanation: "Analysis",
    },
    ES: {
      distance: "{distance} km de distancia",
      festivalDate: "Fechas del festival",
      sizeEstimated: "Tamano del festival (estimado)",
      noContact: "No se conoce via de solicitud",
      genres: "Generos",
      whyTitle: "Por que este festival?",
      similarBand: "Bandas similares tocan alli",
      sizeFit: "Tamano de festival adecuado",
      removeApproval: "Quitar aprobacion",
      markRelevant: "Marcar como relevante",
      openWebsite: "Abrir sitio web",
      applyNow: "Ir a la pagina de solicitud",
      genreMatch: "Compatibilidad de genero",
      recommendation: "Recomendacion",
      recApply: "Solicitar",
      recWatch: "Revisar manualmente",
      recSkip: "Omitir",
      explanation: "Analisis",
    },
  }[language]

  if (!festival) return null

  const formatDate = (start?: string, end?: string) => {
    if (!start) return '–'
    const startDate = new Date(start)
    if (isNaN(startDate.getTime())) return '–'
    const endDate = end ? new Date(end) : startDate
    if (isNaN(endDate.getTime())) return startDate.toLocaleDateString(locale)
    return `${startDate.toLocaleDateString(locale)} – ${endDate.toLocaleDateString(locale)}`
  }

  const getContactIcon = (type: Festival["contactType"]) => {
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
          <SheetTitle className="text-xl">{festival.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          {festival.description && (
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {festival.description}
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
                <p className="text-sm font-medium">
                  {[festival.location, festival.country].filter(Boolean).join(', ') || '–'}
                </p>
                {(festival.distanceKm ?? festival.distance) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {copy.distance.replace("{distance}", String(festival.distanceKm ?? festival.distance))}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatDate(festival.dateStart, festival.dateEnd)}</p>
                <p className="text-xs text-muted-foreground">{copy.festivalDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{getFestivalSizeLabel(festival.size, language)}</p>
                <p className="text-xs text-muted-foreground">{copy.sizeEstimated}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                {getContactIcon(festival.contactType)}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {getContactTypeLabel(festival.contactType, language)}
                </p>
                {festival.contactEmail && (
                  <p className="text-xs text-muted-foreground">{festival.contactEmail}</p>
                )}
                {festival.contactType === "Unbekannt" && (
                  <p className="text-xs text-destructive">{copy.noContact}</p>
                )}
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
              {festival.genresDetected && festival.genresDetected.length > 0
                ? festival.genresDetected.map((g) => (
                    <Badge
                      key={g.genre}
                      variant={g.confidence === 'explicit' ? 'default' : 'secondary'}
                      title={g.confidence === 'explicit' ? 'Explizit erkannt' : 'Implizit erkannt'}
                    >
                      {g.genre}
                    </Badge>
                  ))
                : festival.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
            </div>
          </div>

          <Separator />

          {/* AI Analysis */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {copy.whyTitle}
            </h4>

            {/* Genre Match Score */}
            {festival.genreMatchScore != null && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">{copy.genreMatch}:</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${festival.genreMatchScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{festival.genreMatchScore}%</span>
                </div>
              </div>
            )}

            {/* Recommendation */}
            {festival.recommendation && (
              <div className="flex items-center gap-2">
                {festival.recommendation === "apply" && <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                {festival.recommendation === "watch" && <HelpCircle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />}
                {festival.recommendation === "skip" && <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className="text-sm">
                  {festival.recommendation === "apply" && copy.recApply}
                  {festival.recommendation === "watch" && copy.recWatch}
                  {festival.recommendation === "skip" && copy.recSkip}
                </span>
              </div>
            )}

            {/* Explanation */}
            {festival.explanation && (
              <p className="text-xs text-muted-foreground leading-relaxed">{festival.explanation}</p>
            )}

            {/* Similar Band source */}
            {(festival.source === "Similar Band" || festival.source === "similar_bands") && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="text-sm">{festival.sourceDetail ?? copy.similarBand}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant={festival.isRelevant ? "outline" : "default"}
              onClick={() => onToggleRelevant(festival.id)}
            >
              {festival.isRelevant ? (
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

          <div className="flex flex-col gap-2">
            {festival.applicationUrl && festival.applicationUrl !== festival.website && (
              <Button className="w-full" asChild>
                <a href={festival.applicationUrl} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-4 w-4" />
                  {copy.applyNow}
                </a>
              </Button>
            )}
            {festival.website && (
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <a href={festival.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {copy.openWebsite}
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
