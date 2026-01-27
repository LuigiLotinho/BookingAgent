"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ApplicationDrawer } from "@/components/application-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [languageFilter, setLanguageFilter] = useState<string>("all")

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
        festivalName: app.festival_name,
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
    return matchesStatus && matchesLanguage
  })

  const errorApplications = applications.filter((app) => app.status === "Fehler")

  const handleSelectApplication = (application: Application) => {
    setSelectedApplication(application)
    setDrawerOpen(true)
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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Bewerbungen</h1>
            <p className="text-muted-foreground">
              Transparente Uebersicht aller gesendeten und geplanten Bewerbungen.
            </p>
          </div>

          {/* Error Alert */}
          {errorApplications.length > 0 && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Fehlerhafte Bewerbungen ({errorApplications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Die folgenden E-Mails konnten nicht zugestellt werden:
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
                          <p className="font-medium text-foreground">{app.festivalName}</p>
                          <p className="text-sm text-destructive">{app.errorMessage || "Unbekannter Fehler"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(app.sentAt)}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 bg-transparent">
                        Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="Wartend">Wartend</SelectItem>
                <SelectItem value="Vorgeschrieben">Vorgeschrieben</SelectItem>
                <SelectItem value="Gesendet">Gesendet</SelectItem>
                <SelectItem value="Fehler">Fehler</SelectItem>
              </SelectContent>
            </Select>

            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sprache" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Sprachen</SelectItem>
                <SelectItem value="DE">Deutsch</SelectItem>
                <SelectItem value="EN">Englisch</SelectItem>
                <SelectItem value="FR">Franzoesisch</SelectItem>
                <SelectItem value="ES">Spanisch</SelectItem>
              </SelectContent>
            </Select>

            <span className="ml-auto text-sm text-muted-foreground">
              {filteredApplications.length} Bewerbungen
            </span>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border bg-card">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Festival</TableHead>
                    <TableHead>Jahrgang</TableHead>
                    <TableHead>Sprache</TableHead>
                    <TableHead>Bewerbungsart</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gesendet am</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <p className="text-muted-foreground">Keine Bewerbungen gefunden.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplications.map((application) => (
                      <TableRow
                        key={application.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectApplication(application)}
                      >
                        <TableCell className="font-medium">{application.festivalName}</TableCell>
                        <TableCell>{application.year}</TableCell>
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
            )}
          </div>

          {/* Info Notice */}
          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Hinweis: Antworten auf Bewerbungen werden nicht automatisch verarbeitet. 
              Bitte pruefe regelmaessig dein E-Mail-Postfach.
            </p>
          </div>

          {/* Drawer */}
          <ApplicationDrawer
            application={selectedApplication}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </div>
      </main>
    </div>
  )
}
