"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Application } from "@/lib/mock-data"
import { Mail, Clock, Globe, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import {
  formatTemplate,
  getApplicationStatusLabel,
  getLanguageName,
} from "@/lib/i18n"

interface ApplicationDrawerProps {
  application: Application | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplicationDrawer({
  application,
  open,
  onOpenChange,
}: ApplicationDrawerProps) {
  const { language, locale } = useLanguage()

  const copy = {
    DE: {
      title: "Bewerbung: {name}",
      status: "Status:",
      failedTitle: "Bewerbung konnte nicht gesendet werden",
      failedHint: "Bitte versuche es manuell oder kontaktiere den Support.",
      subject: "Betreff",
      body: "E-Mail-Text",
      pendingBody: "Die Bewerbung wird noch erstellt.",
      noContent: "Kein Inhalt verfuegbar.",
      notice:
        "Hinweis: Antworten auf diese Bewerbung werden nicht automatisch verarbeitet. Bitte pruefe dein E-Mail-Postfach regelmaessig.",
      venue: "Veranstaltungsort",
      festival: "Festival",
    },
    EN: {
      title: "Application: {name}",
      status: "Status:",
      failedTitle: "Application could not be sent",
      failedHint: "Please try manually or contact support.",
      subject: "Subject",
      body: "Email text",
      pendingBody: "The application is still being created.",
      noContent: "No content available.",
      notice:
        "Note: Replies to this application are not processed automatically. Please check your inbox regularly.",
      venue: "Venue",
      festival: "Festival",
    },
    ES: {
      title: "Solicitud: {name}",
      status: "Estado:",
      failedTitle: "La solicitud no se pudo enviar",
      failedHint: "Intentalo manualmente o contacta con soporte.",
      subject: "Asunto",
      body: "Texto del correo",
      pendingBody: "La solicitud aun se esta creando.",
      noContent: "No hay contenido disponible.",
      notice:
        "Nota: Las respuestas a esta solicitud no se procesan automaticamente. Revisa tu bandeja de entrada con frecuencia.",
      venue: "Lugar",
      festival: "Festival",
    },
  }[language]

  if (!application) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return "–"
    return new Date(dateString).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: Application["status"]) => {
    switch (status) {
      case "Wartend":
        return <Badge variant="secondary">{getApplicationStatusLabel(status, language)}</Badge>
      case "Vorgeschrieben":
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
            {getApplicationStatusLabel(status, language)}
          </Badge>
        )
      case "Gesendet":
        return (
          <Badge className="bg-success/20 text-success hover:bg-success/30">
            {getApplicationStatusLabel(status, language)}
          </Badge>
        )
      case "Fehler":
        return <Badge variant="destructive">{getApplicationStatusLabel(status, language)}</Badge>
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">
            {formatTemplate(copy.title, { 
              name: application.targetType === 'Venue' 
                ? (application.venueName || 'Unbekannt')
                : (application.festivalName || 'Unbekannt')
            })}
          </SheetTitle>
          {application.targetType && (
            <p className="text-sm text-muted-foreground mt-1">
              {application.targetType === 'Venue' ? copy.venue : copy.festival}
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{getLanguageName(application.language, language)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{application.applicationType}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(application.sentAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{copy.status}</span>
            {getStatusBadge(application.status)}
          </div>

          {application.status === "Fehler" && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">{copy.failedTitle}</p>
                {application.errorMessage && (
                  <p className="text-sm text-destructive/80 mt-1">{application.errorMessage}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{copy.failedHint}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Email Content */}
          {application.subject && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">{copy.subject}</h4>
              <p className="text-sm font-medium">{application.subject}</p>
            </div>
          )}

          {application.body && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">{copy.body}</h4>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {application.body}
                </pre>
              </div>
            </div>
          )}

          {!application.body && (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {application.status === "Wartend"
                  ? copy.pendingBody
                  : copy.noContent}
              </p>
            </div>
          )}

          <Separator />

          {/* Notice */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-xs text-muted-foreground">
              {copy.notice}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
