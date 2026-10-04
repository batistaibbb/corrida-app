import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastHost } from './utils/toast';
import { ConfirmHost } from './utils/confirm';

// Fase 2 (Auditoria UX): code-splitting por rota — cada página vira um chunk
// carregado sob demanda, reduzindo o bundle inicial (warning de chunk >500kB).
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RaceDetailsPage = lazy(() => import('./pages/RaceDetailsPage'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const ReceiptPage = lazy(() => import('./pages/ReceiptPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ParticipantDashboard = lazy(() => import('./pages/ParticipantDashboard'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ToastHost />
      <ConfirmHost />
      <AuthProvider>
        <DataProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<><Header /><HomePage /></>} />
                <Route path="/evento/:id" element={<><Header /><RaceDetailsPage /></>} />
                <Route path="/inscricao/:id" element={<RegistrationPage />} />
                <Route path="/pagamento/:registrationId" element={<ProtectedRoute requiredRole="participant"><PaymentPage /></ProtectedRoute>} />
                <Route path="/comprovante/:registrationId" element={<ProtectedRoute requiredRole="participant"><ReceiptPage /></ProtectedRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/minha-conta" element={<ProtectedRoute requiredRole="participant"><ParticipantDashboard /></ProtectedRoute>} />
                {/* Auditoria UX T4: rotas de diagnóstico removidas do app público. */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
