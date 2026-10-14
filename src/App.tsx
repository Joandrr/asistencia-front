import { useNavigate } from '@tanstack/react-router'
import { CalendarCheck2 } from 'lucide-react'
import { LoginForm } from '@/components/login-form'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <main className="login-screen">
      <div className="login-brand">
        <div className="brand-mark"><CalendarCheck2 aria-hidden="true" /></div>
        <span>Asistencia</span>
      </div>
      <div className="login-content">
        <LoginForm onSubmit={(event) => { event.preventDefault(); void navigate({ to: '/dashboard' }) }} />
        <p className="demo-note">Vista de demostración · el acceso no se valida con un servidor</p>
      </div>
    </main>
  )
}
