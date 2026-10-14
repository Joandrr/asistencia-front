import axios from 'axios'
import { api } from '@/lib/api'

export const ACTIVITIES_KEY = 'activities'

export interface ModuleRef {
  id: string
  name: string
}

export interface ActivityUserSummary {
  id: string
  fullName: string | null
  registrationNo: string
  role: string
}

export interface ActivityStudentSummary {
  id: string
  fullName: string | null
  registrationNo: string
}

export interface ActivityItem {
  id: string
  createdAt: string
  action: string
  actionLabel: string
  affectedEntity: string | null
  affectedRecordId: string | null
  classDate: string | null
  user: ActivityUserSummary | null
  student: ActivityStudentSummary | null
  details: Record<string, unknown>
  previousValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
}

export interface ActivityPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ListActivitiesParams {
  page?: number
  limit?: number
  date?: string
  studentId?: string
  action?: string
  q?: string
}

export interface ListActivitiesResponse {
  module: ModuleRef
  data: ActivityItem[]
  meta: ActivityPageMeta
}

export interface ActivitySummaryTotals {
  total: number
  marks: number
  corrections: number
  today: number
}

export interface ActivitySummaryResponse {
  module: ModuleRef
  today: string
  totals: ActivitySummaryTotals
}

export async function getActivities(params?: ListActivitiesParams): Promise<ListActivitiesResponse> {
  const { data } = await api.get<ListActivitiesResponse>('/admin/activities', { params })
  return data
}

export async function getActivitiesSummary(): Promise<ActivitySummaryResponse> {
  const { data } = await api.get<ActivitySummaryResponse>('/admin/activities/summary')
  return data
}

export function isNoActiveModuleError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 404 &&
    (error.response.data as { message?: unknown } | undefined)?.message === 'No active module'
  )
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/La_Paz',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/La_Paz',
})

export function formatActivityDateTime(iso: string) {
  const date = new Date(iso)
  return `${DATE_FORMATTER.format(date)}, ${TIME_FORMATTER.format(date)}`
}

export function formatActivityDate(iso: string) {
  return DATE_FORMATTER.format(new Date(iso))
}

export function formatActivityTime(iso: string) {
  return TIME_FORMATTER.format(new Date(iso))
}

export function getActivitiesError(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Ocurrió un error inesperado.'
  const status = error.response?.status
  const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
  const text = Array.isArray(message) ? message.join(' ') : message ?? ''
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permisos para ver el historial de actividades.'
  if (status === 404) {
    if (text === 'No active module') return 'No hay un módulo activo.'
    return text || 'No se encontró la información solicitada.'
  }
  if (!status) return 'No se pudo conectar con el servidor.'
  return text || 'No se pudo completar la operación. Inténtalo nuevamente.'
}
