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
  if (!application) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return "–"
    return new Date(dateString).toLocaleDateString("de-DE", {
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
        return <Badge variant="secondary">Wartend</Badge>
      case "Vorgeschrieben":
        return <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Vorgeschrieben</Badge>
      case "Gesendet":
        return <Badge className="bg-success/20 text-success hover:bg-success/30">Gesendet</Badge>
      case "Fehler":
        return <Badge variant="destructive">Fehler</Badge>
    }
  }

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      DE: "Deutsch",
      EN: "Englisch",
      FR: "Franzoesisch",
      ES: "Spanisch",
    }
    return names[code] || code
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Bewerbung: {application.festivalName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{getLanguageName(application.language)}</span>
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
            <span className="text-sm text-muted-foreground">Status:</span>
            {getStatusBadge(application.status)}
          </div>

          {application.status === "Fehler" && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Bewerbung konnte nicht gesendet werden</p>
                {application.errorMessage && (
                  <p className="text-sm text-destructive/80 mt-1">{application.errorMessage}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Bitte versuche es manuell oder kontaktiere den Support.</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Email Content */}
          {application.subject && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Betreff</h4>
              <p className="text-sm font-medium">{application.subject}</p>
            </div>
          )}

          {application.body && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">E-Mail-Text</h4>
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
                  ? "Die Bewerbung wird noch erstellt."
                  : "Kein Inhalt verfuegbar."}
              </p>
            </div>
          )}

          <Separator />

          {/* Notice */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-xs text-muted-foreground">
              Hinweis: Antworten auf diese Bewerbung werden nicht automatisch verarbeitet. 
              Bitte pruefe dein E-Mail-Postfach regelmaessig.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
