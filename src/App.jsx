import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/operator/Dashboard'
import TicketDetail from './pages/operator/TicketDetail'
import NewTicketForm from './pages/operator/NewTicketForm'
import Reports from './pages/operator/Reports'
import Clients from './pages/operator/Clients'
import Settings from './pages/operator/Settings'
import TechQueue from './pages/technician/Queue'
import TechTicketDetail from './pages/technician/TicketDetail'
import MapView from './pages/technician/MapView'
import Schedule from './pages/technician/Schedule'
import MobileDashboard from './pages/operator-mobile/Dashboard'
import MobileTicketDetail from './pages/operator-mobile/TicketDetail'
import MobileNewTicket from './pages/operator-mobile/NewTicket'
import MobileClients from './pages/operator-mobile/Clients'

const isMobile = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (role === 'operator' && user.role === 'technician') return <Navigate to="/mobile" replace />
  if (role === 'technician' && (user.role === 'operator' || user.role === 'admin')) return <Navigate to="/operator" replace />
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'technician') return <Navigate to="/mobile" replace />
  return <Navigate to={isMobile() ? '/m' : '/operator'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Login */}
      <Route path="/login" element={<Login />} />
      <Route path="/mobile/login" element={<Login />} />

      {/* Operator */}
      <Route path="/operator" element={<RequireAuth role="operator"><Dashboard /></RequireAuth>} />
      <Route path="/operator/ticket/:id" element={<RequireAuth role="operator"><TicketDetail /></RequireAuth>} />
      <Route path="/operator/new" element={<RequireAuth role="operator"><NewTicketForm /></RequireAuth>} />
      <Route path="/operator/reports" element={<RequireAuth role="operator"><Reports /></RequireAuth>} />
      <Route path="/operator/clients" element={<RequireAuth role="operator"><Clients /></RequireAuth>} />
      <Route path="/operator/settings" element={<RequireAuth role="operator"><Settings /></RequireAuth>} />

      {/* Technician */}
      <Route path="/mobile" element={<RequireAuth role="technician"><TechQueue /></RequireAuth>} />
      <Route path="/mobile/ticket/:id" element={<RequireAuth role="technician"><TechTicketDetail /></RequireAuth>} />
      <Route path="/mobile/map" element={<RequireAuth role="technician"><MapView /></RequireAuth>} />
      <Route path="/mobile/schedule" element={<RequireAuth role="technician"><Schedule /></RequireAuth>} />

      {/* Operator mobile */}
      <Route path="/m" element={<RequireAuth role="operator"><MobileDashboard /></RequireAuth>} />
      <Route path="/m/ticket/:id" element={<RequireAuth role="operator"><MobileTicketDetail /></RequireAuth>} />
      <Route path="/m/new" element={<RequireAuth role="operator"><MobileNewTicket /></RequireAuth>} />
      <Route path="/m/clients" element={<RequireAuth role="operator"><MobileClients /></RequireAuth>} />
      <Route path="/m/settings" element={<RequireAuth role="operator"><Settings /></RequireAuth>} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
