import { cn } from "cn";
import { CalendarCheck2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LoginCredentials } from "@/lib/auth";

export function LoginForm({
  className,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  ...props
}: Omit<React.ComponentProps<"div">, "onSubmit"> & {
  onSubmit?: (credentials: LoginCredentials) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}) {
  const [registration, setRegistration] = useState("");
  const [password, setPassword] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [flashVersion, setFlashVersion] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  function showRegistrationError(message: string) {
    setRegistrationError(message);
    setFlashVersion((version) => version + 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[0-9]{6,12}$/.test(registration)) {
      event.preventDefault();
      showRegistrationError(
        registration
          ? "El registro debe contener solo números (entre 6 y 12 dígitos)."
          : "El registro es obligatorio.",
      );
      return;
    }
    // Minimum length is a rule for creating passwords, not for signing in:
    // imported students start with their registration number (6+ digits).
    if (!password) {
      event.preventDefault();
      setPasswordError("La contraseña es obligatoria.");
      return;
    }

    setRegistrationError("");
    setPasswordError("");
    onSubmit?.({ registrationNo: registration, password });
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card className="login-card overflow-hidden p-0">
        <CardContent className="login-card-content grid p-0">
          <form
            className="login-form-fields"
            noValidate
            onSubmit={handleSubmit}
          >
            <FieldGroup>
              <div className="login-form-header flex flex-col items-center gap-2 text-center">
                <h1 className="login-title">Bienvenido</h1>
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
                    const rawValue = event.currentTarget.value;
                    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 12);
                    setRegistration(digitsOnly);
                    if (/\D/.test(rawValue)) {
                      showRegistrationError("Solo se permiten números.");
                    } else {
                      setRegistrationError(
                        digitsOnly.length > 0 && digitsOnly.length < 6
                          ? "El registro debe tener al menos 6 dígitos."
                          : "",
                      );
                    }
                  }}
                  value={registration}
                  aria-invalid={Boolean(registrationError)}
                  aria-describedby={
                    registrationError ? "registro-error" : undefined
                  }
                  className={cn(
                    "registration-input",
                    registrationError &&
                      `registration-flash-${flashVersion % 2}`,
                  )}
                  required
                />
                {registrationError && (
                  <p
                    id="registro-error"
                    className="registration-error"
                    role="alert"
                  >
                    {registrationError}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={
                      passwordError ? "password-error" : undefined
                    }
                    onChange={(event) => {
                      const nextPassword = event.currentTarget.value;
                      setPassword(nextPassword);
                      setPasswordError("");
                    }}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="login-eye-button absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {passwordError && (
                  <p
                    id="password-error"
                    className="registration-error"
                    role="alert"
                  >
                    {passwordError}
                  </p>
                )}
              </Field>
              <Field>
                {errorMessage && (
                  <p className="registration-error" role="alert">
                    {errorMessage}
                  </p>
                )}
                <Button
                  type="submit"
                  className="login-submit"
                  disabled={
                    isSubmitting ||
                    !/^[0-9]{6,12}$/.test(registration) ||
                    !password ||
                    Boolean(registrationError)
                  }
                >
                  {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
                </Button>
                <p className="login-secure-note">
                  <ShieldCheck aria-hidden="true" />
                  Conexión segura · Acceso solo para usuarios registrados
                </p>
              </Field>
            </FieldGroup>
          </form>
          <div className="login-art">
            <img
              src="/devcommit.jpeg"
              alt=""
              aria-hidden="true"
              className="login-art-image"
              loading="eager"
              decoding="async"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
