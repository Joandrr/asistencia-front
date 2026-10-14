import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/App'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})
