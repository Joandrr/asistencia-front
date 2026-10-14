/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useId, useState, type ReactNode } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  FileDown,
  Pencil,
  Percent,
  Search,
  UserRound,
} from 'lucide-react'
import {
  ATTENDANCE_ADMIN_KEY,
  correctAttendance,
  exportAttendance,
  formatMarkTime,
  formatRate,
  getAttendanceAdminError,
  getAttendanceSummary,
  getDateAttendance,
  getModuleStudents,
  getStudentAttendance,
  isNoActiveModuleError,
  STATUS_BADGE,
  STATUS_LABEL,
  type CorrectableStatus,
  type EffectiveStatus,
  type ScheduleSummary,
  type StatusTotals,
} from '@/lib/attendance-admin'
import { formatIsoDate } from '@/lib/modules'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { hasValidSession, useAuthStore } from '@/stores/auth-store'
import { NoActiveModule } from '@/components/no-active-module'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type AttendanceView = 'date' | 'student'

interface AttendanceSearch {
  view?: AttendanceView
  scheduleId?: number
  student?: number
}

/** Ids travel as plain numbers in the URL (?student=6); invalid values are dropped. */
function parseId(value: unknown) {
  const id = typeof value === 'string' ? Number(value) : value
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : undefined
}

export const Route = createFileRoute('/_dashboard/attendance/')({
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => ({
    view: search.view === 'student' || search.view === 'date' ? search.view : undefined,
    scheduleId: parseId(search.scheduleId),
    student: parseId(search.student),
  }),
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!hasValidSession()) throw redirect({ to: '/' })
    if (user?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  component: AttendancePage,
})

const PAGE_SIZE = 10
const NOTES_MAX = 500

interface EditTarget {
  studentId: string
  studentName: string
  registrationNo: string
  scheduleId: string
  classDate: string
  status: EffectiveStatus
}

function AttendancePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const view: AttendanceView = search.view ?? (search.student ? 'student' : 'date')
  const [notice, setNotice] = useState('')
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  const summaryQuery = useQuery({
    queryKey: [ATTENDANCE_ADMIN_KEY, 'summary'],
    queryFn: getAttendanceSummary,
    retry: (count, error) => !isNoActiveModuleError(error) && count < 2,
  })
  const summary = summaryQuery.data

  const exportMutation = useMutation({
    mutationFn: () => {
      if (!summary) throw new Error('Summary not loaded')
      return exportAttendance(summary.module, summary.today)
    },
  })

  function changeSearch(next: AttendanceSearch) {
    setNotice('')
    void navigate({ search: (previous) => ({ ...previous, ...next }), replace: true })
  }

  async function onCorrected(message: string) {
    // Refresh every view first so the dialog closes onto up-to-date data.
    await queryClient.invalidateQueries({ queryKey: [ATTENDANCE_ADMIN_KEY] })
    setEditTarget(null)
    setNotice(message)
  }

  if (summaryQuery.isPending) {
    return (
      <main className="dashboard-content">
        <Heading />
        <Card className="users-card"><CardContent className="users-card-content"><div className="users-empty"><ClipboardCheck aria-hidden="true" /><p>Cargando asistencias…</p></div></CardContent></Card>
      </main>
    )
  }

  if (summaryQuery.isError || !summary) {
    return (
      <main className="dashboard-content">
        <Heading />
        <Card className="users-card">
          <CardContent className="users-card-content">
            {isNoActiveModuleError(summaryQuery.error) ? <NoActiveModule /> : (
              <div className="users-empty">
                <p>{getAttendanceAdminError(summaryQuery.error)}</p>
                <Button variant="outline" onClick={() => void summaryQuery.refetch()}>Reintentar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    )
  }

  const { totals } = summary
  const defaultSchedule = pickDefaultSchedule(summary.schedules, summary.today)
  const requestedSchedule = search.scheduleId === undefined ? undefined : String(search.scheduleId)
  const scheduleId = summary.schedules.some((schedule) => schedule.id === requestedSchedule)
    ? requestedSchedule
    : defaultSchedule?.id

  return (
    <main className="dashboard-content">
      <Heading moduleName={summary.module.name}>
        <Button
          disabled={exportMutation.isPending || totals.students === 0}
          onClick={() => { setNotice(''); exportMutation.mutate() }}
        >
          <FileDown aria-hidden="true" /> {exportMutation.isPending ? 'Exportando…' : 'Exportar Excel'}
        </Button>
      </Heading>

      {notice && <p className="users-notice" role="status">{notice}</p>}
      {exportMutation.error && <p className="users-error" role="alert">{getAttendanceAdminError(exportMutation.error)}</p>}

      <section className="stats-grid" aria-label="Totales del módulo activo">
        <article className="stat-card">
          <div className="stat-heading"><span>Presentes</span><CircleCheck aria-hidden="true" /></div>
          <strong>{totals.present}</strong>
          <p>Asistencias registradas en el módulo</p>
        </article>
        <article className="stat-card">
          <div className="stat-heading"><span>Faltas</span><CircleX aria-hidden="true" /></div>
          <strong>{totals.absent}</strong>
          <p>Clases terminadas sin asistencia</p>
        </article>
        <article className="stat-card">
          <div className="stat-heading"><span>Asistencia</span><Percent aria-hidden="true" /></div>
          <strong>{formatRate(totals.rate)}</strong>
          <p>{totals.students} estudiantes · {totals.schedules} fechas · {totals.pending} pendientes</p>
        </article>
      </section>

      <Card className="users-card">
        <CardContent className="users-card-content attendance-admin-content">
          <nav className="tabs-nav" role="tablist" aria-label="Vista de asistencias">
            <button type="button" role="tab" aria-selected={view === 'date'} className={`tab-trigger ${view === 'date' ? 'active' : ''}`} onClick={() => changeSearch({ view: 'date' })}>
              <CalendarDays aria-hidden="true" /> Por fecha
            </button>
            <button type="button" role="tab" aria-selected={view === 'student'} className={`tab-trigger ${view === 'student' ? 'active' : ''}`} onClick={() => changeSearch({ view: 'student' })}>
              <UserRound aria-hidden="true" /> Por estudiante
            </button>
          </nav>

          {summary.schedules.length === 0 || totals.students === 0 ? (
            <div className="users-empty"><ClipboardCheck aria-hidden="true" /><p>El módulo activo no tiene estudiantes o fechas de clase.</p></div>
          ) : view === 'date' && scheduleId ? (
            <DateView
              schedules={summary.schedules}
              scheduleId={scheduleId}
              onScheduleChange={(id) => changeSearch({ scheduleId: Number(id) })}
              onEdit={setEditTarget}
            />
          ) : search.student ? (
            <StudentView
              studentId={String(search.student)}
              onBack={() => changeSearch({ student: undefined })}
              onEdit={setEditTarget}
            />
          ) : (
            <StudentPicker onSelect={(id) => changeSearch({ view: 'student', student: Number(id) })} />
          )}
        </CardContent>
      </Card>

      <EditAttendanceDialog target={editTarget} onClose={() => setEditTarget(null)} onSaved={onCorrected} />
    </main>
  )
}

function Heading({ moduleName, children }: { moduleName?: string; children?: ReactNode }) {
  return (
    <section className="users-heading">
      <div>
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h2>Asistencias</h2>
        <p>
          {moduleName
            ? <>Consulta y corrige las asistencias del módulo <strong className="attendance-admin-module">{moduleName}</strong>.</>
            : 'Consulta y corrige las asistencias del módulo activo.'}
        </p>
      </div>
      {children}
    </section>
  )
}

function DateView({
  schedules,
  scheduleId,
  onScheduleChange,
  onEdit,
}: {
  schedules: ScheduleSummary[]
  scheduleId: string
  onScheduleChange: (id: string) => void
  onEdit: (target: EditTarget) => void
}) {
  const selectId = useId()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())

  const dateQuery = useQuery({
    queryKey: [ATTENDANCE_ADMIN_KEY, 'by-date', { scheduleId, page, limit: PAGE_SIZE, q: debouncedSearch }],
    queryFn: () => getDateAttendance({ scheduleId, page, limit: PAGE_SIZE, q: debouncedSearch || undefined }),
    placeholderData: (previousData) => previousData,
  })
  const result = dateQuery.data
  const rows = result?.data ?? []
  const totalPages = Math.max(1, result?.meta.totalPages ?? 1)
  // While another date loads, the previous rows stay visible but dimmed and read-only.
  const stale = dateQuery.isPlaceholderData
  const schedule = !stale && result?.schedule.id === scheduleId ? result.schedule : undefined

  return (
    <>
      <div className="users-toolbar">
        <label className="users-filter attendance-admin-date-filter" htmlFor={selectId}>
          <span>Fecha</span>
          <select
            id={selectId}
            value={scheduleId}
            onChange={(event) => { onScheduleChange(event.currentTarget.value); setPage(1) }}
          >
            {schedules.map((item) => (
              <option key={item.id} value={item.id}>
                {formatIsoDate(item.classDate)} · {item.startTime}–{item.endTime}
              </option>
            ))}
          </select>
        </label>
        <label className="users-search">
          <Search aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.currentTarget.value); setPage(1) }}
            placeholder="Buscar por registro o nombre"
            maxLength={100}
            aria-label="Buscar estudiantes por registro o nombre"
          />
        </label>
      </div>

      {result && <TotalsStrip stale={stale} totals={result.totals} note={schedule && !schedule.editable ? 'Fecha futura: aún no se puede modificar.' : undefined} />}

      {dateQuery.isPending ? (
        <div className="users-empty"><CalendarDays aria-hidden="true" /><p>Cargando asistencias de la fecha…</p></div>
      ) : dateQuery.isError ? (
        <div className="users-empty">
          <p>{getAttendanceAdminError(dateQuery.error)}</p>
          <Button variant="outline" onClick={() => void dateQuery.refetch()}>Reintentar</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="users-empty"><UserRound aria-hidden="true" /><p>Ningún estudiante coincide con la búsqueda.</p></div>
      ) : (
        <div className={`users-table-wrap ${stale ? 'attendance-admin-stale' : ''}`} aria-busy={stale}>
          <table className="users-table attendance-admin-table">
            <caption className="sr-only">Asistencias del {schedule ? formatIsoDate(schedule.classDate) : ''}</caption>
            <thead>
              <tr>
                <th scope="col">Registro</th>
                <th scope="col">Nombre</th>
                <th scope="col">Estado</th>
                <th scope="col">Hora de marca</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId}>
                  <td className="user-registration">{row.registrationNo}</td>
                  <td>{row.fullName || '—'}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td className="attendance-admin-time">{formatMarkTime(row.markedAt)}</td>
                  <td>
                    <div className="user-actions">
                      <EditButton
                        editable={Boolean(schedule?.editable)}
                        label={`Cambiar asistencia de ${row.fullName || row.registrationNo}`}
                        onClick={() => schedule && onEdit({
                          studentId: row.studentId,
                          studentName: row.fullName || row.registrationNo,
                          registrationNo: row.registrationNo,
                          scheduleId: schedule.id,
                          classDate: schedule.classDate,
                          status: row.status,
                        })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="users-pagination">
        <span>{result ? `${result.meta.total} estudiantes · Página ${result.meta.page} de ${totalPages}` : ' '}</span>
        <div>
          <Button variant="outline" size="sm" disabled={page <= 1 || dateQuery.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages || dateQuery.isFetching} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</Button>
        </div>
      </footer>
    </>
  )
}

