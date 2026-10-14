/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import {
  Activity,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileEdit,
  GraduationCap,
  History,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react'
import {
  ACTIVITIES_KEY,
  formatActivityDateTime,
  getActivities,
  getActivitiesError,
  getActivitiesSummary,
  isNoActiveModuleError,
  type ActivityItem,
} from '@/lib/activities'
import { formatIsoDate } from '@/lib/modules'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { hasValidSession, useAuthStore } from '@/stores/auth-store'
import { NoActiveModule } from '@/components/no-active-module'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface ActivitiesSearch {
  page?: number
  date?: string
  studentId?: string
  action?: string
  q?: string
}

export const Route = createFileRoute('/_dashboard/activities/')({
  validateSearch: (search: Record<string, unknown>): ActivitiesSearch => ({
    page: typeof search.page === 'number' && search.page > 0 ? search.page : 1,
    date: typeof search.date === 'string' && search.date ? search.date : undefined,
    studentId: typeof search.studentId === 'string' && search.studentId ? search.studentId : undefined,
    action: typeof search.action === 'string' && search.action ? search.action : undefined,
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
  }),
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!hasValidSession()) throw redirect({ to: '/' })
    if (user?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  component: ActivitiesPage,
})

const PAGE_SIZE = 15

function ActivitiesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)

  const debouncedSearch = useDebouncedValue(search.trim())

  const summaryQuery = useQuery({
    queryKey: [ACTIVITIES_KEY, 'summary'],
    queryFn: getActivitiesSummary,
    retry: (count, error) => !isNoActiveModuleError(error) && count < 2,
  })

  const activitiesQuery = useQuery({
    queryKey: [
      ACTIVITIES_KEY,
      'list',
      {
        page,
        limit: PAGE_SIZE,
        date: dateFilter || undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        q: debouncedSearch || undefined,
      },
    ],
    queryFn: () =>
      getActivities({
        page,
        limit: PAGE_SIZE,
        date: dateFilter || undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        q: debouncedSearch || undefined,
      }),
    placeholderData: (prev) => prev,
    retry: (count, error) => !isNoActiveModuleError(error) && count < 2,
  })

  const noActiveModule =
    isNoActiveModuleError(activitiesQuery.error) || isNoActiveModuleError(summaryQuery.error)

  const result = activitiesQuery.data
  const summary = summaryQuery.data
  const rows = result?.data ?? []
  const meta = result?.meta
  const totalPages = Math.max(1, meta?.totalPages ?? 1)

  const hasFilters = Boolean(search || dateFilter || actionFilter !== 'all')

  function resetFilters() {
    setSearch('')
    setDateFilter('')
    setActionFilter('all')
    setPage(1)
  }

  return (
    <main className="dashboard-content">
      {/* Encabezado */}
      <section className="users-heading">
        <div>
          <p className="eyebrow">AUDITORÍA Y CONTROL</p>
          <h2>Historial de Actividades</h2>
          <p>
            {result ? (
              <>
                Registro de acciones del módulo activo{' '}
                <strong className="attendance-admin-module">{result.module.name}</strong>.
              </>
            ) : (
              'Registro cronológico de marcas y modificaciones en el sistema.'
            )}
          </p>
        </div>
      </section>

      {/* Tarjetas de estadísticas */}
      {!noActiveModule && summary && (
        <section className="activities-stats-grid" aria-label="Resumen de actividad">
          <div className="activities-stat-card">
            <div className="activities-stat-icon activities-stat-icon-blue">
              <History aria-hidden="true" />
            </div>
            <div className="activities-stat-info">
              <span>Total Acciones</span>
              <strong>{summary.totals.total}</strong>
            </div>
          </div>
          <div className="activities-stat-card">
            <div className="activities-stat-icon activities-stat-icon-green">
              <UserCheck aria-hidden="true" />
            </div>
            <div className="activities-stat-info">
              <span>Marcas de Alumnos</span>
              <strong>{summary.totals.marks}</strong>
            </div>
          </div>
          <div className="activities-stat-card">
            <div className="activities-stat-icon activities-stat-icon-amber">
              <FileEdit aria-hidden="true" />
            </div>
            <div className="activities-stat-info">
              <span>Modificaciones Admin</span>
              <strong>{summary.totals.corrections}</strong>
            </div>
          </div>
          <div className="activities-stat-card">
            <div className="activities-stat-icon activities-stat-icon-purple">
              <Calendar aria-hidden="true" />
            </div>
            <div className="activities-stat-info">
              <span>Acciones Hoy</span>
              <strong>{summary.totals.today}</strong>
            </div>
          </div>
        </section>
      )}

      {/* Contenido principal */}
      <Card className="users-card">
        <CardContent className="users-card-content attendance-admin-content">
          {/* Barra de filtros */}
          <div className="activities-toolbar">
            <label className="users-search">
              <Search aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value)
                  setPage(1)
                }}
                placeholder="Buscar por estudiante, admin o registro..."
                maxLength={100}
                disabled={noActiveModule}
                aria-label="Buscar actividades"
              />
              {search && (
                <button
                  type="button"
                  className="users-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Limpiar búsqueda"
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </label>

            {/* Filtro por fecha */}
            <div className="activities-date-filter">
              <CalendarDays aria-hidden="true" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setPage(1)
                }}
                disabled={noActiveModule}
                title="Filtrar por fecha de acción o fecha de clase"
                aria-label="Filtrar por fecha"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  title="Borrar filtro de fecha"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <X style={{ width: '0.9rem', height: '0.9rem', color: '#64748b' }} />
                </button>
              )}
            </div>

            {/* Filtro por tipo de acción */}
            <select
              className="activities-select-filter"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              disabled={noActiveModule}
              aria-label="Filtrar por tipo de acción"
            >
              <option value="all">Todas las acciones</option>
              <option value="attendance.marked">Marcas de estudiantes</option>
              <option value="attendance.admin_corrected">Modificaciones de admin</option>
              <option value="module.activated">Activación de módulo</option>
            </select>

            {/* Botón para reiniciar filtros */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} style={{ gap: '0.35rem' }}>
                <RotateCcw style={{ width: '0.85rem', height: '0.85rem' }} /> Limpiar filtros
              </Button>
            )}
          </div>

          {/* Estado de carga / sin módulo / error / lista */}
          {activitiesQuery.isPending ? (
            <div className="users-empty">
              <Activity aria-hidden="true" />
              <p>Cargando historial de actividades…</p>
            </div>
          ) : noActiveModule ? (
            <NoActiveModule />
          ) : activitiesQuery.isError ? (
            <div className="users-empty">
              <ShieldAlert aria-hidden="true" />
              <p>{getActivitiesError(activitiesQuery.error)}</p>
              <Button variant="outline" onClick={() => void activitiesQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="users-empty">
              <History aria-hidden="true" />
              <p>
                {hasFilters
                  ? 'Ninguna actividad coincide con los filtros aplicados.'
                  : 'Aún no hay actividades registradas en el módulo activo.'}
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Mostrar todas
                </Button>
              )}
            </div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table attendance-admin-table">
                <caption className="sr-only">Historial de actividades del módulo activo</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha y Hora</th>
                    <th scope="col">Usuario Ejecutor</th>
                    <th scope="col">Acción</th>
                    <th scope="col">Estudiante Afectado</th>
                    <th scope="col">Fecha Clase</th>
                    <th scope="col">Detalle del Cambio</th>
                    <th scope="col">
                      <span className="sr-only">Detalle</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id}>
                      {/* Fecha y hora */}
                      <td className="attendance-admin-time">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{formatActivityDateTime(item.createdAt).split(',')[0]}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {formatActivityDateTime(item.createdAt).split(',')[1]}
                          </span>
                        </div>
                      </td>

                      {/* Usuario que ejecutó la acción */}
                      <td>
                        {item.user ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              className="attendance-admin-avatar"
                              style={{
                                background: item.user.role === 'admin' ? '#fef3c7' : '#dbeafe',
                                color: item.user.role === 'admin' ? '#b45309' : '#1d4ed8',
                              }}
                            >
                              {item.user.role === 'admin' ? 'AD' : 'ES'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#172b4d' }}>
                                {item.user.fullName || item.user.registrationNo}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Reg. {item.user.registrationNo}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sistema</span>
                        )}
                      </td>

                      {/* Acción */}
                      <td>
                        <ActionBadge action={item.action} label={item.actionLabel} />
                      </td>

                      {/* Estudiante afectado */}
                      <td>
                        {item.student ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#172b4d' }}>
                              {item.student.fullName || '—'}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Reg. {item.student.registrationNo}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Fecha de clase */}
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {item.classDate ? formatIsoDate(item.classDate) : '—'}
                      </td>

                      {/* Resumen del detalle */}
                      <td>
                        <ActivityDetailSnippet item={item} />
                      </td>

                      {/* Botón Ver Detalle */}
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedActivity(item)}
                          title="Ver detalle completo de auditoría"
                          style={{ gap: '0.35rem' }}
                        >
                          <Eye style={{ width: '0.9rem', height: '0.9rem' }} /> Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!noActiveModule && rows.length > 0 && (
            <footer className="users-pagination">
              <span>
                {meta ? `${meta.total} actividades registradas · Página ${meta.page} de ${totalPages}` : ''}
              </span>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || activitiesQuery.isFetching}
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || activitiesQuery.isFetching}
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </footer>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle Completo de Auditoría */}
      <ActivityDetailDialog
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </main>
  )
}

