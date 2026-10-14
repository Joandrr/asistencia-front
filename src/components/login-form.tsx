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

export function LoginForm({
  className,
  onSubmit,
  ...props
}: React.ComponentProps<"div"> & {
  onSubmit?: React.FormEventHandler<HTMLFormElement>
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
    if (!/^[0-9]{1,12}$/.test(registration)) {
      event.preventDefault()
      showRegistrationError(
        registration
          ? "El registro debe contener solo números (máximo 12)."
          : "El registro es obligatorio.",
      )
      return
    }
    if (!password.trim()) {
      event.preventDefault()
      setPasswordError("La contraseña es obligatoria.")
      return
    }

    setRegistrationError("")
    setPasswordError("")
    onSubmit?.(event)
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
                  pattern="[0-9]{1,12}"
                  maxLength={12}
                  onChange={(event) => {
                    const rawValue = event.currentTarget.value
                    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 12)
                    setRegistration(digitsOnly)
                    if (/\D/.test(rawValue)) {
                      showRegistrationError("Solo se permiten números.")
                    } else {
                      setRegistrationError("")
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
                  value={password}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  onChange={(event) => {
                    setPassword(event.currentTarget.value)
                    if (event.currentTarget.value.trim()) setPasswordError("")
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
                <Button
                  type="submit"
                  disabled={
                    !/^[0-9]{1,12}$/.test(registration) ||
                    !password.trim() ||
                    Boolean(registrationError)
                  }
                >
                  Iniciar sesión
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
