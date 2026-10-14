import type { ComponentProps } from "react"
import { Link } from "@tanstack/react-router"
import { CalendarCheck2, ClipboardCheck, FolderUp, GraduationCap, History, Users } from "lucide-react"
import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"

const ADMIN_NAV: NavItem[] = [
  { title: "Asistencias", url: "/attendance", icon: <ClipboardCheck /> },
  { title: "Estudiantes", url: "/students", icon: <GraduationCap /> },
  { title: "Actividades", url: "/activities", icon: <History /> },
  { title: "Módulos", url: "/modules", icon: <FolderUp /> },
  { title: "Usuarios", url: "/users", icon: <Users /> },
]

const STUDENT_NAV: NavItem[] = [
  { title: "Mi asistencia", url: "/dashboard", icon: <CalendarCheck2 /> },
]

export function AppSidebar({
  onLogout,
  onProfile,
  ...props
}: ComponentProps<typeof Sidebar> & { onLogout: () => void; onProfile: () => void }) {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "admin"
  const displayName = user?.fullName || user?.registrationNo || "Usuario"
  const displayRole = isAdmin ? "Administrador" : "Estudiante"

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Asistencia" render={<Link to={isAdmin ? "/attendance" : "/dashboard"} />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CalendarCheck2 className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Asistencia</span>
                <span className="truncate text-xs">Panel académico</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={isAdmin ? ADMIN_NAV : STUDENT_NAV} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{ name: displayName, detail: `${displayRole} · ${user?.registrationNo ?? ""}` }}
          onLogout={onLogout}
          onProfile={onProfile}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
