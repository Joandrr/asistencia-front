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

export interface ChangePasswordCredentials {
  currentPassword: string
  newPassword: string
}

export interface ManagedUser {
  id: string
  role: UserRole
  registrationNo: string
  fullName: string
  degreeProgram: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface UsersPage {
  data: ManagedUser[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateUserPayload {
  registrationNo: string
  password: string
  role: UserRole
  fullName: string
  degreeProgram?: string
}

export interface UpdateUserPayload {
  registrationNo?: string
  role?: UserRole
  fullName?: string
  degreeProgram?: string | null
}

export async function login(credentials: LoginCredentials) {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials)
  return data
}

export async function changePassword(credentials: ChangePasswordCredentials) {
  const { data } = await api.post<{ message: string }>(
    '/auth/change-password',
    credentials,
  )
  return data
}

export async function getUsers(params: {
  page: number
  limit: number
  q?: string
  role?: UserRole
}) {
  const { data } = await api.get<UsersPage>('/users', { params })
  return data
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post<ManagedUser>('/users', payload)
  return data
}

export async function updateUser(input: { id: string; payload: UpdateUserPayload }) {
  const { data } = await api.patch<ManagedUser>(`/users/${input.id}`, input.payload)
  return data
}

export async function deleteUser(id: string) {
  const { data } = await api.delete<ManagedUser>(`/users/${id}`)
  return data
}

export async function restoreUser(id: string) {
  const { data } = await api.post<ManagedUser>(`/users/${id}/restore`)
  return data
}
