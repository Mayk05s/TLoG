import React, { useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

// Простая страница логина с роутингом
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Имитация API запроса
    setTimeout(() => {
      if (username && password) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        navigate('/rounds');
      }
      setIsLoading(false);
    }, 1000);
  };

  // Inline стили как fallback если Tailwind не работает
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '1rem'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '28rem',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    padding: '1.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none'
  };

  const buttonStyle = {
    width: '100%',
    backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
    color: 'white',
    fontWeight: '500',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4" style={containerStyle}>
      <div className="w-full max-w-md" style={{ maxWidth: '28rem' }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm" style={cardStyle}>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6"
                style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>
              The Last of Guss
            </h1>

            <form onSubmit={handleLogin} className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                       style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={inputStyle}
                  placeholder="Enter your username"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                       style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={inputStyle}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                style={buttonStyle}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                 style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
              <p className="text-sm text-blue-700 dark:text-blue-300"
                 style={{ fontSize: '0.875rem', color: '#1d4ed8' }}>
                ✅ React Router работает<br/>
                ✅ Навигация работает<br/>
                📍 Сейчас на: /login<br/>
                {/* Проверим Tailwind */}
                <span style={{ color: '#ef4444' }}>
                  {document.querySelector('.bg-gray-50') ? '✅ Tailwind работает' : '❌ Tailwind НЕ работает - используем inline стили'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Простая страница раундов
function RoundsPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Unknown';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1rem'
  };

  const maxWidthStyle = {
    maxWidth: '56rem',
    margin: '0 auto'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4" style={containerStyle}>
      <div className="max-w-4xl mx-auto" style={maxWidthStyle}>
        <div className="flex justify-between items-center mb-6"
             style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white"
                style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
              Game Rounds
            </h1>
            <p className="text-gray-600 dark:text-gray-400"
               style={{ color: '#4b5563' }}>
              Welcome, {username}! 🎮
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6"
             style={{
               backgroundColor: 'white',
               borderRadius: '0.5rem',
               border: '1px solid #e5e7eb',
               boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
               padding: '1.5rem'
             }}>
          <h3 className="text-lg font-semibold mb-4"
              style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Available Rounds
          </h3>

          {/* Заглушка для раундов */}
          <div className="space-y-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 style={{
                   padding: '1rem',
                   border: '1px solid #e5e7eb',
                   borderRadius: '0.5rem',
                   cursor: 'pointer',
                   transition: 'background-color 0.2s'
                 }}>
              <div className="flex justify-between items-center"
                   style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 className="font-medium" style={{ fontWeight: '500' }}>Round #1234</h4>
                  <p className="text-sm text-gray-500" style={{ fontSize: '0.875rem', color: '#6b7280' }}>Status: Active</p>
                </div>
                <span className="text-green-500">🟢</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 style={{
                   padding: '1rem',
                   border: '1px solid #e5e7eb',
                   borderRadius: '0.5rem',
                   cursor: 'pointer'
                 }}>
              <div className="flex justify-between items-center"
                   style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 className="font-medium" style={{ fontWeight: '500' }}>Round #1233</h4>
                  <p className="text-sm text-gray-500" style={{ fontSize: '0.875rem', color: '#6b7280' }}>Status: Completed</p>
                </div>
                <span className="text-gray-500">⚪</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
               style={{
                 marginTop: '1.5rem',
                 padding: '1rem',
                 backgroundColor: '#f0fdf4',
                 borderRadius: '0.5rem'
               }}>
            <p className="text-sm text-green-700 dark:text-green-300"
               style={{ fontSize: '0.875rem', color: '#15803d' }}>
              ✅ React Router работает<br/>
              ✅ Защищенные маршруты работают<br/>
              📍 Сейчас на: /rounds<br/>
              🔄 Готов к добавлению API<br/>
              💅 Стили работают (inline + Tailwind fallback)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Компонент защищенного маршрута
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Главное приложение с роутингом
function RouterApp() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/rounds"
          element={
            <ProtectedRoute>
              <RoundsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/rounds" replace />} />
      </Routes>
    </Router>
  );
}

export default RouterApp;
