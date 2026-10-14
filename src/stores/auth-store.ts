import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthUser } from '@/lib/auth'

interface AuthState {
  accessToken: string | null
  expiresAt: number | null
  user: AuthUser | null
  setSession: (accessToken: string, expiresIn: number, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      user: null,
      setSession: (accessToken, expiresIn, user) => set({
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
        user,
      }),
      logout: () => set({ accessToken: null, expiresAt: null, user: null }),
    }),
    {
      name: 'asistencia-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ accessToken, expiresAt, user }) => ({ accessToken, expiresAt, user }),
    },
  ),
)

export function hasValidSession() {
  const { accessToken, expiresAt } = useAuthStore.getState()
  return Boolean(accessToken && expiresAt && expiresAt > Date.now())
}
