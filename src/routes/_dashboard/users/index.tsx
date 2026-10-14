/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import axios from 'axios'
import { Pencil, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react'
import {
  createUser,
  deleteUser,
  getUsers,
  restoreUser,
  updateUser,
  type CreateUserPayload,
  type ManagedUser,
  type UpdateUserPayload,
  type UserRole,
} from '@/lib/auth'
import { hasValidSession, useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_dashboard/users/')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!hasValidSession()) throw redirect({ to: '/' })
    if (user?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  component: UsersPage,
})

type ModalState =
  | { kind: 'form'; user?: ManagedUser }
  | { kind: 'delete'; user: ManagedUser }
  | null

function UsersPage() {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('')
  const [modal, setModal] = useState<ModalState>(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const usersQuery = useQuery({
    queryKey: ['users', { page, limit: 10, q: search, role: roleFilter }],
    queryFn: () => getUsers({
      page,
      limit: 10,
      q: search.trim() || undefined,
      role: roleFilter || undefined,
    }),
    placeholderData: (previousData) => previousData,
  })

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] })
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setPage(1)
      await invalidateUsers()
      setModal(null)
      setNotice('Usuario creado correctamente.')
      setActionError('')
    },
  })
  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      await invalidateUsers()
      setModal(null)
      setNotice('Usuario actualizado correctamente.')
      setActionError('')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await invalidateUsers()
      setModal(null)
      setNotice('Usuario desactivado. Puedes restaurarlo desde esta lista.')
      setActionError('')
    },
  })
  const restoreMutation = useMutation({
    mutationFn: restoreUser,
    onSuccess: async () => {
      await invalidateUsers()
      setNotice('Usuario restaurado correctamente.')
      setActionError('')
    },
    onError: (error) => setActionError(getUsersError(error)),
  })

  const rows = usersQuery.data?.data ?? []
  const meta = usersQuery.data?.meta
  const totalPages = Math.max(1, meta?.totalPages ?? 1)
  const activeMutation = modal?.kind === 'form'
    ? modal.user ? updateMutation : createMutation
    : deleteMutation

  function openCreateModal() {
    createMutation.reset()
    updateMutation.reset()
    setNotice('')
    setActionError('')
    setModal({ kind: 'form' })
  }

  function openEditModal(user: ManagedUser) {
    updateMutation.reset()
    setNotice('')
    setActionError('')
    setModal({ kind: 'form', user })
  }

  function openDeleteModal(user: ManagedUser) {
    deleteMutation.reset()
    setNotice('')
    setActionError('')
    setModal({ kind: 'delete', user })
  }

  function submitUser(payload: CreateUserPayload | UpdateUserPayload) {
    if (modal?.kind !== 'form') return
    setNotice('')
    setActionError('')
    if (modal.user) {
      updateMutation.mutate({ id: modal.user.id, payload: payload as UpdateUserPayload })
    } else {
      createMutation.mutate(payload as CreateUserPayload)
    }
  }

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <main className="dashboard-content">
      <section className="users-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h2>Usuarios</h2>
          <p>Crea y administra las cuentas de la institución.</p>
        </div>
        <Button onClick={openCreateModal}><Plus aria-hidden="true" /> Crear usuario</Button>
      </section>

      {notice && <p className="users-notice" role="status">{notice}</p>}
      {actionError && <p className="users-error" role="alert">{actionError}</p>}

      <Card className="users-card">
        <CardContent className="users-card-content">
          <div className="users-toolbar">
            <label className="users-search">
              <Search aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => changeSearch(event.currentTarget.value)}
                placeholder="Buscar por registro o nombre"
                maxLength={100}
                aria-label="Buscar usuarios por registro o nombre"
              />
            </label>
            <label className="users-filter">
              <span>Rol</span>
              <select
                value={roleFilter}
                onChange={(event) => { setRoleFilter(event.currentTarget.value as '' | UserRole); setPage(1) }}
                aria-label="Filtrar usuarios por rol"
              >
                <option value="">Todos</option>
                <option value="student">Estudiantes</option>
                <option value="admin">Administradores</option>
              </select>
            </label>
          </div>

          {usersQuery.isPending ? (
            <div className="users-empty"><Users aria-hidden="true" /><p>Cargando usuarios…</p></div>
          ) : usersQuery.isError ? (
            <div className="users-empty"><p>{getUsersError(usersQuery.error)}</p><Button variant="outline" onClick={() => void usersQuery.refetch()}>Reintentar</Button></div>
          ) : rows.length === 0 ? (
            <div className="users-empty"><Users aria-hidden="true" /><p>No se encontraron usuarios.</p></div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <caption className="sr-only">Usuarios de la institución</caption>
                <thead>
                  <tr>
                    <th scope="col">Registro</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Programa académico</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id}>
                      <td className="user-registration">{user.registrationNo}</td>
                      <td>{user.fullName}</td>
                      <td>{user.role === 'admin' ? 'Administrador' : 'Estudiante'}</td>
                      <td>{user.degreeProgram || '—'}</td>
                      <td><span className={`user-status ${user.deletedAt ? 'user-status-inactive' : ''}`}>{user.deletedAt ? 'Desactivado' : 'Activo'}</span></td>
                      <td>
                        <div className="user-actions">
                          {user.deletedAt ? (
                            <Button variant="outline" size="sm" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(user.id)}>
                              <RotateCcw aria-hidden="true" /> Restaurar
                            </Button>
                          ) : (
                            <>
                              <Button variant="outline" size="icon-sm" aria-label={`Editar a ${user.fullName}`} onClick={() => openEditModal(user)}>
                                <Pencil aria-hidden="true" />
                              </Button>
                              <Button variant="outline" size="icon-sm" aria-label={`Desactivar a ${user.fullName}`} disabled={user.id === currentUserId} onClick={() => openDeleteModal(user)}>
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="users-pagination">
            <span>{meta ? `${meta.total} usuarios · Página ${meta.page} de ${totalPages}` : ' '}</span>
            <div>
              <Button variant="outline" size="sm" disabled={page <= 1 || usersQuery.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || usersQuery.isFetching} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</Button>
            </div>
          </footer>
        </CardContent>
      </Card>

      <Dialog.Root open={Boolean(modal)} onOpenChange={(open) => { if (!open && !activeMutation.isPending) setModal(null) }}>
        {modal?.kind === 'form' && (
          <Dialog.Portal>
            <Dialog.Backdrop className="users-dialog-backdrop" />
            <Dialog.Popup className="users-dialog">
              <Dialog.Title className="users-dialog-title">{modal.user ? 'Editar usuario' : 'Crear usuario'}</Dialog.Title>
              <Dialog.Description className="users-dialog-description">
                {modal.user ? 'Actualiza los datos de la cuenta.' : 'Completa los datos para crear una cuenta institucional.'}
              </Dialog.Description>
              <UserForm
                key={modal.user?.id ?? 'new-user'}
                user={modal.user}
                busy={activeMutation.isPending}
                serverError={activeMutation.error ? getUsersError(activeMutation.error) : ''}
                onCancel={() => setModal(null)}
                onSubmit={submitUser}
              />
            </Dialog.Popup>
          </Dialog.Portal>
        )}
        {modal?.kind === 'delete' && (
          <Dialog.Portal>
            <Dialog.Backdrop className="users-dialog-backdrop" />
            <Dialog.Popup className="users-dialog users-confirm-dialog">
              <Dialog.Title className="users-dialog-title">Desactivar usuario</Dialog.Title>
              <Dialog.Description className="users-dialog-description">
                ¿Seguro que quieres desactivar a <strong>{modal.user.fullName}</strong> ({modal.user.registrationNo})? La cuenta se conservará y podrá restaurarse después.
              </Dialog.Description>
              {deleteMutation.error && <p className="users-error" role="alert">{getUsersError(deleteMutation.error)}</p>}
              <div className="users-dialog-actions">
                <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setModal(null)}>Cancelar</Button>
                <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(modal.user.id)}>
                  {deleteMutation.isPending ? 'Desactivando…' : 'Desactivar'}
                </Button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </main>
  )
}