function StudentPicker({ onSelect }: { onSelect: (studentId: string) => void }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const studentsQuery = useQuery({
    queryKey: [ATTENDANCE_ADMIN_KEY, 'students', { page: 1, limit: 8, q: debouncedSearch }],
    queryFn: () => getModuleStudents({ page: 1, limit: 8, q: debouncedSearch || undefined }),
    placeholderData: (previousData) => previousData,
  })
  const rows = studentsQuery.data?.data ?? []
  const total = studentsQuery.data?.meta.total ?? 0

  return (
    <div className="attendance-admin-picker">
      <label className="users-search">
        <Search aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Busca un estudiante por registro o nombre"
          maxLength={100}
          aria-label="Buscar estudiante"
          autoFocus
        />
      </label>
      {studentsQuery.isPending ? (
        <div className="users-empty"><UserRound aria-hidden="true" /><p>Cargando estudiantes…</p></div>
      ) : studentsQuery.isError ? (
        <div className="users-empty"><p>{getAttendanceAdminError(studentsQuery.error)}</p></div>
      ) : rows.length === 0 ? (
        <div className="users-empty"><UserRound aria-hidden="true" /><p>Ningún estudiante coincide con la búsqueda.</p></div>
      ) : (
        <>
          <ul className="attendance-admin-picker-list" aria-label="Estudiantes">
            {rows.map((student) => (
              <li key={student.id}>
                <button type="button" className="attendance-admin-picker-item" onClick={() => onSelect(student.id)}>
                  <span className="attendance-admin-avatar" aria-hidden="true">{initials(student.fullName || student.registrationNo)}</span>
                  <span className="attendance-admin-picker-text">
                    <strong>{student.fullName || '—'}</strong>
                    <span>{student.registrationNo}{student.email ? ` · ${student.email}` : ''}</span>
                  </span>
                  <span className="attendance-admin-picker-rate">{formatRate(student.rate)}</span>
                </button>
              </li>
            ))}
          </ul>
          {total > rows.length && <p className="attendance-admin-hint">Mostrando {rows.length} de {total}. Escribe para filtrar.</p>}
        </>
      )}
    </div>
  )
}

