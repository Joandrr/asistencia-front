/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, GraduationCap, Search } from 'lucide-react'
import {
  ATTENDANCE_ADMIN_KEY,
  formatRate,
  getAttendanceAdminError,
  getModuleStudents,
  isNoActiveModuleError,
} from '@/lib/attendance-admin'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { hasValidSession, useAuthStore } from '@/stores/auth-store'
import { NoActiveModule } from '@/components/no-active-module'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_dashboard/students/')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!hasValidSession()) throw redirect({ to: '/' })
    if (user?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  component: StudentsPage,
})

const PAGE_SIZE = 10

function StudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())

  const studentsQuery = useQuery({
    queryKey: [ATTENDANCE_ADMIN_KEY, 'students', { page, limit: PAGE_SIZE, q: debouncedSearch }],
    queryFn: () => getModuleStudents({ page, limit: PAGE_SIZE, q: debouncedSearch || undefined }),
    placeholderData: (previousData) => previousData,
    retry: (count, error) => !isNoActiveModuleError(error) && count < 2,
  })

  const result = studentsQuery.data
  const rows = result?.data ?? []
  const meta = result?.meta
  const totalPages = Math.max(1, meta?.totalPages ?? 1)
  const noActiveModule = isNoActiveModuleError(studentsQuery.error)

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <main className="dashboard-content">
      <section className="users-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h2>Estudiantes</h2>
          <p>
            {result
              ? <>Estudiantes del módulo activo <strong className="attendance-admin-module">{result.module.name}</strong>.</>
              : 'Estudiantes del módulo activo.'}
          </p>
        </div>
      </section>

      <Card className="users-card">
        <CardContent className="users-card-content attendance-admin-content">
          <div className="users-toolbar">
            <label className="users-search">
              <Search aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => changeSearch(event.currentTarget.value)}
                placeholder="Buscar por registro o nombre"
                maxLength={100}
                aria-label="Buscar estudiantes por registro o nombre"
                disabled={noActiveModule}
              />
            </label>
          </div>

          {studentsQuery.isPending ? (
            <div className="users-empty"><GraduationCap aria-hidden="true" /><p>Cargando estudiantes…</p></div>
          ) : noActiveModule ? (
            <NoActiveModule />
          ) : studentsQuery.isError ? (
            <div className="users-empty">
              <p>{getAttendanceAdminError(studentsQuery.error)}</p>
              <Button variant="outline" onClick={() => void studentsQuery.refetch()}>Reintentar</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="users-empty">
              <GraduationCap aria-hidden="true" />
              <p>{debouncedSearch ? 'Ningún estudiante coincide con la búsqueda.' : 'El módulo activo no tiene estudiantes.'}</p>
            </div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table attendance-admin-table">
                <caption className="sr-only">Estudiantes del módulo activo</caption>
                <thead>
                  <tr>
                    <th scope="col">Registro</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Correo</th>
                    <th scope="col" className="attendance-admin-num">Presentes</th>
                    <th scope="col" className="attendance-admin-num">Faltas</th>
                    <th scope="col" className="attendance-admin-num">Asistencia</th>
                    <th scope="col"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <tr key={student.id}>
                      <td className="user-registration">{student.registrationNo}</td>
                      <td>{student.fullName || '—'}</td>
                      <td className="modules-email">{student.email || '—'}</td>
                      <td className="attendance-admin-num">{student.present}</td>
                      <td className="attendance-admin-num">{student.absent}</td>
                      <td className="attendance-admin-num"><strong>{formatRate(student.rate)}</strong></td>
                      <td>
                        <div className="user-actions">
                          <Link
                            className="link-button"
                            to="/attendance"
                            search={{ view: 'student', student: Number(student.id) }}
                            aria-label={`Ver asistencias de ${student.fullName || student.registrationNo}`}
                          >
                            <ClipboardCheck aria-hidden="true" /> Ver asistencias
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!noActiveModule && (
            <footer className="users-pagination">
              <span>{meta ? `${meta.total} estudiantes · Página ${meta.page} de ${totalPages}` : ' '}</span>
              <div>
                <Button variant="outline" size="sm" disabled={page <= 1 || studentsQuery.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages || studentsQuery.isFetching} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</Button>
              </div>
            </footer>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
