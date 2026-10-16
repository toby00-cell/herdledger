import { LoaderCircle } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <LoaderCircle className="size-8 animate-spin text-brand" />
      </div>
    )
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}
