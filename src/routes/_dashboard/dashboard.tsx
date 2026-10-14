/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useState, useEffect } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  AlertCircle,
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
  getTodayClasses,
  markAttendance,
  getAttendanceHistory,
  type TodayClass,
} from '@/lib/attendance'

export const Route = createFileRoute('/_dashboard/dashboard')({
  // Administrators land on the real attendance overview instead of a demo panel.
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role === 'admin') throw redirect({ to: '/attendance' })
  },
  component: StudentDashboard,
})

/* =========================================================================
   STUDENT DASHBOARD (RF-03: REGISTRAR ASISTENCIA & HISTORIAL POR MÓDULO)
   ========================================================================= */
function StudentDashboard() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all')
  const [clock, setClock] = useState('')
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Real-time local clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('es-BO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const formattedDate = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  // Queries
  const todayQuery = useQuery({
    queryKey: ['today-classes'],
    queryFn: getTodayClasses,
    refetchInterval: 20000, // Poll every 20s to keep real-time sync
  })

  const historyQuery = useQuery({
    queryKey: ['attendance-history'],
    queryFn: () => getAttendanceHistory(),
    enabled: activeTab === 'history',
  })

  // Mark Attendance Mutation
  const markMutation = useMutation({
    mutationFn: (scheduleId: string) => markAttendance(scheduleId),
    onSuccess: (data) => {
      setActionNotice({ type: 'success', text: data.message })
      void queryClient.invalidateQueries({ queryKey: ['today-classes'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance-history'] })
    },
    onError: (err: unknown) => {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: unknown } | undefined)?.message
        : undefined
      const msg = typeof message === 'string' && message ? message : 'No se pudo registrar la asistencia.'
      setActionNotice({ type: 'error', text: msg })
    },
  })

  const todayClasses = todayQuery.data?.classes ?? []
  const historyModules = historyQuery.data?.modules ?? []

  const activeModuleHistory =
    selectedModuleId === 'all'
      ? historyModules
      : historyModules.filter((m) => m.moduleId === selectedModuleId)

  return (
    <main className="dashboard-content">
      {/* Student Greeting Banner */}
      <section className="welcome-banner">
        <div>
          <p className="eyebrow">
            ESTUDIANTE REGISTRADO · {user?.registrationNo}
          </p>
          <h2>¡Hola, {user?.fullName || 'Estudiante'}!</h2>
          <p style={{ textTransform: 'capitalize' }}>
            {formattedDate} · <strong>Hora actual: {clock || '...'}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <span className="badge-pill badge-live">
            <span className="badge-live-dot" /> Sistema de Asistencia Activo
          </span>
          <button
            onClick={() => {
              void todayQuery.refetch()
              if (activeTab === 'history') void historyQuery.refetch()
            }}
            className="tab-trigger"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
            title="Actualizar datos"
          >
            <RefreshCw size={13} /> Sincronizar
          </button>
        </div>
      </section>

      {/* Global Notifications */}
      {actionNotice && (
        <div className={`attendance-notification ${actionNotice.type}`}>
          {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice(null)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="tabs-nav" aria-label="Navegación de asistencia">
        <button
          type="button"
          className={`tab-trigger ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => { setActiveTab('today'); setActionNotice(null) }}
        >
          <CalendarCheck2 size={17} />
          Mis Clases de Hoy ({todayClasses.length})
        </button>
        <button
          type="button"
          className={`tab-trigger ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); setActionNotice(null) }}
        >
          <History size={17} />
          Historial por Módulo
        </button>
      </nav>

      {/* TAB 1: CLASES DE HOY (RF-03) */}
      {activeTab === 'today' && (
        <section aria-labelledby="today-classes-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 id="today-classes-heading" style={{ margin: 0, color: '#172b4d', fontSize: '1.15rem' }}>
                Clases Programadas para Hoy
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Marca tu asistencia únicamente cuando la clase esté en curso. Fuera del horario el botón permanecerá deshabilitado.
              </p>
            </div>
          </div>

          {todayQuery.isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
              <p>Cargando clases del día...</p>
            </div>
          ) : todayClasses.length === 0 ? (
            <article className="stat-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <CalendarDays size={42} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem', color: '#172b4d' }}>No tienes clases programadas para hoy</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                Revisa la pestaña de <strong>Historial por Módulo</strong> para ver tus asistencias pasadas o próximas fechas.
              </p>
            </article>
          ) : (
            <div className="today-grid">
              {todayClasses.map((cls) => (
                <TodayClassCard
                  key={cls.scheduleId}
                  item={cls}
                  isSubmitting={markMutation.isPending && markMutation.variables === cls.scheduleId}
                  onMark={() => markMutation.mutate(cls.scheduleId)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: HISTORIAL POR MÓDULO */}
      {activeTab === 'history' && (
        <section aria-labelledby="history-heading">
          <div className="history-card-header">
            <div>
              <h3 id="history-heading" style={{ margin: 0, color: '#172b4d', fontSize: '1.15rem' }}>
                Historial y Estadísticas de Asistencia
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Revisa tus registros, porcentajes de cumplimiento y estados por módulo.
              </p>
            </div>

            {/* Filter by Module */}
            <div className="users-filter">
              <label htmlFor="filter-module" style={{ fontWeight: 600 }}>Filtrar módulo:</label>
              <select
                id="filter-module"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
              >
                <option value="all">Todos los módulos inscritos ({historyModules.length})</option>
                {historyModules.map((m) => (
                  <option key={m.moduleId} value={m.moduleId}>
                    {m.moduleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {historyQuery.isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
              <p>Cargando historial de asistencias...</p>
            </div>
          ) : activeModuleHistory.length === 0 ? (
            <article className="stat-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <BookOpenCheck size={42} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem', color: '#172b4d' }}>Sin historial registrado</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                No se encontraron asistencias registradas para este módulo.
              </p>
            </article>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {activeModuleHistory.map((moduleItem) => (
                <article key={moduleItem.moduleId} className="stat-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="brand-mark" style={{ width: '2.4rem', height: '2.4rem' }}>
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#172b4d' }}>{moduleItem.moduleName}</h4>
                          {moduleItem.isActive ? (
                            <span className="badge-pill badge-live" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                              <span className="badge-live-dot" /> Módulo Activo
                            </span>
                          ) : (
                            <span className="badge-pill" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                              Módulo Concluido
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                          Total de clases programadas: {moduleItem.stats.totalSchedules}
                        </p>
                      </div>
                    </div>

                    <div style={{ minWidth: '160px', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Asistencia General</span>
                      <strong style={{ fontSize: '1.5rem', color: moduleItem.stats.attendancePercentage >= 80 ? '#15803d' : moduleItem.stats.attendancePercentage >= 60 ? '#b45309' : '#b91c1c' }}>
                        {moduleItem.stats.attendancePercentage}%
                      </strong>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${moduleItem.stats.attendancePercentage}%`,
                            background: moduleItem.stats.attendancePercentage >= 80 ? '#22c55e' : moduleItem.stats.attendancePercentage >= 60 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="history-stats-grid" style={{ marginTop: '1.25rem' }}>
                    <div className="history-stat-box">
                      <span>PUNTUALES</span>
                      <strong style={{ color: '#15803d' }}>{moduleItem.stats.presentCount}</strong>
                    </div>
                    <div className="history-stat-box">
                      <span>ATRASOS</span>
                      <strong style={{ color: '#b45309' }}>{moduleItem.stats.lateCount}</strong>
                    </div>
                    <div className="history-stat-box">
                      <span>FALTAS</span>
                      <strong style={{ color: '#b91c1c' }}>{moduleItem.stats.absentCount}</strong>
                    </div>
                    <div className="history-stat-box">
                      <span>PENDIENTES</span>
                      <strong style={{ color: '#64748b' }}>{moduleItem.stats.pendingCount}</strong>
                    </div>
                  </div>

                  {/* Detailed Class Records Table */}
                  <div className="users-table-wrap" style={{ marginTop: '1rem' }}>
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Horario</th>
                          <th>Tolerancia</th>
                          <th>Estado</th>
                          <th>Marcado Real</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleItem.records.map((rec) => (
                          <tr key={rec.scheduleId}>
                            <td style={{ fontWeight: 600, color: '#172b4d' }}>{rec.classDate}</td>
                            <td>{rec.startTime.slice(0, 5)} - {rec.endTime.slice(0, 5)}</td>
                            <td>Hasta {rec.graceTime.slice(0, 5)}</td>
                            <td>
                              {rec.status === 'present' && <span className="badge-pill badge-success">✓ Puntual</span>}
                              {rec.status === 'late' && <span className="badge-pill badge-warning">⚠ Atraso</span>}
                              {rec.status === 'absent' && <span className="badge-pill badge-danger">✗ Falta</span>}
                              {rec.status === 'pending' && <span className="badge-pill badge-neutral">Pendiente</span>}
                              {rec.status === 'excused' && <span className="badge-pill badge-live">Justificada</span>}
                            </td>
                            <td>
                              {rec.markedAt ? (
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#334155' }}>
                                  {new Date(rec.markedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                              {rec.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

/* =========================================================================
   TODAY CLASS CARD COMPONENT (RF-03 ACTION BUTTON & STATUS)
   ========================================================================= */
function TodayClassCard({
  item,
  isSubmitting,
  onMark,
}: {
  item: TodayClass
  isSubmitting: boolean
  onMark: () => void
}) {
  const startTimeShort = item.startTime.slice(0, 5)
  const endTimeShort = item.endTime.slice(0, 5)
  const graceTimeShort = item.graceTime.slice(0, 5)

  return (
    <article className={`today-class-card ${item.canMark ? 'active-class' : ''}`}>
      <div>
        <div className="class-header-row">
          <h4 className="class-module-title">{item.moduleName}</h4>
          {item.hasMarked ? (
            item.attendance?.status === 'present' ? (
              <span className="badge-pill badge-success">✓ Presente</span>
            ) : (
              <span className="badge-pill badge-warning">⚠ Atraso</span>
            )
          ) : item.canMark ? (
            <span className="badge-pill badge-live">
              <span className="badge-live-dot" /> En Curso
            </span>
          ) : item.isPast ? (
            <span className="badge-pill badge-danger">Finalizada</span>
          ) : (
            <span className="badge-pill badge-neutral">Por iniciar</span>
          )}
        </div>

        <div className="class-times-box">
          <div className="class-times-row">
            <Clock />
            <span>Horario: <strong>{startTimeShort} - {endTimeShort}</strong></span>
          </div>
          <div className="class-times-row" style={{ fontSize: '0.8rem', color: '#64748b' }}>
            <ShieldCheck size={14} style={{ color: '#16a34a' }} />
            <span>Tolerancia de puntualidad: hasta <strong>{graceTimeShort}</strong></span>
          </div>
          {item.hasMarked && item.attendance?.markedAt && (
            <div className="class-times-row" style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.2rem' }}>
              <CheckCircle2 size={14} />
              <span>
                Marcado registrado a las:{' '}
                <strong>
                  {new Date(item.attendance.markedAt).toLocaleTimeString('es-BO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        {/* RF-03 ACTION BUTTON */}
        {item.hasMarked ? (
          <button type="button" disabled className="btn-mark btn-mark-marked">
            <CheckCircle2 size={18} />
            {item.attendance?.status === 'present' ? 'Asistencia Registrada (Puntual)' : 'Asistencia Registrada (Con Retraso)'}
          </button>
        ) : item.canMark ? (
          <button
            type="button"
            className="btn-mark btn-mark-ready"
            onClick={onMark}
            disabled={isSubmitting}
          >
            <CheckCircle2 size={18} />
            {isSubmitting ? 'Registrando...' : 'Marcar Asistencia Ahora'}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn-mark btn-mark-disabled"
            title={item.statusMessage}
          >
            <Clock size={16} />
            {item.statusMessage}
          </button>
        )}

        <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
          {item.hasMarked
            ? '✓ Marca registrada con fecha y hora reales.'
            : item.canMark
            ? 'Haz clic para guardar tu fecha y hora de ingreso reales.'
            : 'Solo disponible en la fecha y horario programados.'}
        </p>
      </div>
    </article>
  )
}
