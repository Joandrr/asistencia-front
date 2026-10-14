import './App.css'
import { Link, useNavigate } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { LoginForm } from '@/components/login-form'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Users, CalendarCheck2, BookOpenCheck, ChartNoAxesColumnIncreasing } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  return (
    <main className="login-screen">
      <div className="login-brand">
        <div className="brand-mark"><CalendarCheck2 aria-hidden="true" /></div>
        <span>Asistencia</span>
      </div>
      <div className="login-content">
        <LoginForm onSubmit={(event) => { event.preventDefault(); void navigate({ to: '/dashboard' }) }} />
        <p className="demo-note">Vista de demostración · el acceso no se valida con un servidor</p>
      </div>
    </main>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const formattedDate = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  const stats = [
    { label: 'Estudiantes', value: '248', detail: 'Inscritos este periodo', icon: Users },
    { label: 'Asistencia de hoy', value: '92%', detail: 'En todos los cursos', icon: CalendarCheck2 },
    { label: 'Cursos activos', value: '12', detail: 'En el periodo actual', icon: BookOpenCheck },
    { label: 'A tiempo', value: '+4.8%', detail: 'Respecto al mes pasado', icon: ChartNoAxesColumnIncreasing },
  ]

  return (
    <SidebarProvider>
      <AppSidebar onLogout={() => { void navigate({ to: '/' }) }} />
      <SidebarInset>
        <header className="dashboard-header">
          <SidebarTrigger />
          <div className="header-copy">
            <p className="eyebrow">PANEL PRINCIPAL</p>
            <h1>Resumen de asistencia</h1>
          </div>
        </header>
        <main className="dashboard-content">
          <section className="welcome-banner">
            <div>
              <p className="eyebrow">{formattedDate}</p>
              <h2>¡Hola! Aquí está el resumen de hoy.</h2>
              <p>Consulta rápidamente la actividad académica de tu institución.</p>
            </div>
            <CalendarCheck2 aria-hidden="true" />
          </section>
          <section className="stats-grid" aria-label="Indicadores principales">
            {stats.map(({ label, value, detail, icon: Icon }) => (
              <article className="stat-card" key={label}>
                <div className="stat-heading"><span>{label}</span><Icon aria-hidden="true" /></div>
                <strong>{value}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </section>
          <section className="activity-card">
            <div>
              <p className="eyebrow">ACTIVIDAD</p>
              <h2>Registro de asistencia</h2>
              <p>El menú lateral ya está listo para conectar las secciones de la aplicación.</p>
            </div>
            <span className="status-pill"><span /> Sistema listo</span>
          </section>
          <Link
            className="dynamic-route-link"
            to="/students/$studentId"
            params={{ studentId: 'est-001' }}
          >
            Ver ficha dinámica de estudiante
          </Link>
          <p className="demo-note">Panel de demostración · todavía no está conectado a datos reales</p>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

