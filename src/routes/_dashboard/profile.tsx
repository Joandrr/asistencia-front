/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { changePassword } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_dashboard/profile')({
  component: ProfilePage,
})

function utf8Length(value: string) {
  return new TextEncoder().encode(value).length
}

function getErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Ocurrió un error inesperado. Inténtalo nuevamente.'
  const status = error.response?.status
  const message = error.response?.data?.message
  if (status === 401 && message === 'Current password is incorrect') {
    return 'La contraseña actual es incorrecta.'
  }
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (typeof message === 'string' && message.includes('72 UTF-8 bytes')) {
    return 'La nueva contraseña no puede superar los 72 bytes en UTF-8.'
  }
  if (typeof message === 'string' && message.includes('different from the current')) {
    return 'La nueva contraseña debe ser diferente de la actual.'
  }
  return 'No se pudo cambiar la contraseña. Inténtalo nuevamente.'
}

function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const mutation = useMutation({ mutationFn: changePassword })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [validationError, setValidationError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const passwordBytes = utf8Length(newPassword)
  const canSubmit = Boolean(
    currentPassword
    && newPassword.length >= 8
    && passwordBytes <= 72
    && newPassword !== currentPassword
    && confirmation === newPassword,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccessMessage('')
    setValidationError('')
    if (!currentPassword) return setValidationError('Ingresa tu contraseña actual.')
    if (newPassword.length < 8) return setValidationError('La nueva contraseña debe tener al menos 8 caracteres.')
    if (passwordBytes > 72) return setValidationError('La nueva contraseña no puede superar los 72 bytes en UTF-8.')
    if (newPassword === currentPassword) return setValidationError('La nueva contraseña debe ser diferente de la actual.')
    if (confirmation !== newPassword) return setValidationError('La confirmación no coincide con la nueva contraseña.')

    mutation.mutate({ currentPassword, newPassword }, {
      onSuccess: (result) => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmation('')
        setSuccessMessage(result.message === 'Password changed successfully'
          ? 'Tu contraseña se cambió correctamente.'
          : 'Contraseña actualizada.')
      },
    })
  }

  return (
    <main className="dashboard-content">
      <section className="profile-heading">
        <div>
          <p className="eyebrow">CUENTA</p>
          <h2>Mi perfil</h2>
          <p>Información de tu cuenta y seguridad.</p>
        </div>
      </section>

      <Card className="profile-card">
        <CardHeader>
          <CardTitle>Datos de la cuenta</CardTitle>
        </CardHeader>
        <CardContent className="profile-details">
          <div><span>Nombre</span><strong>{user?.fullName || 'No especificado'}</strong></div>
          <div><span>Registro</span><strong>{user?.registrationNo || '—'}</strong></div>
          <div><span>Rol</span><strong>{user?.role === 'admin' ? 'Administrador' : 'Estudiante'}</strong></div>
        </CardContent>
      </Card>

      <Card className="profile-card">
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <p className="profile-description">Confirma tu contraseña actual para establecer una nueva.</p>
        </CardHeader>
        <CardContent>
          <form className="password-form" onSubmit={handleSubmit} noValidate>
            <Field>
              <FieldLabel htmlFor="current-password">Contraseña actual</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">Nueva contraseña</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.currentTarget.value)}
                aria-invalid={Boolean(newPassword) && (newPassword.length < 8 || passwordBytes > 72)}
                required
              />
              <span className="profile-hint">Mínimo 8 caracteres · {passwordBytes}/72 bytes UTF-8</span>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirmar nueva contraseña</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
                aria-invalid={Boolean(confirmation) && confirmation !== newPassword}
                required
              />
              {confirmation && confirmation !== newPassword && (
                <p className="registration-error" role="alert">Las contraseñas no coinciden.</p>
              )}
            </Field>
            {validationError && <p className="registration-error" role="alert">{validationError}</p>}
            {mutation.error && <p className="registration-error" role="alert">{getErrorMessage(mutation.error)}</p>}
            {successMessage && <p className="profile-success" role="status">{successMessage}</p>}
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
