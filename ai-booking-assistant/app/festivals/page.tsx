"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { FestivalTable } from "@/components/festival-table"
import { FestivalDrawer } from "@/components/festival-drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
    const month = startDate.toLocaleDateString("de-DE", { month: "2-digit" })
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
        return <Badge variant="secondary">Neu</Badge>
      case "Freigegeben":
        return <Badge className="bg-success/20 text-success hover:bg-success/30">Freigegeben</Badge>
      case "Ignoriert":
        return <Badge variant="outline" className="text-muted-foreground">Ignoriert</Badge>
    }
  }

  const getSizeBadge = (size: Festival["size"]) => {
    switch (size) {
      case "Klein":
        return <Badge variant="outline">Klein</Badge>
      case "Mittel":
        return <Badge variant="outline">Mittel</Badge>
      case "Gross":
        return <Badge variant="outline" className="border-primary/50 text-primary">Gross</Badge>
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
                  <h1 className="text-2xl font-bold text-foreground">Festivals</h1>
                  <p className="text-muted-foreground">
                    Aktiviere den automatischen Bewerbungs-Agent fuer passende Festivals.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Festival oder Ort suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="hidden items-center gap-4 md:flex">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Land" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Laender</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="Neu">Neu</SelectItem>
                    <SelectItem value="Freigegeben">Freigegeben</SelectItem>
                    <SelectItem value="Ignoriert">Ignoriert</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Groesse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Groessen</SelectItem>
                    <SelectItem value="Klein">Klein</SelectItem>
                    <SelectItem value="Mittel">Mittel</SelectItem>
                    <SelectItem value="Gross">Gross</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <Button variant="outline" className="md:hidden" onClick={() => setFilterOpen(true)}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 flex flex-col gap-4">
                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                      <SelectTrigger className="w-full">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Land" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Laender</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Status</SelectItem>
                        <SelectItem value="Neu">Neu</SelectItem>
                        <SelectItem value="Freigegeben">Freigegeben</SelectItem>
                        <SelectItem value="Ignoriert">Ignoriert</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sizeFilter} onValueChange={setSizeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Groesse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Groessen</SelectItem>
                        <SelectItem value="Klein">Klein</SelectItem>
                        <SelectItem value="Mittel">Mittel</SelectItem>
                        <SelectItem value="Gross">Gross</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={() => setFilterOpen(false)}>Fertig</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <span className="text-sm text-muted-foreground">Sortieren nach</span>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Sortierung" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevant">Agent aktiv</SelectItem>
                    <SelectItem value="name">Festival</SelectItem>
                    <SelectItem value="location">Ort</SelectItem>
                    <SelectItem value="dateStart">Datum</SelectItem>
                    <SelectItem value="size">Groesse</SelectItem>
                    <SelectItem value="genre">Genres</SelectItem>
                    <SelectItem value="contactType">Kontakt</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="source">Quelle</SelectItem>
                    <SelectItem value="website">Links</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Richtung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Aufsteigend</SelectItem>
                  <SelectItem value="desc">Absteigend</SelectItem>
                </SelectContent>
              </Select>
            </div>

          {/* Bulk Actions */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" size="sm" onClick={handleMarkAllRelevant}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Alle als relevant markieren
            </Button>
            <Button variant="outline" size="sm" onClick={handleIgnoreAll}>
              <X className="mr-2 h-4 w-4" />
              Alle ignorieren
            </Button>
            <span className="text-sm text-muted-foreground sm:ml-4">
              {filteredFestivals.length} Festivals angezeigt
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
                    <p className="text-muted-foreground">Keine Festivals gefunden.</p>
                    <p className="text-sm text-muted-foreground">Der Agent sucht aktuell nach passenden Festivals.</p>
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
                                  {festival.source}
                                </Badge>
                                {getSizeBadge(festival.size)}
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={festival.isRelevant}
                                onCheckedChange={() => handleToggleRelevant(festival.id)}
                                aria-label={`Agent fuer ${festival.name} aktivieren`}
                              />
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
                            <span>{festival.contactType}</span>
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
                          <div className="flex items-center justify-between gap-3 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleSelectFestival(festival)
                              }}
                            >
                              Details
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
                                  aria-label={`Website von ${festival.name}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
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
