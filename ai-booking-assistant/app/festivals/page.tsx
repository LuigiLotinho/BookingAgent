"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { FestivalTable } from "@/components/festival-table"
import { FestivalDrawer } from "@/components/festival-drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, Filter, CheckCircle, X, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Festivals</h1>
            <p className="text-muted-foreground">
              Aktiviere den automatischen Bewerbungs-Agent fuer passende Festivals.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Festival oder Ort suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

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

          {/* Bulk Actions */}
          <div className="mb-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllRelevant}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Alle als relevant markieren
            </Button>
            <Button variant="outline" size="sm" onClick={handleIgnoreAll}>
              <X className="mr-2 h-4 w-4" />
              Alle ignorieren
            </Button>
            <span className="ml-4 text-sm text-muted-foreground">
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
              <FestivalTable
                festivals={filteredFestivals}
                onToggleRelevant={handleToggleRelevant}
                onSelectFestival={handleSelectFestival}
              />

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
      </main>
    </div>
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