function ActionBadge({ action, label }: { action: string; label: string }) {
  if (action === 'attendance.marked') {
    return (
      <span className="activity-badge activity-badge-mark">
        <CheckCircle2 aria-hidden="true" /> {label}
      </span>
    )
  }
  if (action === 'attendance.admin_corrected') {
    return (
      <span className="activity-badge activity-badge-correction">
        <FileEdit aria-hidden="true" /> {label}
      </span>
    )
  }
  if (action === 'module.activated') {
    return (
      <span className="activity-badge activity-badge-module">
        <GraduationCap aria-hidden="true" /> {label}
      </span>
    )
  }
  return <span className="activity-badge activity-badge-default">{label}</span>
}

function ActivityDetailSnippet({ item }: { item: ActivityItem }) {
  if (item.action === 'attendance.marked') {
    const status = String(item.details.status || 'present')
    const isPresent = status === 'present'
    return (
      <span className={`badge-pill ${isPresent ? 'badge-success' : 'badge-warning'}`}>
        {item.details.statusLabel ? String(item.details.statusLabel) : isPresent ? 'Presente' : 'Atraso'}
      </span>
    )
  }

  if (item.action === 'attendance.admin_corrected') {
    const prev = String(item.details.previousStatusLabel || '—')
    const next = String(item.details.newStatusLabel || '—')
    const notes = typeof item.details.notes === 'string' ? item.details.notes : null
    const nextIsPresent = item.details.newStatus === 'present'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{prev}</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>➔</span>
          <span className={`badge-pill ${nextIsPresent ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}>
            {next}
          </span>
        </div>
        {notes && (
          <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={notes}>
            &ldquo;{notes}&rdquo;
          </span>
        )}
      </div>
    )
  }

  if (item.action === 'module.activated') {
    return (
      <span style={{ fontSize: '0.8rem', color: '#475569' }}>
        {String(item.details.studentsCount ?? '—')} estudiantes · {String(item.details.schedulesCount ?? '—')} clases
      </span>
    )
  }

  return <span style={{ fontSize: '0.8rem', color: '#64748b' }}>—</span>
}

function ActivityDetailDialog({
  activity,
  onClose,
}: {
  activity: ActivityItem | null
  onClose: () => void
}) {
  const [showJson, setShowJson] = useState(false)

  return (
    <Dialog.Root open={Boolean(activity)} onOpenChange={(open) => { if (!open) onClose() }}>
      {activity && (
        <Dialog.Portal>
          <Dialog.Backdrop className="users-dialog-backdrop" />
          <Dialog.Popup className="users-dialog activity-detail-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Dialog.Title className="users-dialog-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
                  Detalle de Actividad #{activity.id}
                </Dialog.Title>
                <Dialog.Description className="users-dialog-description">
                  {formatActivityDateTime(activity.createdAt)} · Realizada por {activity.user?.fullName || activity.user?.registrationNo || 'Sistema'}.
                </Dialog.Description>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar modal">
                <X style={{ width: '1.1rem', height: '1.1rem' }} />
              </Button>
            </div>

            <div className="activity-detail-grid">
              <div className="activity-detail-item">
                <span className="activity-detail-label">Acción</span>
                <span className="activity-detail-val">
                  <ActionBadge action={activity.action} label={activity.actionLabel} />
                </span>
              </div>
              <div className="activity-detail-item">
                <span className="activity-detail-label">Fecha y Hora Real</span>
                <span className="activity-detail-val">{formatActivityDateTime(activity.createdAt)}</span>
              </div>

              <div className="activity-detail-item">
                <span className="activity-detail-label">Usuario Ejecutor</span>
                <span className="activity-detail-val">
                  {activity.user ? `${activity.user.fullName || '—'} (${activity.user.role === 'admin' ? 'Admin' : 'Estudiante'})` : 'Sistema'}
                </span>
              </div>
              <div className="activity-detail-item">
                <span className="activity-detail-label">Registro del Usuario</span>
                <span className="activity-detail-val">{activity.user?.registrationNo || '—'}</span>
              </div>

              {activity.student && (
                <>
                  <div className="activity-detail-item">
                    <span className="activity-detail-label">Estudiante Afectado</span>
                    <span className="activity-detail-val">{activity.student.fullName || '—'}</span>
                  </div>
                  <div className="activity-detail-item">
                    <span className="activity-detail-label">Registro Estudiante</span>
                    <span className="activity-detail-val">{activity.student.registrationNo}</span>
                  </div>
                </>
              )}

              {activity.classDate && (
                <div className="activity-detail-item">
                  <span className="activity-detail-label">Fecha de Clase</span>
                  <span className="activity-detail-val">{formatIsoDate(activity.classDate)}</span>
                </div>
              )}

              {activity.affectedRecordId && (
                <div className="activity-detail-item">
                  <span className="activity-detail-label">Registro Afectado</span>
                  <span className="activity-detail-val">
                    {activity.affectedEntity} #{activity.affectedRecordId}
                  </span>
                </div>
              )}

              {Boolean(activity.details.notes) && (
                <div className="activity-detail-item full-width">
                  <span className="activity-detail-label">Justificación / Notas</span>
                  <span className="activity-detail-val" style={{ background: '#f1f5f9', padding: '0.4rem 0.6rem', borderRadius: '0.4rem' }}>
                    {String(activity.details.notes)}
                  </span>
                </div>
              )}
            </div>

            {/* Alternar JSON crudo de auditoría */}
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJson(!showJson)}
                style={{ fontSize: '0.78rem' }}
              >
                {showJson ? 'Ocultar datos técnicos (JSON)' : 'Ver datos técnicos completos (JSON)'}
              </Button>
            </div>

            {showJson && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {activity.previousValue && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                      VALOR ANTERIOR (previous_value):
                    </span>
                    <pre className="activity-json-box">
                      {JSON.stringify(activity.previousValue, null, 2)}
                    </pre>
                  </div>
                )}
                {activity.newValue && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                      VALOR NUEVO (new_value):
                    </span>
                    <pre className="activity-json-box">
                      {JSON.stringify(activity.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}
