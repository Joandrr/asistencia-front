import { cn } from "cn"
import { CalendarCheck2 } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { LoginCredentials } from "@/lib/auth"

export function LoginForm({
  className,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  ...props
}: Omit<React.ComponentProps<"div">, "onSubmit"> & {
  onSubmit?: (credentials: LoginCredentials) => void
  isSubmitting?: boolean
  errorMessage?: string
}) {
  const [registration, setRegistration] = useState("")
  const [password, setPassword] = useState("")
  const [registrationError, setRegistrationError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [flashVersion, setFlashVersion] = useState(0)

  function showRegistrationError(message: string) {
    setRegistrationError(message)
    setFlashVersion((version) => version + 1)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^[0-9]{6,12}$/.test(registration)) {
      event.preventDefault()
      showRegistrationError(
        registration
          ? "El registro debe contener solo números (entre 6 y 12 dígitos)."
          : "El registro es obligatorio.",
      )
      return
    }
    if (password.length < 8) {
      event.preventDefault()
      setPasswordError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    setRegistrationError("")
    setPasswordError("")
    onSubmit?.({ registrationNo: registration, password })
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card className="login-card overflow-hidden p-0">
        <CardContent className="login-card-content grid p-0">
          <form className="login-form-fields" noValidate onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="login-title">Bienvenido de nuevo</h1>
                <p className="text-balance text-muted-foreground">
                  Ingresa a tu cuenta institucional
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="registro">Registro</FieldLabel>
                <Input
                  id="registro"
                  name="registro"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="Ingresa tu número de registro"
                  pattern="[0-9]{6,12}"
                  maxLength={12}
                  onChange={(event) => {
                    const rawValue = event.currentTarget.value
                    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 12)
                    setRegistration(digitsOnly)
                    if (/\D/.test(rawValue)) {
                      showRegistrationError("Solo se permiten números.")
                    } else {
                      setRegistrationError(digitsOnly.length > 0 && digitsOnly.length < 6
                        ? "El registro debe tener al menos 6 dígitos."
                        : "")
                    }
                  }}
                  value={registration}
                  aria-invalid={Boolean(registrationError)}
                  aria-describedby={registrationError ? "registro-error" : undefined}
                  className={cn(
                    "registration-input",
                    registrationError && `registration-flash-${flashVersion % 2}`,
                  )}
                  required
                />
                {registrationError && (
                  <p id="registro-error" className="registration-error" role="alert">
                    {registrationError}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  value={password}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  onChange={(event) => {
                    const nextPassword = event.currentTarget.value
                    setPassword(nextPassword)
                    setPasswordError(nextPassword.length > 0 && nextPassword.length < 8
                      ? "La contraseña debe tener al menos 8 caracteres."
                      : "")
                  }}
                  required
                />
                {passwordError && (
                  <p id="password-error" className="registration-error" role="alert">
                    {passwordError}
                  </p>
                )}
              </Field>
              <Field>
                {errorMessage && <p className="registration-error" role="alert">{errorMessage}</p>}
                <Button
                  type="submit"
                  disabled={isSubmitting || !/^[0-9]{6,12}$/.test(registration) || password.length < 8 || Boolean(registrationError)}
                >
                  {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="login-art">
            <div className="login-art-icon"><CalendarCheck2 aria-hidden="true" /></div>
            <p>La asistencia<br />también es progreso.</p>
            <span>Un espacio para acompañar cada aprendizaje.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
