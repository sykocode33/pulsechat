import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Chat from '@/pages/Chat';
import CallManager from '@/components/call/CallManager';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppContent() {
  useSocket();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>

      {/* Global call overlay — shows above everything when there's an active call */}
      {isAuthenticated && <CallManager />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
