import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LoginPage } from './pages/LoginPage';
import { RoundsPage } from './pages/RoundsPage';
import { RoundPage } from './pages/RoundPage';
import { theme } from './lib/theme';
import './styles/main.scss';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
          <Route
            path="/rounds/:id"
            element={
              <ProtectedRoute>
                <RoundPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/rounds" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
