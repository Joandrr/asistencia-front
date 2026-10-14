/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and its component from one module. */
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/students/$studentId')({
  component: StudentDetailPage,
})

function StudentDetailPage() {
  const { studentId } = Route.useParams()

  return (
    <main className="dashboard-content">
      <section className="activity-card">
        <div>
          <p className="eyebrow">ESTUDIANTES / FICHA</p>
          <h2>Ficha del estudiante</h2>
          <p>Identificador de ruta: <strong>{studentId}</strong></p>
        </div>
        <Link to="/dashboard">Volver al panel</Link>
      </section>
    </main>
  )
}
