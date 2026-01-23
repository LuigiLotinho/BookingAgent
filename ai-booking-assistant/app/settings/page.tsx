"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Zap,
  Bell,
  Shield,
  Users,
  Save,
} from "lucide-react"

export default function SettingsPage() {
  const [agentActive, setAgentActive] = useState(true)
  const [similarBandFeature, setSimilarBandFeature] = useState(true)
  const [notifications, setNotifications] = useState({
    newFestivals: true,
    applicationSent: true,
    errors: true,
  })
  const [limits, setLimits] = useState({
    maxPerMonth: 50,
    maxPerDay: 5,
  })

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
              <p className="text-muted-foreground">
                Konfiguriere den Agent und deine Praeferenzen.
              </p>
            </div>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Speichern
            </Button>
          </div>

          <div className="space-y-6">
            {/* Agent Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  Agent-Kontrolle
                </CardTitle>
                <CardDescription>
                  Steuere den automatischen Booking-Agenten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Agent aktiv</Label>
                    <p className="text-sm text-muted-foreground">
                      Der Agent sucht aktiv nach Festivals und sendet Bewerbungen.
                    </p>
                  </div>
                  <Switch
                    checked={agentActive}
                    onCheckedChange={setAgentActive}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Similar-Band-Feature
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Finde Festivals basierend auf aehnlichen Bands.
                    </p>
                  </div>
                  <Switch
                    checked={similarBandFeature}
                    onCheckedChange={setSimilarBandFeature}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-primary" />
                  Benachrichtigungen
                </CardTitle>
                <CardDescription>
                  Wann moechtest du benachrichtigt werden?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Neue Festivals</Label>
                    <p className="text-sm text-muted-foreground">
                      Wenn neue relevante Festivals gefunden werden.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.newFestivals}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, newFestivals: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bewerbung gesendet</Label>
                    <p className="text-sm text-muted-foreground">
                      Wenn eine Bewerbung erfolgreich versendet wurde.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.applicationSent}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, applicationSent: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Fehler</Label>
                    <p className="text-sm text-muted-foreground">
                      Wenn ein Fehler bei einer Bewerbung auftritt.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.errors}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, errors: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security & Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Sicherheit & Limits
                </CardTitle>
                <CardDescription>
                  Begrenze die automatischen Bewerbungen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxPerMonth">Max. Bewerbungen / Monat</Label>
                    <Input
                      id="maxPerMonth"
                      type="number"
                      min={1}
                      max={200}
                      value={limits.maxPerMonth}
                      onChange={(e) =>
                        setLimits((prev) => ({
                          ...prev,
                          maxPerMonth: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Aktuell: 18 von {limits.maxPerMonth} gesendet
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPerDay">Max. Bewerbungen / Tag</Label>
                    <Input
                      id="maxPerDay"
                      type="number"
                      min={1}
                      max={20}
                      value={limits.maxPerDay}
                      onChange={(e) =>
                        setLimits((prev) => ({
                          ...prev,
                          maxPerDay: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Verhindert Spam-Verdacht
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Diese Limits schuetzen dich davor, zu viele Bewerbungen auf einmal zu senden. 
                    Der Agent wird automatisch pausieren, wenn ein Limit erreicht ist.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
