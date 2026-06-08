import { Routes, Route, Navigate } from 'react-router-dom'
import { PatientsListPage } from './pages/PatientsListPage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/patients" element={<PatientsListPage />} />
      <Route path="/patients/:patientId" element={<PatientDetailPage />} />
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  )
}
