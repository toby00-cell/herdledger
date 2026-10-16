import { createBrowserRouter, Navigate } from "react-router"
import AppShell from "./components/AppShell"
import ProtectedRoute from "./components/ProtectedRoute"
import Animals from "./pages/Animals"
import BulkOrders from "./pages/BulkOrders"
import Dashboard from "./pages/Dashboard"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Marketplace from "./pages/Marketplace"
import Purchases from "./pages/Purchases"
import RegisterAnimal from "./pages/RegisterAnimal"
import Reports from "./pages/Reports"
import Signup from "./pages/Signup"
import Transfers from "./pages/Transfers"
import Verify from "./pages/Verify"

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  { path: "/verify", Component: Verify },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", Component: Dashboard },
          { path: "/animals", Component: Animals },
          { path: "/animals/new", Component: RegisterAnimal },
          { path: "/bulk-orders", Component: BulkOrders },
          { path: "/marketplace", Component: Marketplace },
          { path: "/purchases", Component: Purchases },
          { path: "/transfers", Component: Transfers },
          { path: "/reports", Component: Reports },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
