"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ApplicationDrawer } from "@/components/application-drawer"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Application } from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"
import { Eye, Filter, AlertTriangle, XCircle, Loader2 } from "lucide-react"
import { formatTemplate, getApplicationStatusLabel, getLanguageName } from "@/lib/i18n"

export default function ApplicationsPage() {
  const { language, locale, formatNumber } = useLanguage()

  const copy = {
    DE: {
      title: "Bewerbungen",
      subtitle: "Transparente Uebersicht aller gesendeten und geplanten Bewerbungen.",
      errorTitle: "Fehlerhafte Bewerbungen ({count})",
      errorIntro: "Die folgenden E-Mails konnten nicht zugestellt werden:",
      details: "Details",
      dismiss: "Ausblenden",
      unknownError: "Unbekannter Fehler",
      statusPlaceholder: "Status",
      allStatus: "Alle Status",
      languagePlaceholder: "Sprache",
      allLanguages: "Alle Sprachen",
      targetTypePlaceholder: "Typ",
      allTargetTypes: "Alle Typen",
      applicationsCount: "{count} Bewerbungen",
      tableTarget: "Ziel",
      tableYear: "Jahrgang",
      tableLanguage: "Sprache",
      tableType: "Bewerbungsart",
      tableStatus: "Status",
      tableSentAt: "Gesendet am",
      empty: "Keine Bewerbungen gefunden.",
      notice:
        "Hinweis: Antworten auf Bewerbungen werden nicht automatisch verarbeitet. Bitte pruefe regelmaessig dein E-Mail-Postfach.",
    },
    EN: {
      title: "Applications",
      subtitle: "Transparent overview of sent and planned applications.",
      errorTitle: "Failed applications ({count})",
      errorIntro: "The following emails could not be delivered:",
      details: "Details",
      dismiss: "Dismiss",
      unknownError: "Unknown error",
      statusPlaceholder: "Status",
      allStatus: "All status",
      languagePlaceholder: "Language",
      allLanguages: "All languages",
      targetTypePlaceholder: "Type",
      allTargetTypes: "All types",
      applicationsCount: "{count} applications",
      tableTarget: "Target",
      tableYear: "Year",
      tableLanguage: "Language",
      tableType: "Application type",
      tableStatus: "Status",
      tableSentAt: "Sent at",
      empty: "No applications found.",
      notice:
        "Note: Replies to applications are not processed automatically. Please check your inbox regularly.",
    },
    ES: {
      title: "Solicitudes",
      subtitle: "Resumen transparente de solicitudes enviadas y planificadas.",
      errorTitle: "Solicitudes fallidas ({count})",
      errorIntro: "Los siguientes correos no se pudieron entregar:",
      details: "Detalles",
      dismiss: "Ocultar",
      unknownError: "Error desconocido",
      statusPlaceholder: "Estado",
      allStatus: "Todos los estados",
      languagePlaceholder: "Idioma",
      allLanguages: "Todos los idiomas",
      targetTypePlaceholder: "Tipo",
      allTargetTypes: "Todos los tipos",
      applicationsCount: "{count} solicitudes",
      tableTarget: "Objetivo",
      tableYear: "Ano",
      tableLanguage: "Idioma",
      tableType: "Tipo de solicitud",
      tableStatus: "Estado",
      tableSentAt: "Enviado el",
      empty: "No se encontraron solicitudes.",
      notice:
        "Nota: Las respuestas a solicitudes no se procesan automaticamente. Revisa tu bandeja de entrada con frecuencia.",
    },
  }[language]

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all")
  const [dismissedErrorIds, setDismissedErrorIds] = useState<string[]>([])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedApps: Application[] = (data || []).map(app => ({
        id: app.id,
        festivalId: app.festival_id,
        venueId: app.venue_id,
        targetType: app.target_type || 'Festival',
        festivalName: app.festival_name,
        venueName: app.venue_name,
        year: app.year,
        language: app.language,
        applicationType: app.application_type,
        status: app.status,
        sentAt: app.sent_at,
        subject: app.subject,
        body: app.body,
        errorMessage: app.error_message
      }))

      setApplications(mappedApps)
      setDismissedErrorIds([])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    const matchesLanguage = languageFilter === "all" || app.language === languageFilter
    const matchesTargetType = targetTypeFilter === "all" || app.targetType === targetTypeFilter
    return matchesStatus && matchesLanguage && matchesTargetType
  })

  const errorApplications = applications.filter(
    (app) => app.status === "Fehler" && !dismissedErrorIds.includes(app.id)
  )

  const handleSelectApplication = (application: Application) => {
    setSelectedApplication(application)
    setDrawerOpen(true)
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
                  <p className="text-muted-foreground">
                    {copy.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <LanguageSwitcher />
              </div>
            </div>

          {/* Error Alert */}
          {errorApplications.length > 0 && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {formatTemplate(copy.errorTitle, {
                    count: formatNumber(errorApplications.length),
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {copy.errorIntro}
                </p>
                <div className="space-y-3">
                  {errorApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-start justify-between rounded-lg border border-destructive/30 bg-background p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectApplication(app)}
                    >
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                        <div>
                          <p className="font-medium text-foreground">
                            {app.targetType === 'Venue' ? app.venueName : app.festivalName}
                            {app.targetType === 'Venue' && (
                              <Badge variant="outline" className="ml-2 text-xs">Venue</Badge>
                            )}
                          </p>
                          <p className="text-sm text-destructive">
                            {app.errorMessage || copy.unknownError}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(app.sentAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="shrink-0 bg-transparent">
                          {copy.details}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={(event) => {
                            event.stopPropagation()
                            setDismissedErrorIds((prev) => [...prev, app.id])
                          }}
                        >
                          {copy.dismiss}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={copy.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allStatus}</SelectItem>
                <SelectItem value="Wartend">{getApplicationStatusLabel("Wartend", language)}</SelectItem>
                <SelectItem value="Vorgeschrieben">{getApplicationStatusLabel("Vorgeschrieben", language)}</SelectItem>
                <SelectItem value="Gesendet">{getApplicationStatusLabel("Gesendet", language)}</SelectItem>
                <SelectItem value="Fehler">{getApplicationStatusLabel("Fehler", language)}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder={copy.languagePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allLanguages}</SelectItem>
                <SelectItem value="DE">{getLanguageName("DE", language)}</SelectItem>
                <SelectItem value="EN">{getLanguageName("EN", language)}</SelectItem>
                <SelectItem value="ES">{getLanguageName("ES", language)}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder={copy.targetTypePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allTargetTypes}</SelectItem>
                <SelectItem value="Festival">Festival</SelectItem>
                <SelectItem value="Venue">Venue</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground sm:ml-auto">
              {formatTemplate(copy.applicationsCount, {
                count: formatNumber(filteredApplications.length),
              })}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border bg-card">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.tableTarget}</TableHead>
                      <TableHead>{copy.tableYear}</TableHead>
                      <TableHead>{copy.tableLanguage}</TableHead>
                      <TableHead>{copy.tableType}</TableHead>
                      <TableHead>{copy.tableStatus}</TableHead>
                      <TableHead>{copy.tableSentAt}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <p className="text-muted-foreground">{copy.empty}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApplications.map((application) => (
                        <TableRow
                          key={application.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSelectApplication(application)}
                        >
                          <TableCell className="font-medium">
                            {application.targetType === 'Venue' ? application.venueName : application.festivalName}
                            {application.targetType === 'Venue' && (
                              <Badge variant="outline" className="ml-2 text-xs">Venue</Badge>
                            )}
                          </TableCell>
                          <TableCell>{application.targetType === 'Festival' ? application.year : '–'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{application.language}</Badge>
                          </TableCell>
                          <TableCell>{application.applicationType}</TableCell>
                          <TableCell>{getStatusBadge(application.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(application.sentAt)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Info Notice */}
          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              {copy.notice}
            </p>
          </div>

          {/* Drawer */}
          <ApplicationDrawer
            application={selectedApplication}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
