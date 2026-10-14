import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { CalendarCheck2 } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { login } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth-store'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      setSession(response.access_token, response.expires_in, response.user)
      void navigate({ to: '/dashboard' })
    },
  })

  const errorMessage = loginMutation.error
    ? axios.isAxiosError(loginMutation.error)
      ? loginMutation.error.response?.status === 401
        ? 'El registro o la contraseña son incorrectos.'
        : loginMutation.error.response
          ? 'No se pudo iniciar sesión. Inténtalo nuevamente.'
          : 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo otra vez.'
      : 'Ocurrió un error inesperado. Inténtalo nuevamente.'
    : undefined

  return (
    <main className="login-screen">
      <div className="login-brand">
        <div className="brand-mark"><CalendarCheck2 aria-hidden="true" /></div>
        <span>Asistencia</span>
      </div>
      <div className="login-content">
        <LoginForm
          isSubmitting={loginMutation.isPending}
          errorMessage={errorMessage}
          onSubmit={(credentials) => loginMutation.mutate(credentials)}
        />
      </div>
    </main>
  )
}
