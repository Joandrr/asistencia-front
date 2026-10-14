import { api } from '@/lib/api'

export type ImportFileKind = 'students' | 'schedules'
export type ImportStudentStatus = 'new' | 'existing' | 'reactivated'

export interface ActiveModuleSummary {
  id: string
  name: string
  activatedAt: string
  graceMinutes: number
  studentsCount: number
  schedulesCount: number
  firstDate: string | null
  lastDate: string | null
}

export interface ImportIssue {
  file: ImportFileKind
  row: number | null
  column: string | null
  message: string
}

export interface ImportPreview {
  valid: boolean
  activeModule: { id: string; name: string } | null
  students: {
    total: number
    new: number
    existing: number
    reactivated: number
    rows: {
      row: number
      registrationNo: string
      fullName: string
      email: string
      status: ImportStudentStatus
      changed: boolean
    }[]
  }
  schedules: {
    total: number
    firstDate: string | null
    lastDate: string | null
    rows: { row: number; classDate: string; startTime: string; endTime: string }[]
  }
  issues: ImportIssue[]
  issuesTotal: number
  warnings: ImportIssue[]
}

export interface ActivationResult {
  module: { id: string; name: string }
  graceMinutes: number
  previousModule: { id: string; name: string } | null
  students: { total: number; new: number; existing: number; reactivated: number }
  schedules: { total: number; firstDate: string | null; lastDate: string | null }
}

export interface ImportFiles {
  students: File
  schedules: File
}

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024

// The shared client defaults to JSON; multipart must be set per request or
// axios would serialize the FormData as JSON. The browser adds the boundary.
const multipartConfig = { headers: { 'Content-Type': 'multipart/form-data' } }

function importFormData(files: ImportFiles) {
  const formData = new FormData()
  formData.append('students', files.students)
  formData.append('schedules', files.schedules)
  return formData
}

export async function getActiveModule() {
  const { data } = await api.get<{ activeModule: ActiveModuleSummary | null }>('/modules/active')
  return data.activeModule
}

export async function previewModuleImport(files: ImportFiles) {
  const { data } = await api.post<ImportPreview>('/modules/import/preview', importFormData(files), multipartConfig)
  return data
}

export async function activateModule({ name, graceMinutes, files }: { name: string; graceMinutes: number; files: ImportFiles }) {
  const formData = importFormData(files)
  formData.append('name', name)
  formData.append('graceMinutes', String(graceMinutes))
  formData.append('confirm', 'true')
  const { data } = await api.post<ActivationResult>('/modules/activate', formData, multipartConfig)
  return data
}

export const DEFAULT_GRACE_MINUTES = 10
export const MAX_GRACE_MINUTES = 240

/** Parses a grace-period input; null when it is not a whole number between 0 and 240. */
export function parseGraceMinutes(value: string) {
  if (!/^\d{1,3}$/.test(value.trim())) return null
  const minutes = Number(value)
  return minutes <= MAX_GRACE_MINUTES ? minutes : null
}

export async function updateGracePeriod(graceMinutes: number) {
  const { data } = await api.patch<{ graceMinutes: number; updatedSchedules: number; unchanged: boolean }>(
    '/modules/active/grace-period',
    { graceMinutes },
  )
  return data
}

const TEMPLATE_FILENAMES: Record<ImportFileKind, string> = {
  students: 'plantilla-estudiantes.xlsx',
  schedules: 'plantilla-fechas.xlsx',
}

export async function downloadTemplate(kind: ImportFileKind) {
  const { data } = await api.get<Blob>(`/modules/templates/${kind}`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = TEMPLATE_FILENAMES[kind]
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Formats a first–last class date range for display. */
export function formatDateRange(firstDate: string | null, lastDate: string | null) {
  if (!firstDate || !lastDate) return 'Sin fechas'
  if (firstDate === lastDate) return formatIsoDate(firstDate)
  return `${formatIsoDate(firstDate)} – ${formatIsoDate(lastDate)}`
}

/** Formats an ISO date (YYYY-MM-DD) as dd/mm/aaaa without timezone shifts. */
export function formatIsoDate(isoDate: string | null) {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
