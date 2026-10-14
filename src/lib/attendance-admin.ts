import axios from 'axios'
import { api } from '@/lib/api'

export type EffectiveStatus = 'present' | 'absent' | 'pending'
export type CorrectableStatus = 'present' | 'absent'

export interface ModuleRef {
  id: string
  name: string
}

export interface StatusTotals {
  present: number
  absent: number
  pending: number
  /** Present / (present + absent); null while nothing was evaluated. */
  rate: number | null
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ModuleStudent extends StatusTotals {
  id: string
  registrationNo: string
  fullName: string | null
  email: string | null
}

export interface ModuleStudentsPage {
  module: ModuleRef
  data: ModuleStudent[]
  meta: PageMeta
}

export interface ScheduleSummary extends StatusTotals {
  id: string
  classDate: string
  startTime: string
  endTime: string
  /** Dates up to today can be corrected by an administrator. */
  editable: boolean
}

export interface AttendanceSummary {
  module: ModuleRef
  today: string
  totals: StatusTotals & { students: number; schedules: number }
  schedules: ScheduleSummary[]
}

export interface DateAttendanceRow {
  studentId: string
  registrationNo: string
  fullName: string | null
  email: string | null
  status: EffectiveStatus
  markedAt: string | null
}

export interface DateAttendance {
  module: ModuleRef
  schedule: Omit<ScheduleSummary, keyof StatusTotals>
  totals: StatusTotals
  data: DateAttendanceRow[]
  meta: PageMeta
}

export interface StudentAttendanceRecord {
  scheduleId: string
  classDate: string
  startTime: string
  endTime: string
  editable: boolean
  status: EffectiveStatus
  markedAt: string | null
}

export interface StudentAttendance {
  module: ModuleRef
  student: { id: string; registrationNo: string; fullName: string | null; email: string | null }
  totals: StatusTotals
  records: StudentAttendanceRecord[]
}

export interface CorrectAttendancePayload {
  studentId: string
  scheduleId: string
  status: CorrectableStatus
  notes?: string
}

export const ATTENDANCE_ADMIN_KEY = 'attendance-admin'

export const STATUS_LABEL: Record<EffectiveStatus, string> = {
  present: 'Presente',
  absent: 'Falta',
  pending: 'Pendiente',
}

export const STATUS_BADGE: Record<EffectiveStatus, string> = {
  present: 'badge-pill badge-success',
  absent: 'badge-pill badge-danger',
  pending: 'badge-pill badge-neutral',
}

export async function getModuleStudents(params: { page: number; limit: number; q?: string }) {
  const { data } = await api.get<ModuleStudentsPage>('/admin/students', { params })
  return data
}

export async function getAttendanceSummary() {
  const { data } = await api.get<AttendanceSummary>('/admin/attendance/summary')
  return data
}

export async function getDateAttendance(params: { scheduleId: string; page: number; limit: number; q?: string }) {
  const { data } = await api.get<DateAttendance>('/admin/attendance/by-date', { params })
  return data
}

export async function getStudentAttendance(studentId: string) {
  const { data } = await api.get<StudentAttendance>(`/admin/attendance/by-student/${encodeURIComponent(studentId)}`)
  return data
}

export async function correctAttendance(payload: CorrectAttendancePayload) {
  const { data } = await api.post<{ message: string; unchanged: boolean }>('/attendance/admin/correct', payload)
  return data
}

export async function exportAttendance(module: ModuleRef, today: string) {
  const { data } = await api.get<Blob>('/admin/attendance/export', { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `asistencias-${slugify(module.name)}-${today}.xlsx`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function isNoActiveModuleError(error: unknown) {
  return axios.isAxiosError(error)
    && error.response?.status === 404
    && (error.response.data as { message?: unknown } | undefined)?.message === 'No active module'
}

export function formatRate(rate: number | null) {
  return rate === null ? '—' : `${rate}%`
}

const MARK_TIME = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/La_Paz',
})

export function formatMarkTime(markedAt: string | null) {
  return markedAt ? MARK_TIME.format(new Date(markedAt)) : '—'
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'modulo'
}

/** Spanish message for an attendance-administration request error. */
export function getAttendanceAdminError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Ocurrió un error inesperado.'
  const status = error.response?.status
  const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
  const text = Array.isArray(message) ? message.join(' ') : message ?? ''
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permisos para administrar asistencias.'
  if (status === 404) {
    if (text === 'No active module') return 'No hay un módulo activo.'
    if (text.toLowerCase().includes('student')) return 'El estudiante no pertenece al módulo activo.'
    return text || 'No se encontró la información solicitada.'
  }
  if (status === 409) return 'La asistencia cambió mientras se guardaba. Vuelve a intentarlo.'
  // Correction errors are already written in Spanish by the server.
  if (status === 400) return text || 'La solicitud no es válida.'
  if (!status) return 'No se pudo conectar con el servidor.'
  return 'No se pudo completar la operación. Inténtalo nuevamente.'
}
