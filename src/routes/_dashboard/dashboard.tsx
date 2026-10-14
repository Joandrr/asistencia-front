/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BookOpenCheck,
  CalendarCheck2,
  ChartNoAxesColumnIncreasing,
  Users,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const formattedDate = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const stats = [
    { label: 'Estudiantes', value: '248', detail: 'Inscritos este periodo', icon: Users },
    { label: 'Asistencia de hoy', value: '92%', detail: 'En todos los cursos', icon: CalendarCheck2 },
    { label: 'Cursos activos', value: '12', detail: 'En el periodo actual', icon: BookOpenCheck },
    { label: 'A tiempo', value: '+4.8%', detail: 'Respecto al mes pasado', icon: ChartNoAxesColumnIncreasing },
  ]

  return (
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
  )
}
