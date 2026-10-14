import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </StrictMode>,
)
