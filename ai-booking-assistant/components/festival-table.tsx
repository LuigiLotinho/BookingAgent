"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/components/language-provider"
import {
  formatTemplate,
  getContactTypeLabel,
  getFestivalSizeLabel,
  getFestivalStatusLabel,
  getSourceLabel,
} from "@/lib/i18n"
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
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField) => void
}

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

export function FestivalTable({
  festivals,
  onToggleRelevant,
  onSelectFestival,
  sortField,
  sortDirection,
  onSortChange,
}: FestivalTableProps) {
  const { language, locale } = useLanguage()

  const copy = {
    DE: {
      agentActive: "Agent aktiv",
      festival: "Festival",
      location: "Ort",
      date: "Datum",
      size: "Groesse",
      genres: "Genres",
      contact: "Kontakt",
      status: "Status",
      source: "Quelle",
      links: "Links",
      websiteAria: "Website von {name} oeffnen",
      emptyTitle: "Keine Festivals gefunden.",
      emptyHint: "Der Agent sucht aktuell nach passenden Festivals.",
    },
    EN: {
      agentActive: "Agent active",
      festival: "Festival",
      location: "Location",
      date: "Date",
      size: "Size",
      genres: "Genres",
      contact: "Contact",
      status: "Status",
      source: "Source",
      links: "Links",
      websiteAria: "Open website for {name}",
      emptyTitle: "No festivals found.",
      emptyHint: "The agent is currently searching for suitable festivals.",
    },
    ES: {
      agentActive: "Agente activo",
      festival: "Festival",
      location: "Lugar",
      date: "Fecha",
      size: "Tamano",
      genres: "Generos",
      contact: "Contacto",
      status: "Estado",
      source: "Fuente",
      links: "Enlaces",
      websiteAria: "Abrir sitio web de {name}",
      emptyTitle: "No se encontraron festivales.",
      emptyHint: "El agente esta buscando festivales adecuados.",
    },
  }[language]

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-transparent"
      onClick={() => onSortChange(field)}
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
            <TableHead className="w-[120px]">
              <SortableHeader field="relevant">{copy.agentActive}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="name">{copy.festival}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="location">{copy.location}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="dateStart">{copy.date}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="size">{copy.size}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="genre">{copy.genres}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="contactType">{copy.contact}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="status">{copy.status}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="source">{copy.source}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="website">{copy.links}</SortableHeader>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {festivals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-32 text-center">
                <p className="text-muted-foreground">{copy.emptyTitle}</p>
                <p className="text-sm text-muted-foreground">{copy.emptyHint}</p>
              </TableCell>
            </TableRow>
          ) : (
            festivals.map((festival) => (
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
                    <span className="text-sm">
                      {getContactTypeLabel(festival.contactType, language)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(festival.status)}</TableCell>
                <TableCell>
                  <Badge variant={festival.source === "Similar Band" ? "default" : "outline"} className="text-xs">
                    {getSourceLabel(festival.source, language)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
