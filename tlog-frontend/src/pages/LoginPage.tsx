import { useEffect, useState } from 'react';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Cancel, CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
import { authApi } from '../api';

interface PasswordRule {
  text: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { text: 'At least 6 characters', test: (p) => p.length >= 6 },
  { text: 'Contains uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { text: 'Contains lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { text: 'Contains number (0-9)', test: (p) => /[0-9]/.test(p) },
  { text: 'Contains special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isPasswordValid = passwordRules.every(rule => rule.test(password));
  const needsConfirmPassword = isCreateMode && !showPassword;
  const canCreateUser = isCreateMode && isPasswordValid && (!needsConfirmPassword || (passwordsMatch && confirmPassword));

  useEffect(() => {
    if (confirmPassword && needsConfirmPassword) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword, needsConfirmPassword]);

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(username, password),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/rounds');
    },
    onError: (error: Error) => {
      if (error.message.includes('404') || error.message.includes('User not found')) {
        setPendingUsername(username);
        setShowCreateDialog(true);
        setError('');
      } else if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
        setError('Incorrect password');
      } else {
        setError(error.message);
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: () => authApi.signup({ username, password }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isCreateMode) {
      if (!canCreateUser) return;
      signupMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  const handleConfirmCreate = () => {
    setShowCreateDialog(false);
    setIsCreateMode(true);
    setUsername(pendingUsername);
    setPassword('');
    setConfirmPassword('');
    setPendingUsername('');
    setShowPassword(false);
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setPendingUsername('');
    setError('');
  };

  const handleBackToLogin = () => {
    setIsCreateMode(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
  };

  const getRuleIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
    ) : (
      <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
    );
  };

  const isLoading = loginMutation.isPending || signupMutation.isPending;

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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
              InputProps={{
                endAdornment: isCreateMode ? (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ) : undefined
              }}
            />

            {isCreateMode && (
              <>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Password Requirements:
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {passwordRules.map((rule, index) => (
                      <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {getRuleIcon(rule.test(password))}
                        </ListItemIcon>
                        <ListItemText
                          primary={rule.text}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.875rem',
                              color: rule.test(password) ? 'success.main' : 'text.secondary'
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {needsConfirmPassword && (
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    margin="normal"
                    required
                    disabled={isLoading}
                    error={!passwordsMatch && confirmPassword.length > 0}
                    helperText={!passwordsMatch && confirmPassword.length > 0 ? 'Passwords do not match' : ''}
                    InputProps={{
                      endAdornment: confirmPassword.length > 0 ? (
                        <InputAdornment position="end">
                          {getRuleIcon(passwordsMatch)}
                        </InputAdornment>
                      ) : null
                    }}
                  />
                )}
              </>
            )}

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
              disabled={isLoading || (isCreateMode && !canCreateUser)}
              sx={{ mt: 3 }}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? (isCreateMode ? 'Creating...' : 'Connecting...') :
               (isCreateMode ? 'Create Account' : 'Login')}
            </Button>

            {isCreateMode && (
              <Button
                fullWidth
                variant="text"
                onClick={handleBackToLogin}
                disabled={isLoading}
                sx={{ mt: 1 }}
              >
                Back to Login
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onClose={handleCancelCreate} maxWidth="xs" fullWidth>
        <DialogTitle>User Not Found</DialogTitle>
        <DialogContent>
          <DialogContentText>
            User "{pendingUsername}" does not exist. Would you like to create a new account with this username?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCreate}>
            No
          </Button>
          <Button onClick={handleConfirmCreate} variant="contained" autoFocus>
            Yes, Create Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
