import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { CalendarDays, Key, MessageCircle, Link2, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';
import './App.css';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Calendar = lazy(() => import('./components/Calendar/Calendar'));
const PasswordManager = lazy(() => import('./components/PasswordManager/PasswordManager'));
const AIAssistant = lazy(() => import('./components/AIAssistant/AIAssistant'));
const QuickLinks = lazy(() => import('./components/QuickLinks/QuickLinks'));

// Loading component
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-spinner"></div>
    <p className="text-muted">Memuat...</p>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Layout
const AppLayout = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">📝</span>
          <span className="header-title">Personal Notes</span>
        </div>
        <div className="header-right">
          <div className="user-info">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar" />
            ) : (
              <div className="user-avatar placeholder">
                <User size={16} />
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={signOut} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/passwords" element={<PasswordManager />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/links" element={<QuickLinks />} />
          </Routes>
        </Suspense>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarDays size={24} />
          <span>Kalender</span>
        </NavLink>
        <NavLink to="/passwords" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Key size={24} />
          <span>Password</span>
        </NavLink>
        <NavLink to="/ai" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageCircle size={24} />
          <span>AI</span>
        </NavLink>
        <NavLink to="/links" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Link2 size={24} />
          <span>Links</span>
        </NavLink>
      </nav>
    </div>
  );
};

// App Component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DataProvider>
                      <AppLayout />
                    </DataProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Login Route - redirect if already logged in
const LoginRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
};

export default App;
