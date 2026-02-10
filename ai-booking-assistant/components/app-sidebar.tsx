"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Music,
  Send,
  User,
  Settings,
  Zap,
  Building2,
} from "lucide-react"

export function AppSidebar() {
  const pathname = usePathname()
  const { language } = useLanguage()

  const copy = {
    DE: {
      dashboard: "Dashboard",
      festivals: "Festivals",
      venues: "Veranstaltungsorte",
      applications: "Bewerbungen",
      profile: "Band-Profil",
      settings: "Einstellungen",
      agentStatus: "Agent Status",
      active: "Aktiv",
    },
    EN: {
      dashboard: "Dashboard",
      festivals: "Festivals",
      venues: "Venues",
      applications: "Applications",
      profile: "Band Profile",
      settings: "Settings",
      agentStatus: "Agent Status",
      active: "Active",
    },
    ES: {
      dashboard: "Panel",
      festivals: "Festivales",
      venues: "Lugares",
      applications: "Solicitudes",
      profile: "Perfil de la Banda",
      settings: "Ajustes",
      agentStatus: "Estado del Agente",
      active: "Activo",
    },
  }[language]

  const navigation = [
    { name: copy.dashboard, href: "/", icon: LayoutDashboard },
    { name: copy.festivals, href: "/festivals", icon: Music },
    { name: copy.venues, href: "/venues", icon: Building2 },
    { name: copy.applications, href: "/applications", icon: Send },
    { name: copy.profile, href: "/profile", icon: User },
    { name: copy.settings, href: "/settings", icon: Settings },
  ]

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-sidebar-border flex h-16 flex-row items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">BandBooker</span>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                  <Link href={item.href} className="gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">{copy.agentStatus}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-sm font-medium text-foreground">{copy.active}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
