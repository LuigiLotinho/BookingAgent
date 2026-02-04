"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
  Globe,
} from "lucide-react"

export default function SettingsPage() {
  const { language } = useLanguage()

  const copy = {
    DE: {
      title: "Einstellungen",
      subtitle: "Konfiguriere den Agent und deine Praeferenzen.",
      save: "Speichern",
      saved: "Gespeichert",
      savedDesc: "Deine Einstellungen wurden erfolgreich aktualisiert.",
      error: "Fehler",
      errorDesc: "Einstellungen konnten nicht gespeichert werden.",
      languageTitle: "Sprache",
      languageDesc: "Aendere die Sprache der Benutzeroberflaeche.",
      mailTitle: "E-Mail Versand (Gmail)",
      mailDesc: "Diese Daten werden verwendet, um Bewerbungen in deinem Namen zu versenden.",
      gmailAddress: "Gmail Adresse",
      appPassword: "Google App-Passwort",
      appPasswordHint: "Nutze ein 16-stelliges App-Passwort aus deinem Google-Konto.",
      agentTitle: "Agent-Kontrolle",
      agentDesc: "Steuere den automatischen Booking-Agenten.",
      agentActive: "Agent aktiv",
      agentActiveHint: "Der Agent sucht aktiv nach Festivals und sendet Bewerbungen.",
      similarBand: "Similar-Band-Feature",
      similarBandHint: "Finde Festivals basierend auf aehnlichen Bands.",
      notificationsTitle: "Benachrichtigungen",
      notificationsDesc: "Wann moechtest du benachrichtigt werden?",
      notifyNew: "Neue Festivals",
      notifyNewHint: "Wenn neue relevante Festivals gefunden werden.",
      notifySent: "Bewerbung gesendet",
      notifySentHint: "Wenn eine Bewerbung erfolgreich versendet wurde.",
      notifyError: "Fehler",
      notifyErrorHint: "Wenn ein Fehler bei einer Bewerbung auftritt.",
      securityTitle: "Sicherheit & Limits",
      securityDesc: "Begrenze die automatischen Bewerbungen.",
      maxPerMonth: "Max. Bewerbungen / Monat",
      maxPerDay: "Max. Bewerbungen / Tag",
      limitsHint:
        "Diese Limits schuetzen dich davor, zu viele Bewerbungen auf einmal zu senden. Der Agent wird automatisch pausieren, wenn ein Limit erreicht ist.",
    },
    EN: {
      title: "Settings",
      subtitle: "Configure the agent and your preferences.",
      save: "Save",
      saved: "Saved",
      savedDesc: "Your settings were updated successfully.",
      error: "Error",
      errorDesc: "Settings could not be saved.",
      languageTitle: "Language",
      languageDesc: "Change the interface language.",
      mailTitle: "Email sending (Gmail)",
      mailDesc: "These details are used to send applications on your behalf.",
      gmailAddress: "Gmail address",
      appPassword: "Google app password",
      appPasswordHint: "Use a 16-character app password from your Google account.",
      agentTitle: "Agent control",
      agentDesc: "Control the automatic booking agent.",
      agentActive: "Agent active",
      agentActiveHint: "The agent searches for festivals and sends applications.",
      similarBand: "Similar band feature",
      similarBandHint: "Find festivals based on similar bands.",
      notificationsTitle: "Notifications",
      notificationsDesc: "When do you want to be notified?",
      notifyNew: "New festivals",
      notifyNewHint: "When new relevant festivals are found.",
      notifySent: "Application sent",
      notifySentHint: "When an application was sent successfully.",
      notifyError: "Errors",
      notifyErrorHint: "When an error occurs for an application.",
      securityTitle: "Security & limits",
      securityDesc: "Limit automated applications.",
      maxPerMonth: "Max applications / month",
      maxPerDay: "Max applications / day",
      limitsHint:
        "These limits protect you from sending too many applications at once. The agent will pause automatically when a limit is reached.",
    },
    ES: {
      title: "Ajustes",
      subtitle: "Configura el agente y tus preferencias.",
      save: "Guardar",
      saved: "Guardado",
      savedDesc: "Tus ajustes se actualizaron correctamente.",
      error: "Error",
      errorDesc: "No se pudieron guardar los ajustes.",
      languageTitle: "Idioma",
      languageDesc: "Cambia el idioma de la interfaz.",
      mailTitle: "Envio de correo (Gmail)",
      mailDesc: "Estos datos se usan para enviar solicitudes en tu nombre.",
      gmailAddress: "Direccion Gmail",
      appPassword: "Contrasena de app de Google",
      appPasswordHint: "Usa una contrasena de app de 16 caracteres de tu cuenta Google.",
      agentTitle: "Control del agente",
      agentDesc: "Controla el agente automatico de reservas.",
      agentActive: "Agente activo",
      agentActiveHint: "El agente busca festivales y envia solicitudes.",
      similarBand: "Funcion de bandas similares",
      similarBandHint: "Encuentra festivales basados en bandas similares.",
      notificationsTitle: "Notificaciones",
      notificationsDesc: "Cuando quieres recibir avisos?",
      notifyNew: "Nuevos festivales",
      notifyNewHint: "Cuando se encuentran festivales relevantes nuevos.",
      notifySent: "Solicitud enviada",
      notifySentHint: "Cuando una solicitud se envia correctamente.",
      notifyError: "Errores",
      notifyErrorHint: "Cuando ocurre un error con una solicitud.",
      securityTitle: "Seguridad y limites",
      securityDesc: "Limita las solicitudes automaticas.",
      maxPerMonth: "Max solicitudes / mes",
      maxPerDay: "Max solicitudes / dia",
      limitsHint:
        "Estos limites te protegen de enviar demasiadas solicitudes a la vez. El agente se pausara automaticamente cuando se alcance un limite.",
    },
  }[language]
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
        title: copy.saved,
        description: copy.savedDesc,
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: copy.error,
        description: copy.errorDesc,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-h-screen">
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-3xl">
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
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {copy.save}
                </Button>
              </div>
            </div>

          <div className="space-y-6">
            {/* E-Mail Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  {copy.mailTitle}
                </CardTitle>
                <CardDescription>
                  {copy.mailDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gmail_user">{copy.gmailAddress}</Label>
                    <Input
                      id="gmail_user"
                      type="email"
                      placeholder="band@gmail.com"
                      value={settings.gmail_user || ""}
                      onChange={(e) => setSettings({ ...settings, gmail_user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gmail_app_password" data-title="Google App-Passwort (16 Zeichen)">
                      {copy.appPassword}
                    </Label>
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
                      {copy.appPasswordHint}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-primary" />
                  {copy.languageTitle}
                </CardTitle>
                <CardDescription>{copy.languageDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageSwitcher />
              </CardContent>
            </Card>

            {/* Agent Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  {copy.agentTitle}
                </CardTitle>
                <CardDescription>
                  {copy.agentDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{copy.agentActive}</Label>
                    <p className="text-sm text-muted-foreground">
                      {copy.agentActiveHint}
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
                      {copy.similarBand}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {copy.similarBandHint}
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
                  {copy.notificationsTitle}
                </CardTitle>
                <CardDescription>
                  {copy.notificationsDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{copy.notifyNew}</Label>
                    <p className="text-sm text-muted-foreground">
                      {copy.notifyNewHint}
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
                    <Label>{copy.notifySent}</Label>
                    <p className="text-sm text-muted-foreground">
                      {copy.notifySentHint}
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
                    <Label>{copy.notifyError}</Label>
                    <p className="text-sm text-muted-foreground">
                      {copy.notifyErrorHint}
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
                  {copy.securityTitle}
                </CardTitle>
                <CardDescription>
                  {copy.securityDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="max_per_month">{copy.maxPerMonth}</Label>
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
                    <Label htmlFor="max_per_day">{copy.maxPerDay}</Label>
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
                    {copy.limitsHint}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
