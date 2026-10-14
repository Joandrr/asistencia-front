import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="route-page">
      <h1>Página no encontrada</h1>
      <p>La ruta solicitada no existe.</p>
    </main>
  ),
})
