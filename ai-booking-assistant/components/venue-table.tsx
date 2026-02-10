"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/components/language-provider"
import {
  formatTemplate,
  getContactTypeLabel,
  getVenueTypeLabel,
  getVenueStatusLabel,
  getSourceLabel,
  getApplyFrequencyLabel,
} from "@/lib/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Venue } from "@/lib/mock-data"
import { MapPin, Mail, FileText, HelpCircle, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Users, Calendar } from "lucide-react"

interface VenueTableProps {
  venues: Venue[]
  onToggleRelevant: (id: string) => void
  onSelectVenue: (venue: Venue) => void
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField) => void
}

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

export function VenueTable({
  venues,
  onToggleRelevant,
  onSelectVenue,
  sortField,
  sortDirection,
  onSortChange,
}: VenueTableProps) {
  const { language } = useLanguage()

  const copy = {
    DE: {
      agentActive: "Agent aktiv",
      venue: "Veranstaltungsort",
      location: "Ort",
      type: "Typ",
      capacity: "Kapazitaet",
      genres: "Genres",
      contact: "Kontakt",
      status: "Status",
      source: "Quelle",
      links: "Links",
      websiteAria: "Website von {name} oeffnen",
      emptyTitle: "Keine Veranstaltungsorte gefunden.",
      emptyHint: "Der Agent sucht aktuell nach passenden Veranstaltungsorten.",
    },
    EN: {
      agentActive: "Agent active",
      venue: "Venue",
      location: "Location",
      type: "Type",
      capacity: "Capacity",
      genres: "Genres",
      contact: "Contact",
      status: "Status",
      source: "Source",
      links: "Links",
      websiteAria: "Open website for {name}",
      emptyTitle: "No venues found.",
      emptyHint: "The agent is currently searching for suitable venues.",
    },
    ES: {
      agentActive: "Agente activo",
      venue: "Lugar",
      location: "Lugar",
      type: "Tipo",
      capacity: "Capacidad",
      genres: "Generos",
      contact: "Contacto",
      status: "Estado",
      source: "Fuente",
      links: "Enlaces",
      websiteAria: "Abrir sitio web de {name}",
      emptyTitle: "No se encontraron lugares.",
      emptyHint: "El agente esta buscando lugares adecuados.",
    },
  }[language]

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
              <SortableHeader field="name">{copy.venue}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="location">{copy.location}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="venueType">{copy.type}</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="capacity">{copy.capacity}</SortableHeader>
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
          {venues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-32 text-center">
                <p className="text-muted-foreground">{copy.emptyTitle}</p>
                <p className="text-sm text-muted-foreground">{copy.emptyHint}</p>
              </TableCell>
            </TableRow>
          ) : (
            venues.map((venue) => (
              <TableRow
                key={venue.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectVenue(venue)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={venue.isRelevant}
                    onCheckedChange={() => onToggleRelevant(venue.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{venue.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{venue.location}, {venue.country}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{venue.distance} km</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getVenueTypeLabel(venue.venueType, language)}</Badge>
                </TableCell>
                <TableCell>
                  {venue.capacity ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{venue.capacity}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {getContactIcon(venue.contactType)}
                    <span className="text-sm">
                      {getContactTypeLabel(venue.contactType, language)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(venue.status)}</TableCell>
                <TableCell>
                  <Badge variant={venue.source === "Similar Band" ? "default" : "outline"} className="text-xs">
                    {getSourceLabel(venue.source, language)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" asChild>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
