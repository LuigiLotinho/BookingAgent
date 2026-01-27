"use client"

import { AppSidebar } from "@/components/app-sidebar"
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
  Zap,
  MapPin,
  Calendar,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function DashboardPage() {
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

  const loadDashboardData = async () => {
    try {
      const [fetchedStats, fetchedFestivals] = await Promise.all([
        festivalService.getStats(),
        festivalService.getNewFestivals(5)
      ])
      
      setStats(fetchedStats)
      setAgentActive(fetchedStats.agentActive)
      setFestivals(fetchedFestivals)
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
    const month = startDate.toLocaleDateString("de-DE", { month: "2-digit" })
    const year = startDate.getFullYear()
    return `${startDay}.–${endDay}.${month}.${year}`
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
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">
                Willkommen zurueck. Hier ist der aktuelle Stand.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleRunResearch} 
                variant="outline" 
                size="sm" 
                disabled={searching || loading}
                className="gap-2"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Festivals suchen
              </Button>
              <Card className="flex items-center gap-4 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Bewerbungs-Agent</span>
                </div>
                <Switch
                  checked={agentActive}
                  onCheckedChange={setAgentActive}
                />
                <Badge variant={agentActive ? "default" : "secondary"}>
                  {agentActive ? "Aktiviert" : "Pausiert"}
                </Badge>
              </Card>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gefundene Festivals
                </CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : stats.totalFestivals}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gesamtanzahl
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Relevante Festivals
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : stats.relevantFestivals}
                </div>
                <p className="text-xs text-muted-foreground">
                  Von dir freigegeben
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bewerbungen gesendet
                </CardTitle>
                <Send className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : stats.applicationsSent}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gesamt gesendet
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Festivals Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-5 w-5 text-primary" />
                Neu gefundene Festivals
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/festivals">
                  Alle anzeigen
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
                    Es gibt {festivals.length} neue Festivals, die auf deine Freigabe warten.
                  </p>
                  <div className="rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Agent aktiv</TableHead>
                          <TableHead>Festival</TableHead>
                          <TableHead>Ort</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Groesse</TableHead>
                          <TableHead>Genres</TableHead>
                          <TableHead>Links</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {festivals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <p className="text-muted-foreground">Keine neuen Festivals gefunden.</p>
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
                                <a href={festival.website} target="_blank" rel="noopener noreferrer" aria-label={`Website von ${festival.name}`}>
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
