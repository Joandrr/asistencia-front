"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, Users, FolderUp } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"

const ADMIN_ONLY_URLS = new Set(["/users", "/modules"])

// This is sample data.
const data = {
  user: {
    name: "Administrador",
    email: "admin@institucion.edu",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Institución",
      logo: (
        <GalleryVerticalEndIcon
        />
      ),
      plan: "Panel académico",
    },
    {
      name: "Sede Central",
      logo: (
        <AudioLinesIcon
        />
      ),
      plan: "Unidad educativa",
    },
    {
      name: "Docentes",
      logo: (
        <TerminalIcon
        />
      ),
      plan: "Equipo",
    },
  ],
  navMain: [
    {
      title: "Asistencia",
      url: "#",
      icon: (
        <TerminalSquareIcon
        />
      ),
      isActive: true,
      items: [
        {
          title: "Registro diario",
          url: "#",
        },
        {
          title: "Justificaciones",
          url: "#",
        },
        {
          title: "Resumen semanal",
          url: "#",
        },
      ],
    },
    {
      title: "Académico",
      url: "#",
      icon: (
        <BotIcon
        />
      ),
      items: [
        {
          title: "Cursos",
          url: "#",
        },
        {
          title: "Docentes",
          url: "#",
        },
      ],
    },
    {
      title: "Reportes",
      url: "#",
      icon: (
        <BookOpenIcon
        />
      ),
      items: [
        {
          title: "Asistencia por curso",
          url: "#",
        },
        {
          title: "Asistencia mensual",
          url: "#",
        },
        {
          title: "Exportaciones",
          url: "#",
        },
      ],
    },
    {
      title: "Usuarios",
      url: "/users",
      icon: <Users />,
    },
    {
      title: "Nuevo módulo",
      url: "/modules",
      icon: <FolderUp />,
    },
    {
      title: "Configuración",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Primaria",
      url: "#",
      icon: (
        <FrameIcon
        />
      ),
    },
    {
      name: "Secundaria",
      url: "#",
      icon: (
        <PieChartIcon
        />
      ),
    },
    {
      name: "Actividades",
      url: "#",
      icon: (
        <MapIcon
        />
      ),
    },
  ],
}

export function AppSidebar({ onLogout, onProfile, ...props }: React.ComponentProps<typeof Sidebar> & { onLogout?: () => void; onProfile?: () => void }) {
  const user = useAuthStore((state) => state.user)
  const navMain = data.navMain.filter((group) => !ADMIN_ONLY_URLS.has(group.url) || user?.role === "admin")
  const displayName = user?.fullName || user?.registrationNo || "Usuario"
  const displayRole = user?.role === "admin" ? "Administrador" : "Estudiante"
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...data.user, name: displayName, email: `${displayRole} · ${user?.registrationNo ?? ""}` }} onLogout={onLogout} onProfile={onProfile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
