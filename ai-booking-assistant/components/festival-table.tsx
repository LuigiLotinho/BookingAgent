"use client"

import React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Festival } from "@/lib/mock-data"
import { MapPin, Calendar, Mail, FileText, HelpCircle, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface FestivalTableProps {
  festivals: Festival[]
  onToggleRelevant: (id: string) => void
  onSelectFestival: (festival: Festival) => void
}

type SortField = "name" | "distance" | "dateStart" | "size" | "genre" | null
type SortDirection = "asc" | "desc"

const sizeOrder = { Klein: 1, Mittel: 2, Gross: 3 }

export function FestivalTable({
  festivals,
  onToggleRelevant,
  onSelectFestival,
}: FestivalTableProps) {
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedFestivals = [...festivals].sort((a, b) => {
    if (!sortField) return 0
    
    let comparison = 0
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "distance":
        comparison = a.distance - b.distance
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
    }
    return sortDirection === "asc" ? comparison : -comparison
  })

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </Button>
  )

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Agent aktiv</TableHead>
            <TableHead>
              <SortableHeader field="name">Festival</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="distance">Ort</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="dateStart">Datum</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="size">Groesse</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="genre">Genres</SortableHeader>
            </TableHead>
            <TableHead>Kontakt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quelle</TableHead>
            <TableHead>Links</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFestivals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-32 text-center">
                <p className="text-muted-foreground">Keine Festivals gefunden.</p>
                <p className="text-sm text-muted-foreground">Der Agent sucht aktuell nach passenden Festivals.</p>
              </TableCell>
            </TableRow>
          ) : (
            sortedFestivals.map((festival) => (
              <TableRow
                key={festival.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectFestival(festival)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={festival.isRelevant}
                    onCheckedChange={() => onToggleRelevant(festival.id)}
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
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {getContactIcon(festival.contactType)}
                    <span className="text-sm">{festival.contactType}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(festival.status)}</TableCell>
                <TableCell>
                  <Badge variant={festival.source === "Similar Band" ? "default" : "outline"} className="text-xs">
                    {festival.source}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={festival.website} target="_blank" rel="noopener noreferrer" aria-label={`Website von ${festival.name}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
