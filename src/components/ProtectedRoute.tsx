import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

export function ProtectedRoute({ allowedRoles = ['owner'] }: ProtectedRouteProps) {
  const { user, loading, role } = useAuthSession()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-ink">
        <p className="animate-pulse font-semibold">Loading session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-6 text-center text-ink">
        <h1 className="text-3xl font-bold text-danger">Access Denied</h1>
        <p className="mt-2 text-ink-soft">You do not have permission to view this page.</p>
        <p className="mt-1 text-sm">Required roles: {allowedRoles.join(', ')}</p>
      </div>
    )
  }

  return <Outlet />
}
