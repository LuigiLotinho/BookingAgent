"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { mockStats, mockFestivals, type Festival } from "@/lib/mock-data"
import { festivalService } from "@/lib/services/festival-service"
import { rechercheService } from "@/lib/services/recherche-service"
import { profileService } from "@/lib/services/profile-service"
import { processApplicationAction } from "@/lib/actions/application-actions"
import { supabase } from "@/lib/supabase"
import {
  Music,
  CheckCircle,
  Send,
  ArrowRight,
  ArrowDown,
  Zap,
  MapPin,
  Calendar,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { formatTemplate, getFestivalSizeLabel } from "@/lib/i18n"

export default function DashboardPage() {
  const { language, locale, formatNumber } = useLanguage()

  const copy = {
    DE: {
      title: "Dashboard",
      subtitle: "Willkommen zurueck. Hier ist der aktuelle Stand.",
      searchFestivals: "Festivals suchen",
      agentLabel: "Bewerbungs-Agent",
      active: "Aktiviert",
      paused: "Pausiert",
      kpiFound: "Gefundene Festivals",
      kpiTotal: "Gesamtanzahl",
      kpiRelevant: "Relevante Festivals",
      kpiApproved: "Von dir freigegeben",
      kpiSent: "Bewerbungen gesendet",
      kpiSentTotal: "Gesamt gesendet",
      newFestivalsTitle: "Neu gefundene Festivals",
      showAll: "Alle anzeigen",
      newFestivalsCount: "Es gibt {count} neue Festivals, die auf deine Freigabe warten.",
      emptyFestivals: "Keine neuen Festivals gefunden.",
      agentActive: "Agent aktiv",
      festival: "Festival",
      location: "Ort",
      date: "Datum",
      size: "Groesse",
      genres: "Genres",
      links: "Links",
      websiteAria: "Website von {name} oeffnen",
      progressProfile: "Beschreibe deine Band",
      progressCrawler: "Finde automatisch die richtigen Festivals und Locations",
      progressAgent: "Bewerbe dich automatisch regelmaessig auf die Festivals und Locations",
      progressProfileLink: "Zum Band-Profil",
      progressCrawlerLink: "Zu Festivals",
      progressAgentLink: "Zu Bewerbungen",
    },
    EN: {
      title: "Dashboard",
      subtitle: "Welcome back. Here is the current status.",
      searchFestivals: "Search festivals",
      agentLabel: "Application Agent",
      active: "Enabled",
      paused: "Paused",
      kpiFound: "Festivals found",
      kpiTotal: "Total",
      kpiRelevant: "Relevant festivals",
      kpiApproved: "Approved by you",
      kpiSent: "Applications sent",
      kpiSentTotal: "Total sent",
      newFestivalsTitle: "New festivals",
      showAll: "Show all",
      newFestivalsCount: "{count} new festivals are waiting for your approval.",
      emptyFestivals: "No new festivals found.",
      agentActive: "Agent active",
      festival: "Festival",
      location: "Location",
      date: "Date",
      size: "Size",
      genres: "Genres",
      links: "Links",
      websiteAria: "Open website for {name}",
      progressProfile: "Describe your band",
      progressCrawler: "Find the right festivals and locations automatically",
      progressAgent: "Apply automatically and regularly to the festivals and locations you want",
      progressProfileLink: "Go to band profile",
      progressCrawlerLink: "Go to festivals",
      progressAgentLink: "Go to applications",
    },
    ES: {
      title: "Panel",
      subtitle: "Bienvenido de nuevo. Aqui esta el estado actual.",
      searchFestivals: "Buscar festivales",
      agentLabel: "Agente de Solicitudes",
      active: "Activo",
      paused: "Pausado",
      kpiFound: "Festivales encontrados",
      kpiTotal: "Total",
      kpiRelevant: "Festivales relevantes",
      kpiApproved: "Aprobados por ti",
      kpiSent: "Solicitudes enviadas",
      kpiSentTotal: "Total enviadas",
      newFestivalsTitle: "Festivales nuevos",
      showAll: "Ver todos",
      newFestivalsCount: "{count} festivales nuevos esperan tu aprobacion.",
      emptyFestivals: "No se encontraron festivales nuevos.",
      agentActive: "Agente activo",
      festival: "Festival",
      location: "Lugar",
      date: "Fecha",
      size: "Tamano",
      genres: "Generos",
      links: "Enlaces",
      websiteAria: "Abrir sitio web de {name}",
      progressProfile: "Describe tu banda",
      progressCrawler: "Encuentra automaticamente los festivales y locations adecuados",
      progressAgent: "Postulate automaticamente y regularmente a los festivales y locations",
      progressProfileLink: "Ir al perfil de la banda",
      progressCrawlerLink: "Ir a festivales",
      progressAgentLink: "Ir a solicitudes",
    },
  }[language]
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalFestivals: 0,
    relevantFestivals: 0,
    applicationsSent: 0,
    agentActive: true,
  })
  const [agentActive, setAgentActive] = useState(true)
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [searching, setSearching] = useState(false)
  const [hasProfileInfo, setHasProfileInfo] = useState(false)

  const loadDashboardData = async () => {
    try {
      const [fetchedStats, fetchedFestivals, fetchedProfile] = await Promise.all([
        festivalService.getStats(),
        festivalService.getNewFestivals(5),
        profileService.getProfile(),
      ])
      
      setStats(fetchedStats)
      setAgentActive(fetchedStats.agentActive)
      setFestivals(fetchedFestivals)
      setHasProfileInfo(Boolean(
        fetchedProfile &&
          (fetchedProfile.name ||
            fetchedProfile.email ||
            fetchedProfile.contactPerson ||
            fetchedProfile.genres?.length)
      ))
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleRunResearch = async () => {
    setSearching(true)
    try {
      const profile = await profileService.getProfile()
      if (profile) {
        // We need the ID, but getProfile returns the mapped profile without ID for now.
        // Let's adjust profileService or just fetch the first profile ID here.
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
        if (profiles?.[0]) {
          await rechercheService.runResearch(profiles[0].id)
          await loadDashboardData()
        }
      }
    } catch (error) {
      console.error("Error running research:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleToggleRelevant = async (festivalId: string) => {
    const festival = festivals.find(f => f.id === festivalId)
    if (!festival) return

    const newRelevant = !festival.isRelevant
    
    // Optimistic update
    setFestivals((prev) =>
      prev.map((f) =>
        f.id === festivalId
          ? { ...f, isRelevant: newRelevant, status: newRelevant ? "Freigegeben" : "Neu" as const }
          : f
      )
    )

    try {
      await festivalService.toggleRelevance(festivalId, newRelevant)
      
      // If now relevant, trigger the server action
      if (newRelevant) {
        processApplicationAction(festivalId).then(() => {
          loadDashboardData()
        })
      } else {
        // Refresh stats after change
        const updatedStats = await festivalService.getStats()
        setStats(updatedStats)
      }
    } catch (error) {
      console.error("Error updating relevance:", error)
      // Revert optimistic update on error if needed
    }
  }

  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startDay = startDate.getDate()
    const endDay = endDate.getDate()
    const month = startDate.toLocaleDateString(locale, { month: "2-digit" })
    const year = startDate.getFullYear()
    return `${startDay}.–${endDay}.${month}.${year}`
  }

  const getSizeBadge = (size: Festival["size"]) => {
    switch (size) {
      case "Klein":
        return <Badge variant="outline">{getFestivalSizeLabel(size, language)}</Badge>
      case "Mittel":
        return <Badge variant="outline">{getFestivalSizeLabel(size, language)}</Badge>
      case "Gross":
        return (
          <Badge variant="outline" className="border-primary/50 text-primary">
            {getFestivalSizeLabel(size, language)}
          </Badge>
        )
    }
  }

  const crawlerActive = stats.totalFestivals > 0 || searching

  const progressCards = [
    {
      id: "profile",
      active: hasProfileInfo,
      text: copy.progressProfile,
      href: "/profile",
      ariaLabel: copy.progressProfileLink,
    },
    {
      id: "crawler",
      active: crawlerActive,
      text: copy.progressCrawler,
      href: "/festivals",
      ariaLabel: copy.progressCrawlerLink,
    },
    {
      id: "agent",
      active: agentActive,
      text: copy.progressAgent,
      href: "/applications",
      ariaLabel: copy.progressAgentLink,
    },
  ]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LanguageSwitcher />
                <Button 
                  onClick={handleRunResearch} 
                  variant="outline" 
                  size="sm" 
                  disabled={searching || loading}
                  className="gap-2"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {copy.searchFestivals}
                </Button>
                <Card className="flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{copy.agentLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={agentActive}
                      onCheckedChange={setAgentActive}
                    />
                    <Badge variant={agentActive ? "default" : "secondary"}>
                      {agentActive ? copy.active : copy.paused}
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>

          {/* Progress Cards */}
          <div className="mb-6 flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            {progressCards.slice(0, 1).map((card) => (
              <Link key={card.id} href={card.href} aria-label={card.ariaLabel} className="block">
                <Card
                  className={
                    card.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-sky-200 bg-sky-50 text-sky-900"
                  }
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-base font-semibold leading-relaxed md:text-lg">{card.text}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            <div className="flex justify-center text-muted-foreground">
              <ArrowRight className="hidden h-4 w-4 lg:block" />
              <ArrowDown className="h-4 w-4 lg:hidden" />
            </div>
            {progressCards.slice(1, 2).map((card) => (
              <Link key={card.id} href={card.href} aria-label={card.ariaLabel} className="block">
                <Card
                  className={
                    card.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-sky-200 bg-sky-50 text-sky-900"
                  }
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-base font-semibold leading-relaxed md:text-lg">{card.text}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            <div className="flex justify-center text-muted-foreground">
              <ArrowRight className="hidden h-4 w-4 lg:block" />
              <ArrowDown className="h-4 w-4 lg:hidden" />
            </div>
            {progressCards.slice(2, 3).map((card) => (
              <Link key={card.id} href={card.href} aria-label={card.ariaLabel} className="block">
                <Card
                  className={
                    card.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-sky-200 bg-sky-50 text-sky-900"
                  }
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-base font-semibold leading-relaxed md:text-lg">{card.text}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {copy.kpiFound}
                </CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : stats.totalFestivals}
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.kpiTotal}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {copy.kpiRelevant}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : stats.relevantFestivals}
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.kpiApproved}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {copy.kpiSent}
                </CardTitle>
                <Send className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : stats.applicationsSent}
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.kpiSentTotal}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Festivals Table */}
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-5 w-5 text-primary" />
                {copy.newFestivalsTitle}
              </CardTitle>
              <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                <Link href="/festivals">
                  {copy.showAll}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {formatTemplate(copy.newFestivalsCount, {
                      count: formatNumber(festivals.length),
                    })}
                  </p>
                  <div className="rounded-lg border border-border">
                    <div className="overflow-x-auto">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">{copy.agentActive}</TableHead>
                          <TableHead>{copy.festival}</TableHead>
                          <TableHead>{copy.location}</TableHead>
                          <TableHead>{copy.date}</TableHead>
                          <TableHead>{copy.size}</TableHead>
                          <TableHead>{copy.genres}</TableHead>
                          <TableHead>{copy.links}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {festivals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <p className="text-muted-foreground">{copy.emptyFestivals}</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          festivals.map((festival) => (
                            <TableRow key={festival.id}>
                              <TableCell>
                                <Checkbox
                                  checked={festival.isRelevant}
                                  onCheckedChange={() => handleToggleRelevant(festival.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{festival.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{festival.location}, {festival.country}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">{festival.distance} km</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{formatDate(festival.dateStart, festival.dateEnd)}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getSizeBadge(festival.size)}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {festival.genres.slice(0, 2).map((genre) => (
                                    <Badge key={genre} variant="secondary" className="text-xs">
                                      {genre}
                                    </Badge>
                                  ))}
                                  {festival.genres.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{festival.genres.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                          <TableCell>
                            {festival.website && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={festival.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={formatTemplate(copy.websiteAria, {
                                    name: festival.name,
                                  })}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
