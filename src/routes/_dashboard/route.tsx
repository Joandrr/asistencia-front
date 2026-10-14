/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and layout component together. */
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const navigate = useNavigate()

  return (
    <SidebarProvider>
      <AppSidebar onLogout={() => { void navigate({ to: '/' }) }} />
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
