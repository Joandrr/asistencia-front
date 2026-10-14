import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const requestUrl = axios.isAxiosError(error) ? error.config?.url : undefined
    const responseMessage = axios.isAxiosError(error)
      ? error.response?.data?.message
      : undefined
    const invalidCurrentPassword = requestUrl?.endsWith('/auth/change-password')
      && responseMessage === 'Current password is incorrect'
    const isLoginRequest = requestUrl?.endsWith('/auth/login')
    if (
      axios.isAxiosError(error)
      && error.response?.status === 401
      && !isLoginRequest
      && !invalidCurrentPassword
    ) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)
