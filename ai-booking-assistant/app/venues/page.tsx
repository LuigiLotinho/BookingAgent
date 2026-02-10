"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { VenueTable } from "@/components/venue-table"
import { VenueDrawer } from "@/components/venue-drawer"
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
import { type Venue } from "@/lib/mock-data"
import { venueService } from "@/lib/services/venue-service"
import { processVenueApplicationAction } from "@/lib/actions/application-actions"
import {
  Search,
  Filter,
  CheckCircle,
  X,
  Loader2,
  MapPin,
  Mail,
  FileText,
  HelpCircle,
  ExternalLink,
  Users,
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
  getVenueTypeLabel,
  getVenueStatusLabel,
  getSourceLabel,
} from "@/lib/i18n"

type SortField =
  | "relevant"
  | "name"
  | "location"
  | "venueType"
  | "capacity"
  | "genre"
  | "contactType"
  | "status"
  | "source"
  | "website"
type SortDirection = "asc" | "desc"

const statusOrder = { Neu: 1, Freigegeben: 2, Ignoriert: 3 }

const VenuesPage = () => {
  const { language, locale, formatNumber } = useLanguage()

  const copy = {
    DE: {
      title: "Veranstaltungsorte",
      subtitle: "Aktiviere den automatischen Bewerbungs-Agent fuer passende Veranstaltungsorte.",
      searchPlaceholder: "Veranstaltungsort oder Ort suchen...",
      country: "Land",
      allCountries: "Alle Laender",
      status: "Status",
      allStatus: "Alle Status",
      type: "Typ",
      allTypes: "Alle Typen",
      filter: "Filter",
      done: "Fertig",
      sortBy: "Sortieren nach",
      sortPlaceholder: "Sortierung",
      sortDirection: "Richtung",
      ascending: "Aufsteigend",
      descending: "Absteigend",
      agentActive: "Agent aktiv",
      venue: "Veranstaltungsort",
      location: "Ort",
      capacity: "Kapazitaet",
      genres: "Genres",
      contact: "Kontakt",
      source: "Quelle",
      links: "Links",
      websiteAria: "Website von {name} oeffnen",
      markAllRelevant: "Alle als relevant markieren",
      ignoreAll: "Alle ignorieren",
      venuesShown: "{count} Veranstaltungsorte angezeigt",
      emptyTitle: "Keine Veranstaltungsorte gefunden.",
      emptyHint: "Der Agent sucht aktuell nach passenden Veranstaltungsorten.",
      details: "Details",
      agentToggleLabel: "Agent fuer {name} aktivieren",
      locationLabel: "Ort",
      contactLabel: "Kontakt",
      applyAction: "Automatische Bewerbung aktivieren",
      applyActionActive: "Automatische Bewerbung aktiv",
    },
    EN: {
      title: "Venues",
      subtitle: "Enable the automatic application agent for suitable venues.",
      searchPlaceholder: "Search venue or location...",
      country: "Country",
      allCountries: "All countries",
      status: "Status",
      allStatus: "All status",
      type: "Type",
      allTypes: "All types",
      filter: "Filter",
      done: "Done",
      sortBy: "Sort by",
      sortPlaceholder: "Sorting",
      sortDirection: "Direction",
      ascending: "Ascending",
      descending: "Descending",
      agentActive: "Agent active",
      venue: "Venue",
      location: "Location",
      capacity: "Capacity",
      genres: "Genres",
      contact: "Contact",
      source: "Source",
      links: "Links",
      websiteAria: "Open website for {name}",
      markAllRelevant: "Mark all as relevant",
      ignoreAll: "Ignore all",
      venuesShown: "{count} venues shown",
      emptyTitle: "No venues found.",
      emptyHint: "The agent is currently searching for suitable venues.",
      details: "Details",
      agentToggleLabel: "Activate agent for {name}",
      locationLabel: "Location",
      contactLabel: "Contact",
      applyAction: "Enable automatic application",
      applyActionActive: "Automatic application active",
    },
    ES: {
      title: "Lugares",
      subtitle: "Activa el agente automatico de solicitudes para lugares adecuados.",
      searchPlaceholder: "Buscar lugar o ubicacion...",
      country: "Pais",
      allCountries: "Todos los paises",
      status: "Estado",
      allStatus: "Todos los estados",
      type: "Tipo",
      allTypes: "Todos los tipos",
      filter: "Filtro",
      done: "Listo",
      sortBy: "Ordenar por",
      sortPlaceholder: "Orden",
      sortDirection: "Direccion",
      ascending: "Ascendente",
      descending: "Descendente",
      agentActive: "Agente activo",
      venue: "Lugar",
      location: "Lugar",
      capacity: "Capacidad",
      genres: "Generos",
      contact: "Contacto",
      source: "Fuente",
      links: "Enlaces",
      websiteAria: "Abrir sitio web de {name}",
      markAllRelevant: "Marcar todos como relevantes",
      ignoreAll: "Ignorar todos",
      venuesShown: "{count} lugares mostrados",
      emptyTitle: "No se encontraron lugares.",
      emptyHint: "El agente esta buscando lugares adecuados.",
      details: "Detalles",
      agentToggleLabel: "Activar agente para {name}",
      locationLabel: "Lugar",
      contactLabel: "Contacto",
      applyAction: "Activar solicitud automatica",
      applyActionActive: "Solicitud automatica activa",
    },
  }[language]

  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  useEffect(() => {
    async function loadVenues() {
      try {
        const data = await venueService.getVenues()
        setVenues(data)
      } catch (error) {
        console.error("Error loading venues:", error)
      } finally {
        setLoading(false)
      }
    }
    loadVenues()
  }, [])

  const filteredVenues = venues.filter((venue) => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCountry = countryFilter === "all" || venue.country === countryFilter
    const matchesStatus = statusFilter === "all" || venue.status === statusFilter
    const matchesType = typeFilter === "all" || venue.venueType === typeFilter
    return matchesSearch && matchesCountry && matchesStatus && matchesType
  })

  const sortedVenues = [...filteredVenues].sort((a, b) => {
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
      case "venueType":
        comparison = a.venueType.localeCompare(b.venueType)
        break
      case "capacity":
        comparison = (a.capacity || 0) - (b.capacity || 0)
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

  const handleToggleRelevant = async (venueId: string) => {
    const venue = venues.find(v => v.id === venueId)
    if (!venue) return

    const newRelevant = !venue.isRelevant
    
    // Optimistic update
    setVenues((prev) =>
      prev.map((v) =>
        v.id === venueId
          ? { ...v, isRelevant: newRelevant, status: newRelevant ? "Freigegeben" : "Neu" as any }
          : v
      )
    )

    try {
      await venueService.toggleRelevance(venueId, newRelevant)
      if (newRelevant) {
        // Process application for venue when marked as relevant
        processVenueApplicationAction(venueId)
      }
    } catch (error) {
      console.error("Error updating relevance:", error)
      // Revert if needed
    }
  }

  const handleSelectVenue = (venue: Venue) => {
    setSelectedVenue(venue)
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
    const updatePromises = filteredVenues
      .filter(v => !v.isRelevant)
      .map(v => venueService.toggleRelevance(v.id, true))

    // Optimistic update
    setVenues((prev) =>
      prev.map((v) =>
        filteredVenues.some((vv) => vv.id === v.id)
          ? { ...v, isRelevant: true, status: "Freigegeben" as any }
          : v
      )
    )

    try {
      await Promise.all(updatePromises)
    } catch (error) {
      console.error("Error marking all relevant:", error)
    }
  }

  const handleIgnoreAll = async () => {
    setVenues((prev) =>
      prev.map((v) =>
        filteredVenues.some((vv) => vv.id === v.id) && !v.isRelevant
          ? { ...v, status: "Ignoriert" as any }
          : v
      )
    )
  }

  const countries = [...new Set(venues.map((v) => v.country))]
  const venueTypes = [...new Set(venues.map((v) => v.venueType))]

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

  const getStatusBadge = (status: Venue["status"]) => {
    switch (status) {
      case "Neu":
        return <Badge variant="secondary">{getVenueStatusLabel(status, language)}</Badge>
      case "Freigegeben":
        return (
          <Badge className="bg-success/20 text-success hover:bg-success/30">
            {getVenueStatusLabel(status, language)}
          </Badge>
        )
      case "Ignoriert":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {getVenueStatusLabel(status, language)}
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
                    <SelectItem value="Neu">{getVenueStatusLabel("Neu", language)}</SelectItem>
                    <SelectItem value="Freigegeben">{getVenueStatusLabel("Freigegeben", language)}</SelectItem>
                    <SelectItem value="Ignoriert">{getVenueStatusLabel("Ignoriert", language)}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={copy.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allTypes}</SelectItem>
                    {venueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getVenueTypeLabel(type, language)}
                      </SelectItem>
                    ))}
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
                        <SelectItem value="Neu">{getVenueStatusLabel("Neu", language)}</SelectItem>
                        <SelectItem value="Freigegeben">{getVenueStatusLabel("Freigegeben", language)}</SelectItem>
                        <SelectItem value="Ignoriert">{getVenueStatusLabel("Ignoriert", language)}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={copy.type} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{copy.allTypes}</SelectItem>
                        {venueTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getVenueTypeLabel(type, language)}
                          </SelectItem>
                        ))}
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
                    <SelectItem value="name">{copy.venue}</SelectItem>
                    <SelectItem value="location">{copy.location}</SelectItem>
                    <SelectItem value="venueType">{copy.type}</SelectItem>
                    <SelectItem value="capacity">{copy.capacity}</SelectItem>
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
              {formatTemplate(copy.venuesShown, {
                count: formatNumber(filteredVenues.length),
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
                {sortedVenues.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                    <p className="text-muted-foreground">{copy.emptyTitle}</p>
                    <p className="text-sm text-muted-foreground">{copy.emptyHint}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedVenues.map((venue) => (
                      <Card
                        key={venue.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectVenue(venue)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold">{venue.name}</h3>
                                {getStatusBadge(venue.status)}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={venue.source === "Similar Band" ? "default" : "outline"} className="text-xs">
                                  {getSourceLabel(venue.source, language)}
                                </Badge>
                                <Badge variant="outline">{getVenueTypeLabel(venue.venueType, language)}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4" />
                            <span>{venue.location}, {venue.country}</span>
                            <span className="ml-auto text-xs">{venue.distance} km</span>
                          </div>
                          {venue.capacity && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{copy.capacity}: {venue.capacity}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {getContactIcon(venue.contactType)}
                            <span>{getContactTypeLabel(venue.contactType, language)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {venue.genres.slice(0, 2).map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                            {venue.genres.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{venue.genres.length - 2}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 pt-2">
                            <Button
                              size="lg"
                              className={
                                venue.isRelevant
                                  ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "w-full"
                              }
                              variant={venue.isRelevant ? "default" : "outline"}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleToggleRelevant(venue.id)
                              }}
                              aria-label={formatTemplate(copy.agentToggleLabel, {
                                name: venue.name,
                              })}
                            >
                              {venue.isRelevant ? copy.applyActionActive : copy.applyAction}
                            </Button>
                            <div className="flex items-center justify-between gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleSelectVenue(venue)
                              }}
                            >
                              {copy.details}
                            </Button>
                            {venue.website && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                onClick={(event) => event.stopPropagation()}
                              >
                                <a
                                  href={venue.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={formatTemplate(copy.websiteAria, {
                                    name: venue.name,
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
                <VenueTable
                  venues={sortedVenues}
                  onToggleRelevant={handleToggleRelevant}
                  onSelectVenue={handleSelectVenue}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              </div>

              {/* Drawer */}
              <VenueDrawer
                venue={selectedVenue}
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
  suspense: true,
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <VenuesPage />
    </Suspense>
  )
}