function StudentView({
  studentId,
  onBack,
  onEdit,
}: {
  studentId: string
  onBack: () => void
  onEdit: (target: EditTarget) => void
}) {
  const studentQuery = useQuery({
    queryKey: [ATTENDANCE_ADMIN_KEY, 'by-student', studentId],
    queryFn: () => getStudentAttendance(studentId),
  })
  const result = studentQuery.data

  return (
    <>
      <div className="attendance-admin-student-bar">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft aria-hidden="true" /> Cambiar estudiante</Button>
      </div>
      {studentQuery.isPending ? (
        <div className="users-empty"><UserRound aria-hidden="true" /><p>Cargando asistencias del estudiante…</p></div>
      ) : studentQuery.isError || !result ? (
        <div className="users-empty">
          <p>{getAttendanceAdminError(studentQuery.error)}</p>
          <Button variant="outline" onClick={onBack}>Elegir otro estudiante</Button>
        </div>
      ) : (
        <>
          <section className="attendance-admin-student" aria-label="Estudiante">
            <span className="attendance-admin-avatar attendance-admin-avatar-lg" aria-hidden="true">{initials(result.student.fullName || result.student.registrationNo)}</span>
            <div>
              <h3>{result.student.fullName || '—'}</h3>
              <p>{result.student.registrationNo}{result.student.email ? ` · ${result.student.email}` : ''}</p>
            </div>
          </section>
          <TotalsStrip totals={result.totals} />
          <div className="users-table-wrap">
            <table className="users-table attendance-admin-table">
              <caption className="sr-only">Asistencias de {result.student.fullName || result.student.registrationNo}</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Horario</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Hora de marca</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {result.records.map((record) => (
                  <tr key={record.scheduleId}>
                    <td className="user-registration">{formatIsoDate(record.classDate)}</td>
                    <td className="attendance-admin-time">{record.startTime}–{record.endTime}</td>
                    <td><StatusBadge status={record.status} /></td>
                    <td className="attendance-admin-time">{formatMarkTime(record.markedAt)}</td>
                    <td>
                      <div className="user-actions">
                        <EditButton
                          editable={record.editable}
                          label={`Cambiar asistencia del ${formatIsoDate(record.classDate)}`}
                          onClick={() => onEdit({
                            studentId: result.student.id,
                            studentName: result.student.fullName || result.student.registrationNo,
                            registrationNo: result.student.registrationNo,
                            scheduleId: record.scheduleId,
                            classDate: record.classDate,
                            status: record.status,
                          })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

function EditAttendanceDialog({
  target,
  onClose,
  onSaved,
}: {
  target: EditTarget | null
  onClose: () => void
  onSaved: (message: string) => Promise<void>
}) {
  const mutation = useMutation({
    mutationFn: correctAttendance,
    onSuccess: (result, variables) => {
      if (!target) return
      return onSaved(result.unchanged
        ? 'La asistencia ya tenía ese estado; no se realizaron cambios.'
        : `Asistencia de ${target.studentName} del ${formatIsoDate(target.classDate)} actualizada a ${STATUS_LABEL[variables.status]}.`)
    },
  })

  return (
    <Dialog.Root open={Boolean(target)} onOpenChange={(open) => { if (!open && !mutation.isPending) { mutation.reset(); onClose() } }}>
      {target && (
        <Dialog.Portal>
          <Dialog.Backdrop className="users-dialog-backdrop" />
          <Dialog.Popup className="users-dialog users-confirm-dialog">
            <Dialog.Title className="users-dialog-title">Cambiar asistencia</Dialog.Title>
            <Dialog.Description className="users-dialog-description">
              <strong>{target.studentName}</strong> ({target.registrationNo}) · {formatIsoDate(target.classDate)}. El cambio quedará registrado en el historial de actividades.
            </Dialog.Description>
            <EditAttendanceForm
              key={`${target.studentId}-${target.scheduleId}`}
              target={target}
              busy={mutation.isPending}
              serverError={mutation.error ? getAttendanceAdminError(mutation.error) : ''}
              onCancel={() => { mutation.reset(); onClose() }}
              onSubmit={(status, notes) => mutation.mutate({
                studentId: target.studentId,
                scheduleId: target.scheduleId,
                status,
                notes: notes || undefined,
              })}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}

function EditAttendanceForm({
  target,
  busy,
  serverError,
  onCancel,
  onSubmit,
}: {
  target: EditTarget
  busy: boolean
  serverError: string
  onCancel: () => void
  onSubmit: (status: CorrectableStatus, notes: string) => void
}) {
  const notesId = useId()
  const [status, setStatus] = useState<CorrectableStatus>(target.status === 'present' ? 'absent' : 'present')
  const [notes, setNotes] = useState('')
  const unchanged = status === target.status

  const options: Array<{ value: CorrectableStatus; label: string; icon: typeof CircleCheck }> = [
    { value: 'present', label: 'Presente', icon: CircleCheck },
    { value: 'absent', label: 'Falta', icon: CircleX },
  ]

  return (
    <form
      className="user-form"
      noValidate
      onSubmit={(event) => { event.preventDefault(); if (!unchanged) onSubmit(status, notes.trim()) }}
    >
      <p className="attendance-admin-current">Estado actual: <StatusBadge status={target.status} /></p>
      <div className="attendance-admin-options" role="radiogroup" aria-label="Nuevo estado">
        {options.map(({ value, label, icon: Icon }) => (
          <label key={value} className={`attendance-admin-option attendance-admin-option-${value} ${status === value ? 'is-selected' : ''}`}>
            <input type="radio" name="attendance-status" value={value} checked={status === value} disabled={busy} onChange={() => setStatus(value)} />
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="attendance-admin-notes-field">
        <label htmlFor={notesId}>Motivo <span>(opcional)</span></label>
        <textarea
          id={notesId}
          className="attendance-admin-notes"
          value={notes}
          maxLength={NOTES_MAX}
          rows={3}
          disabled={busy}
          placeholder="Ej.: justificativo médico presentado en secretaría"
          onChange={(event) => setNotes(event.currentTarget.value)}
        />
        <span className="profile-hint">{notes.length}/{NOTES_MAX}</span>
      </div>
      {unchanged && <p className="user-form-hint">Elige un estado distinto al actual para guardar.</p>}
      {serverError && <p className="users-error" role="alert">{serverError}</p>}
      <div className="users-dialog-actions">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={busy || unchanged}>{busy ? 'Guardando…' : 'Guardar cambio'}</Button>
      </div>
    </form>
  )
}

function TotalsStrip({ totals, note, stale = false }: { totals: StatusTotals; note?: string; stale?: boolean }) {
  return (
    <div className={`attendance-admin-strip ${stale ? 'attendance-admin-stale' : ''}`} aria-label="Totales">
      <span className="badge-pill badge-success">Presentes {totals.present}</span>
      <span className="badge-pill badge-danger">Faltas {totals.absent}</span>
      <span className="badge-pill badge-neutral">Pendientes {totals.pending}</span>
      <span className="attendance-admin-strip-rate">Asistencia <strong>{formatRate(totals.rate)}</strong></span>
      {note && <span className="attendance-admin-hint">{note}</span>}
    </div>
  )
}

function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span>
}

function EditButton({ editable, label, onClick }: { editable: boolean; label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!editable}
      aria-label={editable ? label : `${label} (fecha futura)`}
      title={editable ? undefined : 'Fecha futura: aún no se puede modificar'}
      onClick={onClick}
    >
      <Pencil aria-hidden="true" /> Cambiar
    </Button>
  )
}

/** Most recent class date up to today, or the first one if all are upcoming. */
function pickDefaultSchedule(schedules: ScheduleSummary[], today: string) {
  const past = schedules.filter((schedule) => schedule.classDate <= today)
  return past.at(-1) ?? schedules[0]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
