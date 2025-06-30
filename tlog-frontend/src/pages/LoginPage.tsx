import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useLoginMutation, useSignupMutation } from '../store/api';
import { TestProjectInfo } from '../components/TestProjectInfo';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const navigate = useNavigate();

  const isPasswordValid = password.length >= 6;
  const canCreateUser = isCreateMode && isPasswordValid;

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [signup, { isLoading: isSigningUp }] = useSignupMutation();

  const handleLogin = async () => {
    try {
      const data = await login({ username, password }).unwrap();
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/rounds');
    } catch (error: any) {
      if (error.status === 404 || (error.data && error.data.message?.includes('User not found'))) {
        setPendingUsername(username);
        setShowCreateDialog(true);
        setError('');
      } else if (error.status === 401 || (error.data && error.data.message?.includes('Invalid credentials'))) {
        setError('Incorrect password');
      } else {
        setError(error.data?.message || 'Login failed');
      }
    }
  };

  const handleSignup = async () => {
    try {
      const data = await signup({ username, password }).unwrap();
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/rounds');
    } catch (error: any) {
      setError(error.data?.message || 'Signup failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isCreateMode) {
      if (!canCreateUser) return;
      await handleSignup();
    } else {
      await handleLogin();
    }
  };

  const handleConfirmCreate = () => {
    setShowCreateDialog(false);
    setIsCreateMode(true);
    setUsername(pendingUsername);
    setPassword('');
    setPendingUsername('');
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setPendingUsername('');
    setError('');
  };

  const handleBackToLogin = () => {
    setIsCreateMode(false);
    setPassword('');
    setError('');
  };

  const isLoading = isLoggingIn || isSigningUp;

  return (
    <Container maxWidth="sm" sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2
    }}>
      <TestProjectInfo />
      <Card sx={{ width: '100%', p: 2 }}>
        <CardContent>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            The Last of Guss
          </Typography>

          <Typography variant="h6" component="h2" align="center" sx={{ mb: 2, color: 'text.secondary' }}>
            {isCreateMode ? 'Create New Account' : 'Login'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
              helperText={isCreateMode && password && !isPasswordValid ? 'Minimum 6 characters required' : ''}
              error={isCreateMode && password.length > 0 && !isPasswordValid}
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
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading || (isCreateMode && !canCreateUser)}
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                isCreateMode ? 'Create Account' : 'Login'
              )}
            </Button>

            {isCreateMode && (
              <Button
                fullWidth
                variant="outlined"
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onClose={handleCancelCreate}>
        <DialogTitle>User Not Found</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The username "{pendingUsername}" doesn't exist. Would you like to create a new account with this username?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCreate}>Cancel</Button>
          <Button onClick={handleConfirmCreate} variant="contained">
            Create Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
