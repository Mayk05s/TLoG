import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { authApi } from '../api';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(username, password),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/rounds');
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <Container maxWidth="sm" sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card sx={{ width: '100%', p: 2 }}>
        <CardContent>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            The Last of Guss
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              disabled={loginMutation.isPending}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loginMutation.isPending}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loginMutation.isPending}
              sx={{ mt: 3 }}
              startIcon={loginMutation.isPending ? <CircularProgress size={20} /> : undefined}
            >
              {loginMutation.isPending ? 'Connecting...' : 'Login'}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ✅ React Query интегрирован<br/>
              🔌 Подключение к API: http://localhost:3001<br/>
              📍 Сейчас на: /login<br/>
              {loginMutation.isPending && '⏳ Отправка запроса...'}
              {error && '❌ Ошибка подключения к бэкенду'}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Container>
  );
}
