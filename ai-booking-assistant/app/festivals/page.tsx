"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { FestivalTable } from "@/components/festival-table"
import { FestivalDrawer } from "@/components/festival-drawer"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Festival } from "@/lib/mock-data"
import { festivalService } from "@/lib/services/festival-service"
import { processApplicationAction } from "@/lib/actions/application-actions"
import {
  Search,
  Filter,
  CheckCircle,
  X,
  Loader2,
  MapPin,
  Calendar,
  Mail,
  FileText,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  formatTemplate,
  getContactTypeLabel,
  getFestivalSizeLabel,
  getFestivalStatusLabel,
  getSourceLabel,
} from "@/lib/i18n"

type SortField =
  | "relevant"
  | "name"
  | "location"
  | "dateStart"
  | "size"
  | "genre"
  | "contactType"
  | "status"
  | "source"
  | "website"
type SortDirection = "asc" | "desc"

const sizeOrder = { Klein: 1, Mittel: 2, Gross: 3 }
const statusOrder = { Neu: 1, Freigegeben: 2, Ignoriert: 3 }

const FestivalsPage = () => {
  const { language, locale, formatNumber } = useLanguage()

  const copy = {
    DE: {
      title: "Festivals",
      subtitle: "Aktiviere den automatischen Bewerbungs-Agent fuer passende Festivals.",
      searchPlaceholder: "Festival oder Ort suchen...",
      country: "Land",
      allCountries: "Alle Laender",
      status: "Status",
      allStatus: "Alle Status",
      size: "Groesse",
      allSizes: "Alle Groessen",
      filter: "Filter",
      done: "Fertig",
      sortBy: "Sortieren nach",
      sortPlaceholder: "Sortierung",
      sortDirection: "Richtung",
      ascending: "Aufsteigend",
      descending: "Absteigend",
      agentActive: "Agent aktiv",
      festival: "Festival",
      location: "Ort",
      date: "Datum",
      genres: "Genres",
      contact: "Kontakt",
      source: "Quelle",
      links: "Links",
      websiteAria: "Website von {name} oeffnen",
      markAllRelevant: "Alle als relevant markieren",
      ignoreAll: "Alle ignorieren",
      festivalsShown: "{count} Festivals angezeigt",
      emptyTitle: "Keine Festivals gefunden.",
      emptyHint: "Der Agent sucht aktuell nach passenden Festivals.",
      details: "Details",
      agentToggleLabel: "Agent fuer {name} aktivieren",
      dateLabel: "Datum",
      locationLabel: "Ort",
      contactLabel: "Kontakt",
      applyAction: "Automatische Bewerbung aktivieren",
      applyActionActive: "Automatische Bewerbung aktiv",
    },
    EN: {
      title: "Festivals",
      subtitle: "Enable the automatic application agent for suitable festivals.",
      searchPlaceholder: "Search festival or location...",
      country: "Country",
      allCountries: "All countries",
      status: "Status",
      allStatus: "All status",
      size: "Size",
      allSizes: "All sizes",
      filter: "Filter",
      done: "Done",
      sortBy: "Sort by",
      sortPlaceholder: "Sorting",
      sortDirection: "Direction",
      ascending: "Ascending",
      descending: "Descending",
      agentActive: "Agent active",
      festival: "Festival",
      location: "Location",
      date: "Date",
      genres: "Genres",
      contact: "Contact",
      source: "Source",
      links: "Links",
      websiteAria: "Open website for {name}",
      markAllRelevant: "Mark all as relevant",
      ignoreAll: "Ignore all",
      festivalsShown: "{count} festivals shown",
      emptyTitle: "No festivals found.",
      emptyHint: "The agent is currently searching for suitable festivals.",
      details: "Details",
      agentToggleLabel: "Activate agent for {name}",
      dateLabel: "Date",
      locationLabel: "Location",
      contactLabel: "Contact",
      applyAction: "Enable automatic application",
      applyActionActive: "Automatic application active",
    },
    ES: {
      title: "Festivales",
      subtitle: "Activa el agente automatico de solicitudes para festivales adecuados.",
      searchPlaceholder: "Buscar festival o lugar...",
      country: "Pais",
      allCountries: "Todos los paises",
      status: "Estado",
      allStatus: "Todos los estados",
      size: "Tamano",
      allSizes: "Todos los tamanos",
      filter: "Filtro",
      done: "Listo",
      sortBy: "Ordenar por",
      sortPlaceholder: "Orden",
      sortDirection: "Direccion",
      ascending: "Ascendente",
      descending: "Descendente",
      agentActive: "Agente activo",
      festival: "Festival",
      location: "Lugar",
      date: "Fecha",
      genres: "Generos",
      contact: "Contacto",
      source: "Fuente",
      links: "Enlaces",
      websiteAria: "Abrir sitio web de {name}",
      markAllRelevant: "Marcar todos como relevantes",
      ignoreAll: "Ignorar todos",
      festivalsShown: "{count} festivales mostrados",
      emptyTitle: "No se encontraron festivales.",
      emptyHint: "El agente esta buscando festivales adecuados.",
      details: "Detalles",
      agentToggleLabel: "Activar agente para {name}",
      dateLabel: "Fecha",
      locationLabel: "Lugar",
      contactLabel: "Contacto",
      applyAction: "Activar solicitud automatica",
      applyActionActive: "Solicitud automatica activa",
    },
  }[language]

  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string>("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>("dateStart")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  useEffect(() => {
    async function loadFestivals() {
      try {
        const data = await festivalService.getFestivals()
        setFestivals(data)
      } catch (error) {
        console.error("Error loading festivals:", error)
      } finally {
        setLoading(false)
      }
    }
    loadFestivals()
  }, [])

  const filteredFestivals = festivals.filter((festival) => {
    const matchesSearch = festival.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      festival.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCountry = countryFilter === "all" || festival.country === countryFilter
    const matchesStatus = statusFilter === "all" || festival.status === statusFilter
    const matchesSize = sizeFilter === "all" || festival.size === sizeFilter
    return matchesSearch && matchesCountry && matchesStatus && matchesSize
  })

  const sortedFestivals = [...filteredFestivals].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case "relevant":
        comparison = Number(a.isRelevant) - Number(b.isRelevant)
        break
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "location":
        comparison = `${a.location}, ${a.country}`.localeCompare(`${b.location}, ${b.country}`)
        break
      case "dateStart":
        comparison = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
        break
      case "size":
        comparison = sizeOrder[a.size] - sizeOrder[b.size]
        break
      case "genre":
        comparison = (a.genres[0] || "").localeCompare(b.genres[0] || "")
        break
      case "contactType":
        comparison = a.contactType.localeCompare(b.contactType)
        break
      case "status":
        comparison = statusOrder[a.status] - statusOrder[b.status]
        break
      case "source":
        comparison = a.source.localeCompare(b.source)
        break
      case "website":
        comparison = Number(Boolean(a.website)) - Number(Boolean(b.website))
        break
      default:
        comparison = 0
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  const handleToggleRelevant = async (festivalId: string) => {
    const festival = festivals.find(f => f.id === festivalId)
    if (!festival) return

    const newRelevant = !festival.isRelevant
    
    // Optimistic update
    setFestivals((prev) =>
      prev.map((f) =>
        f.id === festivalId
          ? { ...f, isRelevant: newRelevant, status: newRelevant ? "Freigegeben" : "Neu" as any }
          : f
      )
    )

    try {
      await festivalService.toggleRelevance(festivalId, newRelevant)
      if (newRelevant) {
        processApplicationAction(festivalId)
      }
    } catch (error) {
      console.error("Error updating relevance:", error)
      // Revert if needed
    }
  }

  const handleSelectFestival = (festival: Festival) => {
    setSelectedFestival(festival)
    setDrawerOpen(true)
  }

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleMarkAllRelevant = async () => {
    const updatePromises = filteredFestivals
      .filter(f => !f.isRelevant)
      .map(f => festivalService.toggleRelevance(f.id, true))

    // Optimistic update
    setFestivals((prev) =>
      prev.map((f) =>
        filteredFestivals.some((ff) => ff.id === f.id)
          ? { ...f, isRelevant: true, status: "Freigegeben" as any }
          : f
      )
    )

    try {
      await Promise.all(updatePromises)
    } catch (error) {
      console.error("Error marking all relevant:", error)
    }
  }

  const handleIgnoreAll = async () => {
    // This would need a specific bulk update in a real scenario
    // For now we just update locally and could do multiple calls
    setFestivals((prev) =>
      prev.map((f) =>
        filteredFestivals.some((ff) => ff.id === f.id) && !f.isRelevant
          ? { ...f, status: "Ignoriert" as any }
          : f
      )
    )
  }

  const countries = [...new Set(festivals.map((f) => f.country))]

  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startDay = startDate.getDate()
    const endDay = endDate.getDate()
    const month = startDate.toLocaleDateString(locale, { month: "2-digit" })
    const year = startDate.getFullYear()
    return `${startDay}.–${endDay}.${month}.${year}`
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

  const getStatusBadge = (status: Festival["status"]) => {
    switch (status) {
      case "Neu":
        return <Badge variant="secondary">{getFestivalStatusLabel(status, language)}</Badge>
      case "Freigegeben":
        return (
          <Badge className="bg-success/20 text-success hover:bg-success/30">
            {getFestivalStatusLabel(status, language)}
          </Badge>
        )
      case "Ignoriert":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {getFestivalStatusLabel(status, language)}
          </Badge>
        )
    }
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
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

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={copy.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="hidden items-center gap-4 md:flex">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={copy.country} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allCountries}</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={copy.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allStatus}</SelectItem>
                    <SelectItem value="Neu">{getFestivalStatusLabel("Neu", language)}</SelectItem>
                    <SelectItem value="Freigegeben">{getFestivalStatusLabel("Freigegeben", language)}</SelectItem>
                    <SelectItem value="Ignoriert">{getFestivalStatusLabel("Ignoriert", language)}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={copy.size} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allSizes}</SelectItem>
                    <SelectItem value="Klein">{getFestivalSizeLabel("Klein", language)}</SelectItem>
                    <SelectItem value="Mittel">{getFestivalSizeLabel("Mittel", language)}</SelectItem>
                    <SelectItem value="Gross">{getFestivalSizeLabel("Gross", language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <Button variant="outline" className="md:hidden" onClick={() => setFilterOpen(true)}>
                  <Filter className="mr-2 h-4 w-4" />
                  {copy.filter}
                </Button>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{copy.filter}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 flex flex-col gap-4">
                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                      <SelectTrigger className="w-full">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder={copy.country} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{copy.allCountries}</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={copy.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{copy.allStatus}</SelectItem>
                        <SelectItem value="Neu">{getFestivalStatusLabel("Neu", language)}</SelectItem>
                        <SelectItem value="Freigegeben">{getFestivalStatusLabel("Freigegeben", language)}</SelectItem>
                        <SelectItem value="Ignoriert">{getFestivalStatusLabel("Ignoriert", language)}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sizeFilter} onValueChange={setSizeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={copy.size} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{copy.allSizes}</SelectItem>
                        <SelectItem value="Klein">{getFestivalSizeLabel("Klein", language)}</SelectItem>
                        <SelectItem value="Mittel">{getFestivalSizeLabel("Mittel", language)}</SelectItem>
                        <SelectItem value="Gross">{getFestivalSizeLabel("Gross", language)}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={() => setFilterOpen(false)}>{copy.done}</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <span className="text-sm text-muted-foreground">{copy.sortBy}</span>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder={copy.sortPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevant">{copy.agentActive}</SelectItem>
                    <SelectItem value="name">{copy.festival}</SelectItem>
                    <SelectItem value="location">{copy.location}</SelectItem>
                    <SelectItem value="dateStart">{copy.date}</SelectItem>
                    <SelectItem value="size">{copy.size}</SelectItem>
                    <SelectItem value="genre">{copy.genres}</SelectItem>
                    <SelectItem value="contactType">{copy.contact}</SelectItem>
                    <SelectItem value="status">{copy.status}</SelectItem>
                    <SelectItem value="source">{copy.source}</SelectItem>
                    <SelectItem value="website">{copy.links}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={copy.sortDirection} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{copy.ascending}</SelectItem>
                  <SelectItem value="desc">{copy.descending}</SelectItem>
                </SelectContent>
              </Select>
            </div>

          {/* Bulk Actions */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" size="sm" onClick={handleMarkAllRelevant}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {copy.markAllRelevant}
            </Button>
            <Button variant="outline" size="sm" onClick={handleIgnoreAll}>
              <X className="mr-2 h-4 w-4" />
              {copy.ignoreAll}
            </Button>
            <span className="text-sm text-muted-foreground sm:ml-4">
              {formatTemplate(copy.festivalsShown, {
                count: formatNumber(filteredFestivals.length),
              })}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {sortedFestivals.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                    <p className="text-muted-foreground">{copy.emptyTitle}</p>
                    <p className="text-sm text-muted-foreground">{copy.emptyHint}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedFestivals.map((festival) => (
                      <Card
                        key={festival.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectFestival(festival)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold">{festival.name}</h3>
                                {getStatusBadge(festival.status)}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={festival.source === "Similar Band" ? "default" : "outline"} className="text-xs">
                                  {getSourceLabel(festival.source, language)}
                                </Badge>
                                {getSizeBadge(festival.size)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4" />
                            <span>{festival.location}, {festival.country}</span>
                            <span className="ml-auto text-xs">{festival.distance} km</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(festival.dateStart, festival.dateEnd)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {getContactIcon(festival.contactType)}
                            <span>{getContactTypeLabel(festival.contactType, language)}</span>
                          </div>
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
                          <div className="flex flex-col gap-2 pt-2">
                            <Button
                              size="lg"
                              className={
                                festival.isRelevant
                                  ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "w-full"
                              }
                              variant={festival.isRelevant ? "default" : "outline"}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleToggleRelevant(festival.id)
                              }}
                              aria-label={formatTemplate(copy.agentToggleLabel, {
                                name: festival.name,
                              })}
                            >
                              {festival.isRelevant ? copy.applyActionActive : copy.applyAction}
                            </Button>
                            <div className="flex items-center justify-between gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleSelectFestival(festival)
                              }}
                            >
                              {copy.details}
                            </Button>
                            {festival.website && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                onClick={(event) => event.stopPropagation()}
                              >
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <FestivalTable
                  festivals={sortedFestivals}
                  onToggleRelevant={handleToggleRelevant}
                  onSelectFestival={handleSelectFestival}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              </div>

              {/* Drawer */}
              <FestivalDrawer
                festival={selectedFestival}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onToggleRelevant={handleToggleRelevant}
              />
            </>
          )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const unstable_settings = {
  // Ensure the component is wrapped in a Suspense boundary
  suspense: true,
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <FestivalsPage />
    </Suspense>
  )
}
