/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useState, type FormEvent } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import { ClipboardCheck, GraduationCap, Search, UserPlus } from 'lucide-react'
import {
  addModuleStudent,
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
import { Field, FieldLabel } from '@/components/ui/field'
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
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
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
        {!noActiveModule && (
          <Button onClick={() => { setNotice(''); setAdding(true) }} disabled={!result}>
            <UserPlus aria-hidden="true" /> Añadir estudiante
          </Button>
        )}
      </section>

      {notice && <p className="users-notice" role="status">{notice}</p>}

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
                    <th scope="col" className="attendance-admin-num">Atrasos</th>
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
                      <td className="attendance-admin-num">{student.late}</td>
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

      <AddStudentDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={async (message) => {
          await queryClient.invalidateQueries({ queryKey: [ATTENDANCE_ADMIN_KEY] })
          setAdding(false)
          setNotice(message)
        }}
      />
    </main>
  )
}

const ADD_STATUS_TEXT = {
  new: 'fue registrado e inscrito en el módulo. Su contraseña inicial es su número de registro.',
  existing: 'fue inscrito en el módulo con su cuenta existente.',
  reactivated: 'fue reactivado e inscrito en el módulo.',
} as const

function AddStudentDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (message: string) => Promise<void>
}) {
  const mutation = useMutation({
    mutationFn: addModuleStudent,
    onSuccess: (result) => onAdded(
      `${result.student.fullName} (${result.student.registrationNo}) ${ADD_STATUS_TEXT[result.status]} Las clases anteriores figuran como falta; puedes corregirlas en Asistencias.`,
    ),
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
          <Dialog.Popup className="users-dialog">
            <Dialog.Title className="users-dialog-title">Añadir estudiante</Dialog.Title>
            <Dialog.Description className="users-dialog-description">
              Inscribe al módulo activo a un estudiante que no estaba en el Excel. Si el número de registro ya existe, se usa la cuenta existente; si es nuevo, su contraseña inicial será su número de registro.
            </Dialog.Description>
            <AddStudentForm
              busy={mutation.isPending}
              serverError={mutation.error ? getAttendanceAdminError(mutation.error) : ''}
              onCancel={close}
              onSubmit={(payload) => mutation.mutate(payload)}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AddStudentForm({
  busy,
  serverError,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  serverError: string
  onCancel: () => void
  onSubmit: (payload: { registrationNo: string; fullName: string; email: string }) => void
}) {
  const [registrationNo, setRegistrationNo] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const name = fullName.replace(/\s+/g, ' ').trim()
  const mail = email.trim().toLowerCase()
  const registrationValid = /^\d{6,12}$/.test(registrationNo)
  const nameValid = name.length > 0 && name.length <= 200 && /\p{L}/u.test(name)
  const emailValid = mail.length <= 254 && EMAIL_PATTERN.test(mail)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!registrationValid) return setFormError('El número de registro debe tener entre 6 y 12 dígitos.')
    if (!nameValid) return setFormError('El nombre completo es obligatorio (máximo 200 caracteres y con letras).')
    if (!emailValid) return setFormError('Ingresa un correo electrónico válido.')
    onSubmit({ registrationNo, fullName: name, email: mail })
  }

  return (
    <form className="user-form" onSubmit={submit} noValidate>
      <Field>
        <FieldLabel htmlFor="student-registration">Número de registro</FieldLabel>
        <Input
          id="student-registration"
          inputMode="numeric"
          maxLength={12}
          autoFocus
          value={registrationNo}
          disabled={busy}
          aria-invalid={Boolean(registrationNo) && !registrationValid}
          onChange={(event) => setRegistrationNo(event.currentTarget.value.replace(/\D/g, '').slice(0, 12))}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="student-name">Nombre completo</FieldLabel>
        <Input id="student-name" maxLength={200} value={fullName} disabled={busy} onChange={(event) => setFullName(event.currentTarget.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="student-email">Correo electrónico</FieldLabel>
        <Input
          id="student-email"
          type="email"
          maxLength={254}
          value={email}
          disabled={busy}
          aria-invalid={Boolean(email) && !emailValid}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </Field>
      {(formError || serverError) && <p className="users-error" role="alert">{formError || serverError}</p>}
      <div className="users-dialog-actions">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={busy || !registrationValid || !nameValid || !emailValid}>{busy ? 'Añadiendo…' : 'Añadir estudiante'}</Button>
      </div>
    </form>
  )
}
