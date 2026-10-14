/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and its component from one module. */
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/students/$studentId')({
  component: StudentDetailPage,
})

function StudentDetailPage() {
  const { studentId } = Route.useParams()

  return (
    <main className="route-page">
      <p className="eyebrow">ESTUDIANTES / FICHA</p>
      <h1>Ficha del estudiante</h1>
      <p>Identificador de ruta: <strong>{studentId}</strong></p>
      <Link to="/dashboard">Volver al panel</Link>
    </main>
  )
}
