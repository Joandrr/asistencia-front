/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useId, useState, type DragEvent, type FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import axios from 'axios'
import {
  CalendarDays,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FolderClock,
  FolderUp,
  Pencil,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react'
import {
  activateModule,
  DEFAULT_GRACE_MINUTES,
  downloadTemplate,
  formatDateRange,
  formatIsoDate,
  getActiveModule,
  MAX_GRACE_MINUTES,
  MAX_IMPORT_FILE_BYTES,
  parseGraceMinutes,
  previewModuleImport,
  updateGracePeriod,
  type ImportFileKind,
  type ImportFiles,
  type ImportIssue,
  type ImportPreview,
  type ImportStudentStatus,
  type ActiveModuleSummary,
} from '@/lib/modules'
import { hasValidSession, useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_dashboard/modules/')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!hasValidSession()) throw redirect({ to: '/' })
    if (user?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  component: ModulesPage,
})

const MODULE_NAME_MAX = 150
const ACTIVE_MODULE_KEY = ['modules', 'active'] as const

const FILE_COPY: Record<ImportFileKind, { title: string; columns: string }> = {
  students: { title: 'Estudiantes', columns: 'Número de registro · Nombre completo · Correo electrónico' },
  schedules: { title: 'Fechas de clase', columns: 'Fecha · Hora inicio · Hora fin' },
}

const STATUS_LABEL: Record<ImportStudentStatus, string> = {
  new: 'Nuevo',
  existing: 'Existente',
  reactivated: 'Reactivado',
}

function ModulesPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [graceInput, setGraceInput] = useState(String(DEFAULT_GRACE_MINUTES))
  const [files, setFiles] = useState<Partial<ImportFiles>>({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [formVersion, setFormVersion] = useState(0)

  const activeQuery = useQuery({ queryKey: ACTIVE_MODULE_KEY, queryFn: getActiveModule })
  const previewMutation = useMutation({ mutationFn: previewModuleImport })
  const activateMutation = useMutation({
    mutationFn: activateModule,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ACTIVE_MODULE_KEY }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ])
      setConfirmOpen(false)
      setName('')
      setGraceInput(String(DEFAULT_GRACE_MINUTES))
      setFiles({})
      setFormVersion((value) => value + 1)
      previewMutation.reset()
      setNotice(`Módulo «${result.module.name}» activado con ${result.students.total} estudiantes, ${result.schedules.total} fechas de clase y ${result.graceMinutes} minutos de tolerancia.`)
    },
    onError: (error) => {
      // The server re-validates the files; show the fresh errors in the preview.
      if (axios.isAxiosError(error) && error.response?.status === 422 && isComplete(files)) {
        setConfirmOpen(false)
        previewMutation.mutate(files)
      }
    },
  })

  const preview = previewMutation.data
  const trimmedName = name.replace(/\s+/g, ' ').trim()
  const nameValid = trimmedName.length > 0 && trimmedName.length <= MODULE_NAME_MAX
  const graceMinutes = parseGraceMinutes(graceInput)
  const busy = previewMutation.isPending || activateMutation.isPending

  function changeFile(kind: ImportFileKind, file: File | null) {
    setNotice('')
    setFormError('')
    previewMutation.reset()
    if (file) {
      const problem = validateFile(file)
      if (problem) {
        setFormError(`${FILE_COPY[kind].title}: ${problem}`)
        return
      }
    }
    setFiles((current) => ({ ...current, [kind]: file ?? undefined }))
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setFormError('')
    if (!isComplete(files)) return setFormError('Selecciona el archivo de estudiantes y el de fechas de clase.')
    previewMutation.mutate(files)
  }

  function openConfirm() {
    setFormError('')
    if (!nameValid) return setFormError(`Escribe el nombre del módulo (máximo ${MODULE_NAME_MAX} caracteres).`)
    if (graceMinutes === null) return setFormError(`El tiempo de gracia debe ser un número entero entre 0 y ${MAX_GRACE_MINUTES} minutos.`)
    activateMutation.reset()
    setAcknowledged(false)
    setConfirmOpen(true)
  }

  function confirmActivation() {
    if (!isComplete(files) || !acknowledged || graceMinutes === null) return
    activateMutation.mutate({ name: trimmedName, graceMinutes, files })
  }

  return (
    <main className="dashboard-content">
      <section className="users-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h2>Módulos</h2>
          <p>Configura el módulo activo o carga los estudiantes y las fechas para iniciar uno nuevo.</p>
        </div>
      </section>

      {notice && <p className="users-notice" role="status">{notice}</p>}

      <ActiveModuleCard query={activeQuery} onGraceSaved={setNotice} />

      <Card className="users-card">
        <CardContent className="users-card-content">
          <form key={formVersion} className="modules-form" onSubmit={validate} noValidate>
            <StepHeading step={1} title="Datos y archivos" description="Usa las plantillas para evitar errores de formato. Solo se admiten archivos .xlsx de hasta 2 MB." />
            <div className="modules-fields">
              <Field>
                <FieldLabel htmlFor="module-name">Nombre del módulo</FieldLabel>
                <Input
                  id="module-name"
                  value={name}
                  maxLength={MODULE_NAME_MAX}
                  placeholder="Ej.: Módulo 3 - Desarrollo Backend"
                  onChange={(event) => { setName(event.currentTarget.value); setNotice('') }}
                  aria-invalid={Boolean(name) && !nameValid}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="module-grace">Tiempo de gracia (minutos)</FieldLabel>
                <Input
                  id="module-grace"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_GRACE_MINUTES}
                  step={1}
                  value={graceInput}
                  onChange={(event) => { setGraceInput(event.currentTarget.value); setNotice('') }}
                  aria-invalid={graceMinutes === null}
                  aria-describedby="module-grace-hint"
                  required
                />
                <span id="module-grace-hint" className="profile-hint">Dentro de este margen es Presente; después, Atraso.</span>
              </Field>
            </div>
            <div className="modules-upload-grid">
              {(['students', 'schedules'] as const).map((kind) => (
                <FileDropZone
                  key={kind}
                  kind={kind}
                  file={files[kind]}
                  disabled={busy}
                  onChange={(file) => changeFile(kind, file)}
                />
              ))}
            </div>
            {formError && <p className="users-error" role="alert">{formError}</p>}
            {previewMutation.error && <p className="users-error" role="alert">{getModulesError(previewMutation.error)}</p>}
            <div className="modules-actions">
              <Button type="submit" disabled={!isComplete(files) || busy}>
                <FileSpreadsheet aria-hidden="true" />
                {previewMutation.isPending ? 'Validando…' : 'Validar archivos'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {preview && (
        <PreviewSection
          preview={preview}
          canActivate={preview.valid && nameValid && graceMinutes !== null && !busy}
          nameMissing={!nameValid}
          graceMinutes={graceMinutes}
          onActivate={openConfirm}
        />
      )}

      <Dialog.Root open={confirmOpen} onOpenChange={(open) => { if (!open && !activateMutation.isPending) setConfirmOpen(false) }}>
        {confirmOpen && preview && (
          <Dialog.Portal>
            <Dialog.Backdrop className="users-dialog-backdrop" />
            <Dialog.Popup className="users-dialog users-confirm-dialog">
              <Dialog.Title className="users-dialog-title">Activar nuevo módulo</Dialog.Title>
              <Dialog.Description className="users-dialog-description">
                Se activará <strong>{trimmedName}</strong> con {preview.students.total} estudiantes, {preview.schedules.total} fechas de clase y <strong>{graceMinutes} minutos</strong> de tolerancia. El nuevo módulo empezará sin registros de asistencia.
              </Dialog.Description>
              {preview.activeModule && (
                <p className="modules-confirm-warning">
                  <TriangleAlert aria-hidden="true" />
                  <span>El módulo <strong>{preview.activeModule.name}</strong> dejará de estar activo. Sus datos se conservan, pero ya no se mostrarán en la operación diaria.</span>
                </p>
              )}
              <label className="modules-confirm-check">
                <input type="checkbox" checked={acknowledged} disabled={activateMutation.isPending} onChange={(event) => setAcknowledged(event.currentTarget.checked)} />
                <span>{preview.activeModule ? 'Entiendo que el módulo actual dejará de estar activo.' : 'Confirmo que los datos son correctos.'}</span>
              </label>
              {activateMutation.error && <p className="users-error" role="alert">{getModulesError(activateMutation.error)}</p>}
              <div className="users-dialog-actions">
                <Button variant="outline" disabled={activateMutation.isPending} onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                <Button variant="destructive" disabled={!acknowledged || activateMutation.isPending} onClick={confirmActivation}>
                  {activateMutation.isPending ? 'Activando…' : 'Activar módulo'}
                </Button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </main>
  )
}

function ActiveModuleCard({
  query,
  onGraceSaved,
}: {
  query: UseQueryResult<ActiveModuleSummary | null>
  onGraceSaved: (message: string) => void
}) {
  const [editingGrace, setEditingGrace] = useState(false)
  if (query.isPending) {
    return <section className="modules-active modules-active-muted"><FolderClock aria-hidden="true" /><p>Cargando módulo activo…</p></section>
  }
  if (query.isError) {
    return (
      <section className="modules-active modules-active-muted">
        <CircleAlert aria-hidden="true" />
        <p>{getModulesError(query.error)}</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reintentar</Button>
      </section>
    )
  }
  const module = query.data
  if (!module) {
    return (
      <section className="modules-active modules-active-muted">
        <FolderClock aria-hidden="true" />
        <div>
          <p className="eyebrow">MÓDULO ACTIVO</p>
          <p>Todavía no hay un módulo activo. Carga los archivos para crear el primero.</p>
        </div>
      </section>
    )
  }
  return (
    <section className="modules-active" aria-label="Módulo activo">
      <div className="modules-active-title">
        <p className="eyebrow">MÓDULO ACTIVO</p>
        <h3>{module.name}</h3>
        <p>Activado el {formatDateTime(module.activatedAt)}</p>
      </div>
      <dl className="modules-active-stats">
        <div><dt>Estudiantes</dt><dd>{module.studentsCount}</dd></div>
        <div><dt>Fechas de clase</dt><dd>{module.schedulesCount}</dd></div>
        <div>
          <dt>Tolerancia</dt>
          <dd className="modules-active-grace">
            {module.graceMinutes} min
            <Button variant="outline" size="icon-xs" aria-label="Editar tiempo de gracia" onClick={() => setEditingGrace(true)}>
              <Pencil aria-hidden="true" />
            </Button>
          </dd>
        </div>
        <div className="modules-active-period"><dt>Periodo</dt><dd>{formatDateRange(module.firstDate, module.lastDate)}</dd></div>
      </dl>
      <GracePeriodDialog
        open={editingGrace}
        current={module.graceMinutes}
        onClose={() => setEditingGrace(false)}
        onSaved={(message) => { setEditingGrace(false); onGraceSaved(message) }}
      />
    </section>
  )
}

function GracePeriodDialog({
  open,
  current,
  onClose,
  onSaved,
}: {
  open: boolean
  current: number
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: updateGracePeriod,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ACTIVE_MODULE_KEY })
      onSaved(result.unchanged
        ? 'El tiempo de gracia no cambió.'
        : `Tiempo de gracia actualizado a ${result.graceMinutes} minutos para ${result.updatedSchedules} ${result.updatedSchedules === 1 ? 'clase' : 'clases'} de hoy en adelante.`)
    },
  })

  function close() {
    if (mutation.isPending) return
    mutation.reset()
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close() }}>
      {open && (
        <Dialog.Portal>
          <Dialog.Backdrop className="users-dialog-backdrop" />
          <Dialog.Popup className="users-dialog users-confirm-dialog">
            <Dialog.Title className="users-dialog-title">Tiempo de gracia</Dialog.Title>
            <Dialog.Description className="users-dialog-description">
              Minutos desde la hora de inicio en los que la marca cuenta como <strong>Presente</strong>; después cuenta como <strong>Atraso</strong>. Se aplica a las clases de hoy en adelante; las fechas pasadas conservan su tolerancia.
            </Dialog.Description>
            <GracePeriodForm
              key={current}
              current={current}
              busy={mutation.isPending}
              serverError={mutation.error ? getModulesError(mutation.error) : ''}
              onCancel={close}
              onSubmit={(minutes) => mutation.mutate(minutes)}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}

function GracePeriodForm({
  current,
  busy,
  serverError,
  onCancel,
  onSubmit,
}: {
  current: number
  busy: boolean
  serverError: string
  onCancel: () => void
  onSubmit: (minutes: number) => void
}) {
  const [value, setValue] = useState(String(current))
  const minutes = parseGraceMinutes(value)
  const unchanged = minutes === current

  return (
    <form
      className="user-form"
      noValidate
      onSubmit={(event) => { event.preventDefault(); if (minutes !== null && !unchanged) onSubmit(minutes) }}
    >
      <Field>
        <FieldLabel htmlFor="grace-minutes">Minutos de tolerancia</FieldLabel>
        <Input
          id="grace-minutes"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_GRACE_MINUTES}
          step={1}
          value={value}
          disabled={busy}
          autoFocus
          aria-invalid={minutes === null}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
        <span className="profile-hint">Número entero entre 0 y {MAX_GRACE_MINUTES}. Con 0, cualquier marca después del inicio es Atraso.</span>
      </Field>
      {minutes === null && <p className="users-error" role="alert">Ingresa un número entero entre 0 y {MAX_GRACE_MINUTES}.</p>}
      {serverError && <p className="users-error" role="alert">{serverError}</p>}
      <div className="users-dialog-actions">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={busy || minutes === null || unchanged}>{busy ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  )
}

function StepHeading({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="modules-step">
      <span className="modules-step-number" aria-hidden="true">{step}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

function FileDropZone({
  kind,
  file,
  disabled,
  onChange,
}: {
  kind: ImportFileKind
  file?: File
  disabled: boolean
  onChange: (file: File | null) => void
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [templateError, setTemplateError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const copy = FILE_COPY[kind]

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const dropped = event.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  async function download() {
    setTemplateError('')
    setDownloading(true)
    try {
      await downloadTemplate(kind)
    } catch (error) {
      setTemplateError(getModulesError(error))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="modules-upload">
      <div className="modules-upload-header">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.columns}</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={downloading} onClick={() => void download()}>
          <Download aria-hidden="true" /> {downloading ? 'Descargando…' : 'Plantilla'}
        </Button>
      </div>
      {file ? (
        <div className="modules-file">
          <FileSpreadsheet aria-hidden="true" />
          <div>
            <strong>{file.name}</strong>
            <span>{formatBytes(file.size)}</span>
          </div>
          <Button type="button" variant="outline" size="icon-sm" disabled={disabled} aria-label={`Quitar archivo de ${copy.title.toLowerCase()}`} onClick={() => onChange(null)}>
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`modules-dropzone ${dragging ? 'modules-dropzone-active' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <FolderUp aria-hidden="true" />
          <span><strong>Selecciona</strong> o arrastra el archivo .xlsx</span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={disabled}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0]
          // Reset so picking the same file again still triggers validation.
          event.currentTarget.value = ''
          if (selected) onChange(selected)
        }}
      />
      {templateError && <p className="users-error" role="alert">{templateError}</p>}
    </div>
  )
}

function PreviewSection({
  preview,
  canActivate,
  nameMissing,
  graceMinutes,
  onActivate,
}: {
  preview: ImportPreview
  canActivate: boolean
  nameMissing: boolean
  graceMinutes: number | null
  onActivate: () => void
}) {
  const { students, schedules } = preview
  return (
    <Card className="users-card">
      <CardContent className="users-card-content">
        <StepHeading
          step={2}
          title="Vista previa"
          description={preview.valid
            ? 'Revisa los datos antes de activar el módulo.'
            : 'Corrige los errores en los archivos y vuelve a validarlos.'}
        />

        <div className="stats-grid">
          <article className="stat-card">
            <div className="stat-heading"><span>Estudiantes</span><Users aria-hidden="true" /></div>
            <strong>{students.total}</strong>
            <p>{students.new} nuevos · {students.existing} existentes · {students.reactivated} reactivados</p>
          </article>
          <article className="stat-card">
            <div className="stat-heading"><span>Fechas de clase</span><CalendarDays aria-hidden="true" /></div>
            <strong>{schedules.total}</strong>
            <p>{graceMinutes === null ? 'Revisa el tiempo de gracia' : `Tolerancia de ${graceMinutes} min desde el inicio`}</p>
          </article>
          <article className="stat-card">
            <div className="stat-heading"><span>Periodo</span><FolderClock aria-hidden="true" /></div>
            <strong className="modules-stat-range">{formatDateRange(schedules.firstDate, schedules.lastDate)}</strong>
            <p>Primera y última fecha de clase</p>
          </article>
        </div>

        {preview.issuesTotal > 0 && (
          <IssueList
            tone="error"
            title={`${preview.issuesTotal} ${preview.issuesTotal === 1 ? 'error debe corregirse' : 'errores deben corregirse'}`}
            issues={preview.issues}
            hidden={preview.issuesTotal - preview.issues.length}
          />
        )}
        {preview.warnings.length > 0 && (
          <IssueList tone="warning" title="Advertencias" issues={preview.warnings} hidden={0} />
        )}

        {(students.total > 0 || schedules.total > 0) && (
          <div className="modules-preview-grid">
            <section className="modules-preview-panel" aria-label="Estudiantes a importar">
              <h4>Estudiantes válidos <span>{students.total}</span></h4>
              <div className="users-table-wrap modules-table-scroll">
                <table className="users-table modules-table">
                  <caption className="sr-only">Estudiantes a importar</caption>
                  <thead>
                    <tr>
                      <th scope="col">Registro</th>
                      <th scope="col">Nombre</th>
                      <th scope="col">Correo</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.rows.map((student) => (
                      <tr key={student.registrationNo}>
                        <td className="user-registration">{student.registrationNo}</td>
                        <td>{student.fullName}</td>
                        <td className="modules-email">{student.email}</td>
                        <td>
                          <span className={`modules-badge modules-badge-${student.status}`}>{STATUS_LABEL[student.status]}</span>
                          {student.changed && <span className="modules-badge-note">Se actualizan sus datos</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="modules-preview-panel" aria-label="Fechas de clase a importar">
              <h4>Fechas válidas <span>{schedules.total}</span></h4>
              <div className="users-table-wrap modules-table-scroll">
                <table className="users-table modules-table">
                  <caption className="sr-only">Fechas de clase a importar</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Hora inicio</th>
                      <th scope="col">Hora fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.rows.map((schedule) => (
                      <tr key={schedule.classDate}>
                        <td className="user-registration">{formatIsoDate(schedule.classDate)}</td>
                        <td>{schedule.startTime}</td>
                        <td>{schedule.endTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <footer className="modules-preview-footer">
          <p>{!preview.valid
            ? 'No se puede activar el módulo mientras haya errores.'
            : nameMissing
              ? 'Escribe el nombre del módulo en el paso 1 para poder activarlo.'
              : 'Los archivos son válidos. Al activar, se pedirá confirmación.'}</p>
          <Button variant="destructive" disabled={!canActivate} onClick={onActivate}>Activar módulo</Button>
        </footer>
      </CardContent>
    </Card>
  )
}

function IssueList({
  tone,
  title,
  issues,
  hidden,
}: {
  tone: 'error' | 'warning'
  title: string
  issues: ImportIssue[]
  hidden: number
}) {
  const Icon = tone === 'error' ? CircleAlert : TriangleAlert
  return (
    <section className={`modules-issues modules-issues-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <h4><Icon aria-hidden="true" /> {title}</h4>
      <div className="users-table-wrap modules-table-scroll modules-issues-scroll">
        <table className="users-table modules-table">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Archivo</th>
              <th scope="col">Fila</th>
              <th scope="col">Columna</th>
              <th scope="col">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, index) => (
              <tr key={`${issue.file}-${issue.row}-${issue.column}-${index}`}>
                <td>{FILE_COPY[issue.file].title}</td>
                <td className="user-registration">{issue.row ?? '—'}</td>
                <td>{issue.column ?? '—'}</td>
                <td>{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && <p className="modules-issues-more">Y {hidden} más. Corrige los anteriores y vuelve a validar.</p>}
    </section>
  )
}

function isComplete(files: Partial<ImportFiles>): files is ImportFiles {
  return Boolean(files.students && files.schedules)
}

function validateFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) return 'el archivo debe ser un Excel (.xlsx).'
  if (file.size === 0) return 'el archivo está vacío.'
  if (file.size > MAX_IMPORT_FILE_BYTES) return 'el archivo supera el máximo de 2 MB.'
  return ''
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
}

function getModulesError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Ocurrió un error inesperado.'
  const status = error.response?.status
  const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
  const text = (Array.isArray(message) ? message.join(' ') : message ?? '').toLowerCase()
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permisos para administrar módulos.'
  if (status === 413) return 'Cada archivo puede pesar como máximo 2 MB.'
  if (status === 422) return 'Los archivos contienen errores. Revisa la vista previa.'
  if (status === 409) return 'Los datos cambiaron mientras se activaba el módulo. Vuelve a validar los archivos.'
  if (status === 404 && text.includes('no active module')) return 'No hay un módulo activo.'
  if (status === 400) {
    if (text.includes('graceminutes')) return `El tiempo de gracia debe ser un número entero entre 0 y ${MAX_GRACE_MINUTES} minutos.`
    if (text.includes('name')) return `Revisa el nombre del módulo (máximo ${MODULE_NAME_MAX} caracteres).`
    if (text.includes('xlsx') || text.includes('file')) return 'Ambos archivos deben ser Excel (.xlsx) válidos.'
    return 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.'
  }
  if (!status) return 'No se pudo conectar con el servidor.'
  return 'No se pudo completar la operación. Inténtalo nuevamente.'
}
