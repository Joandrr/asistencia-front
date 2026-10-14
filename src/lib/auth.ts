import { api } from '@/lib/api'

export type UserRole = 'admin' | 'student'

export interface AuthUser {
  id: string
  role: UserRole
  registrationNo: string
  fullName: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}

export interface LoginCredentials {
  registrationNo: string
  password: string
}

export async function login(credentials: LoginCredentials) {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials)
  return data
}
