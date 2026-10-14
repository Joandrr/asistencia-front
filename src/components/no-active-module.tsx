import { Link } from '@tanstack/react-router'
import { FolderClock } from 'lucide-react'

/** Empty state shown when no module has been activated yet. */
export function NoActiveModule() {
  return (
    <div className="users-empty">
      <FolderClock aria-hidden="true" />
      <p>Todavía no hay un módulo activo. Carga los estudiantes y las fechas para empezar.</p>
      <Link className="link-button" to="/modules">Ir a Nuevo módulo</Link>
    </div>
  )
}
