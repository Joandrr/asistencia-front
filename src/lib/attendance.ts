import { api } from '@/lib/api'

export interface AttendanceRecord {
  id: string
  status: 'present' | 'late' | 'absent' | 'excused'
  markedAt: string | null
  notes: string | null
}

export interface TodayClass {
  scheduleId: string
  enrollmentId: string
  moduleId: string
  moduleName: string
  classDate: string
  startTime: string
  endTime: string
  graceTime: string
  currentTime: string
  isClassTime: boolean
  isPast: boolean
  isFuture: boolean
  hasMarked: boolean
  canMark: boolean
  statusMessage: string
  attendance: AttendanceRecord | null
}

export interface TodayClassesResponse {
  currentDate: string
  currentTime: string
  classes: TodayClass[]
}

export interface ClassHistoryRecord {
  scheduleId: string
  classDate: string
  startTime: string
  endTime: string
  graceTime: string
  status: 'present' | 'late' | 'absent' | 'excused' | 'pending'
  markedAt: string | null
  notes: string | null
}

export interface ModuleHistoryStats {
  totalSchedules: number
  evaluatedTotal: number
  presentCount: number
  lateCount: number
  absentCount: number
  pendingCount: number
  attendancePercentage: number
}

export interface ModuleHistory {
  moduleId: string
  moduleName: string
  stats: ModuleHistoryStats
  records: ClassHistoryRecord[]
}

export interface AttendanceHistoryResponse {
  modules: ModuleHistory[]
}

export async function getTodayClasses(): Promise<TodayClassesResponse> {
  const { data } = await api.get<TodayClassesResponse>('/attendance/today')
  return data
}

export async function markAttendance(scheduleId: string) {
  const { data } = await api.post<{ message: string; attendance: AttendanceRecord }>(
    '/attendance/mark',
    { scheduleId },
  )
  return data
}

export async function getAttendanceHistory(moduleId?: string): Promise<AttendanceHistoryResponse> {
  const { data } = await api.get<AttendanceHistoryResponse>('/attendance/history', {
    params: moduleId ? { moduleId } : undefined,
  })
  return data
}
