"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { settingsService, type AppSettings } from "@/lib/services/settings-service"
import { useToast } from "@/hooks/use-toast"
import {
  Zap,
  Bell,
  Shield,
  Users,
  Save,
  Mail,
  Lock,
  Loader2,
} from "lucide-react"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  
  const [settings, setSettings] = useState<AppSettings>({
    gmail_user: "",
    gmail_app_password: "",
    agent_active: true,
    similar_band_feature: true,
    notify_new_festivals: true,
    notify_application_sent: true,
    notify_errors: true,
    max_per_month: 50,
    max_per_day: 5,
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await settingsService.getSettings()
        if (data) {
          setSettings(data)
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsService.saveSettings(settings)
      toast({
        title: "Gespeichert",
        description: "Deine Einstellungen wurden erfolgreich aktualisiert.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <main className="ml-64 flex h-screen items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    )
  }

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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Speichern
            </Button>
          </div>

          <div className="space-y-6">
            {/* E-Mail Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  E-Mail Versand (Gmail)
                </CardTitle>
                <CardDescription>
                  Diese Daten werden verwendet, um Bewerbungen in deinem Namen zu versenden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gmail_user">Gmail Adresse</Label>
                    <Input
                      id="gmail_user"
                      type="email"
                      placeholder="band@gmail.com"
                      value={settings.gmail_user || ""}
                      onChange={(e) => setSettings({ ...settings, gmail_user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gmail_app_password" data-title="Google App-Passwort (16 Zeichen)">Google App-Passwort</Label>
                    <div className="relative">
                      <Input
                        id="gmail_app_password"
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={settings.gmail_app_password || ""}
                        onChange={(e) => setSettings({ ...settings, gmail_app_password: e.target.value })}
                      />
                      <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Nutze ein 16-stelliges App-Passwort aus deinem Google-Konto.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    checked={settings.agent_active}
                    onCheckedChange={(checked) => setSettings({ ...settings, agent_active: checked })}
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
                    checked={settings.similar_band_feature}
                    onCheckedChange={(checked) => setSettings({ ...settings, similar_band_feature: checked })}
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
                    checked={settings.notify_new_festivals}
                    onCheckedChange={(checked) => setSettings({ ...settings, notify_new_festivals: checked })}
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
                    checked={settings.notify_application_sent}
                    onCheckedChange={(checked) => setSettings({ ...settings, notify_application_sent: checked })}
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
                    checked={settings.notify_errors}
                    onCheckedChange={(checked) => setSettings({ ...settings, notify_errors: checked })}
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
                    <Label htmlFor="max_per_month">Max. Bewerbungen / Monat</Label>
                    <Input
                      id="max_per_month"
                      type="number"
                      min={1}
                      max={200}
                      value={settings.max_per_month}
                      onChange={(e) => setSettings({ ...settings, max_per_month: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_per_day">Max. Bewerbungen / Tag</Label>
                    <Input
                      id="max_per_day"
                      type="number"
                      min={1}
                      max={20}
                      value={settings.max_per_day}
                      onChange={(e) => setSettings({ ...settings, max_per_day: parseInt(e.target.value) || 0 })}
                    />
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
