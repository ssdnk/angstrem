import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import EmployeeLogin from './pages/EmployeeLogin'
import EmployeeTests from './pages/EmployeeTests'
import TakeTest from './pages/TakeTest'
import TestResult from './pages/TestResult'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminTrainings from './pages/AdminTrainings'
import AdminTestEditor from './pages/AdminTestEditor'
import AdminCreateTest from './pages/AdminCreateTest'

function RequireAdmin({ children }) {
  const { token, role } = useAuthStore()
  if (!token || role !== 'admin') return <Navigate to="/admin/login" replace />
  return children
}

function RequireEmployee({ children }) {
  const { token, role } = useAuthStore()
  if (!token || role !== 'employee') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EmployeeLogin />} />
        <Route path="/employee/tests" element={<RequireEmployee><EmployeeTests /></RequireEmployee>} />
        <Route path="/employee/tests/:testId/take" element={<RequireEmployee><TakeTest /></RequireEmployee>} />
        <Route path="/employee/tests/:testId/result" element={<RequireEmployee><TestResult /></RequireEmployee>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/trainings" element={<RequireAdmin><AdminTrainings /></RequireAdmin>} />
        <Route path="/admin/tests/create" element={<RequireAdmin><AdminCreateTest /></RequireAdmin>} />
        <Route path="/admin/tests/:testId/edit" element={<RequireAdmin><AdminTestEditor /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
