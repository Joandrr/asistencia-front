/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and layout component together. */
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { hasValidSession, useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: () => {
    if (!hasValidSession()) throw redirect({ to: '/' })
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  return (
    <SidebarProvider>
      <AppSidebar onLogout={() => { logout(); void navigate({ to: '/' }) }} />
      <SidebarInset>
        <header className="dashboard-header">
          <SidebarTrigger />
          <div className="header-copy">
            <p className="eyebrow">PANEL ACADÉMICO</p>
            <h1>Asistencia</h1>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