function UserForm({
  user,
  busy,
  serverError,
  onCancel,
  onSubmit,
}: {
  user?: ManagedUser
  busy: boolean
  serverError: string
  onCancel: () => void
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => void
}) {
  const [registrationNo, setRegistrationNo] = useState(user?.registrationNo ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'student')
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [degreeProgram, setDegreeProgram] = useState(user?.degreeProgram ?? '')
  const [formError, setFormError] = useState('')
  const registrationValid = /^\d{7,12}$/.test(registrationNo)
  const nameValid = Boolean(fullName.trim()) && fullName.trim().length <= 200
  const degreeValid = role === 'admin' || (Boolean(degreeProgram.trim()) && degreeProgram.trim().length <= 150)
  const passwordBytes = new TextEncoder().encode(password).length
  const passwordValid = Boolean(user) || (password.length >= 8 && passwordBytes <= 72)
  const canSubmit = registrationValid && nameValid && degreeValid && passwordValid

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!registrationValid) return setFormError('El registro debe tener entre 7 y 12 dígitos.')
    if (!nameValid) return setFormError('El nombre es obligatorio y admite hasta 200 caracteres.')
    if (!degreeValid) return setFormError('El programa académico es obligatorio para estudiantes (máximo 150 caracteres).')
    if (!passwordValid) return setFormError(password.length < 8
      ? 'La contraseña inicial debe tener al menos 8 caracteres.'
      : 'La contraseña inicial no puede superar los 72 bytes UTF-8.')

    if (user) {
      const payload: UpdateUserPayload = {
        registrationNo,
        role,
        fullName: fullName.trim(),
        degreeProgram: role === 'student' ? degreeProgram.trim() : null,
      }
      onSubmit(payload)
    } else {
      const payload: CreateUserPayload = {
        registrationNo,
        password,
        role,
        fullName: fullName.trim(),
        ...(role === 'student' ? { degreeProgram: degreeProgram.trim() } : {}),
      }
      onSubmit(payload)
    }
  }

  return (
    <form className="user-form" onSubmit={submit} noValidate>
      <Field>
        <FieldLabel htmlFor="user-registration">Registro</FieldLabel>
        <Input id="user-registration" inputMode="numeric" pattern="[0-9]{7,12}" maxLength={12} value={registrationNo} onChange={(event) => setRegistrationNo(event.currentTarget.value.replace(/\D/g, '').slice(0, 12))} aria-invalid={Boolean(registrationNo) && !registrationValid} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-name">Nombre completo</FieldLabel>
        <Input id="user-name" maxLength={200} value={fullName} onChange={(event) => setFullName(event.currentTarget.value)} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-role">Rol</FieldLabel>
        <select id="user-role" className="user-form-select" value={role} onChange={(event) => { const nextRole = event.currentTarget.value as UserRole; setRole(nextRole); if (nextRole === 'admin') setDegreeProgram('') }}>
          <option value="student">Estudiante</option>
          <option value="admin">Administrador</option>
        </select>
      </Field>
      {role === 'student' && (
        <Field>
          <FieldLabel htmlFor="user-degree">Programa académico</FieldLabel>
          <Input id="user-degree" maxLength={150} value={degreeProgram} onChange={(event) => setDegreeProgram(event.currentTarget.value)} required />
        </Field>
      )}
      {!user && (
        <Field>
          <FieldLabel htmlFor="user-password">Contraseña inicial</FieldLabel>
          <Input id="user-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.currentTarget.value)} required />
          <span className="profile-hint">Mínimo 8 caracteres · máximo 72 bytes UTF-8 ({passwordBytes}/72)</span>
        </Field>
      )}
      {user && <p className="user-form-hint">La contraseña se cambia desde el perfil del propio usuario.</p>}
      {(formError || serverError) && <p className="users-error" role="alert">{formError || serverError}</p>}
      <div className="users-dialog-actions">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={!canSubmit || busy}>{busy ? 'Guardando…' : user ? 'Guardar cambios' : 'Crear usuario'}</Button>
      </div>
    </form>
  )
}

function getUsersError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Ocurrió un error inesperado.'
  const axiosError = error as typeof error & { response?: { status?: number; data?: { message?: string | string[] } } }
  const status = axiosError.response?.status
  const message = axiosError.response?.data?.message
  const text = Array.isArray(message) ? message.join(' ') : message ?? ''
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permisos para administrar usuarios.'
  if (status === 409) {
    const normalized = text.toLowerCase()
    if (normalized.includes('registration')) return 'Ya existe una cuenta con ese número de registro.'
    if (normalized.includes('last active administrator')) return 'No puedes eliminar ni quitar el rol del último administrador activo.'
    if (normalized.includes('already active')) return 'El usuario ya está activo.'
    return text || 'La operación no se puede realizar por las reglas de seguridad de usuarios.'
  }
  if (status === 404) return 'No se encontró el usuario solicitado.'
  if (!status) return 'No se pudo conectar con el servidor.'
  return text || 'No se pudo completar la operación.'
}
