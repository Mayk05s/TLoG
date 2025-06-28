import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { Add, Logout, PlayArrow, Refresh, Stop, TouchApp } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const API_BASE_URL = 'http://localhost:3001';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'survivor' | 'nikita';
  };
}

interface Round {
  id: string;
  createdAt: number;
  startsAt: number;
  endsAt: number;
}

interface RoundDetailsResponse {
  id: string;
  createdAt: number;
  startsAt: number;
  endsAt: number;
}

interface StatsResponse {
  round: Round;
  playerPoints: number;
  leaderboard: LeaderboardEntry[];
}

interface LeaderboardEntry {
  username: string;
  points: number;
}

interface RoundWithStatus extends Round {
  status: 'cooldown' | 'active' | 'completed';
  timeLeft?: number;
}

const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
};

const roundsApi = {
  async getRounds(): Promise<Round[]> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/rounds`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch rounds: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async getRound(id: string): Promise<RoundDetailsResponse> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/rounds/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch round: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async getStats(id: string): Promise<StatsResponse> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/rounds/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch round stats: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async createRound(): Promise<Round> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const now = Date.now();
    const startsAt = now + 30000;
    const duration = 60;

    const response = await fetch(`${API_BASE_URL}/rounds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        starts_at: new Date(startsAt).toISOString(),
        duration: duration
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create round: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
};

const tapsApi = {
  async submitTap(roundId: string): Promise<{ points: number; totalPoints: number }> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/tap/${roundId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit tap: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function LoginPage() {
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
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
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
        </CardContent>
      </Card>
    </Container>
  );
}

function RoundsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: rounds, isLoading, error, refetch } = useQuery({
    queryKey: ['rounds'],
    queryFn: roundsApi.getRounds,
    refetchInterval: 5000,
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        localStorage.clear();
        navigate('/login');
      }
    },
  });

  const createRoundMutation = useMutation({
    mutationFn: roundsApi.createRound,
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateRoundStatus = (round: Round): RoundWithStatus => {
    const now = currentTime;

    if (now < round.startsAt) {
      const timeLeft = Math.ceil((round.startsAt - now) / 1000);
      return { ...round, status: 'cooldown', timeLeft: Math.max(0, timeLeft) };
    } else if (now >= round.startsAt && now < round.endsAt) {
      const timeLeft = Math.ceil((round.endsAt - now) / 1000);
      return { ...round, status: 'active', timeLeft: Math.max(0, timeLeft) };
    } else {
      return { ...round, status: 'completed' };
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (roundWithStatus: RoundWithStatus): string => {
    switch (roundWithStatus.status) {
      case 'cooldown':
        return `Starts in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'active':
        return `Ends in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'cooldown': return 'warning';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayArrow />;
      case 'cooldown': return <Stop />;
      case 'completed': return <Stop />;
      default: return <Stop />;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              <Refresh />
            </Button>
          }
        >
          Failed to connect to backend: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Game Rounds
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.username} ({user.role})
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Available Rounds ({rounds?.length || 0})
          </Typography>
          {user.role === 'admin' && (
            <Button
              variant="contained"
              startIcon={createRoundMutation.isPending ? <CircularProgress size={20} /> : <Add />}
              onClick={() => createRoundMutation.mutate()}
              disabled={createRoundMutation.isPending}
            >
              {createRoundMutation.isPending ? 'Creating...' : 'Create Round'}
            </Button>
          )}
        </Box>

        {rounds?.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No rounds available yet.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {rounds?.map((round) => {
              const roundWithStatus = calculateRoundStatus(round);
              return (
                <Grid item xs={12} key={round.id}>
                  <Card
                    sx={{ cursor: 'pointer', '&:hover': { elevation: 4 } }}
                    onClick={() => navigate(`/rounds/${round.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            Round {round.id.slice(0, 8)}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(roundWithStatus.status)}
                            label={getStatusText(roundWithStatus)}
                            color={getStatusColor(roundWithStatus.status) as any}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Created: {new Date(round.createdAt).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Starts: {new Date(round.startsAt).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Ends: {new Date(round.endsAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ fontSize: '2rem' }}>
                          {roundWithStatus.status === 'active' ? '🟢' :
                           roundWithStatus.status === 'cooldown' ? '🟡' : '⚪'}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </>
  );
}

function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: round, isLoading: roundLoading, error: roundError } = useQuery({
    queryKey: ['round', id],
    queryFn: () => roundsApi.getRound(id!),
    refetchInterval: 2000,
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => roundsApi.getStats(id!),
    refetchInterval: 2000,
    enabled: !!id,
  });

  const tapMutation = useMutation({
    mutationFn: () => tapsApi.submitTap(id!),
    onSuccess: () => refetchStats(),
  });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateRoundStatus = (round: Round): RoundWithStatus => {
    const now = currentTime;

    if (now < round.startsAt) {
      const timeLeft = Math.ceil((round.startsAt - now) / 1000);
      return { ...round, status: 'cooldown', timeLeft: Math.max(0, timeLeft) };
    } else if (now >= round.startsAt && now < round.endsAt) {
      const timeLeft = Math.ceil((round.endsAt - now) / 1000);
      return { ...round, status: 'active', timeLeft: Math.max(0, timeLeft) };
    } else {
      return { ...round, status: 'completed' };
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLoading = roundLoading || statsLoading;
  const error = roundError || statsError;

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error || !round || !stats) {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Error Loading Round
            </Typography>
            <Button color="inherit" onClick={() => navigate('/rounds')}>
              Back to Rounds
            </Button>
          </Toolbar>
        </AppBar>
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load round data'}
          </Alert>
        </Container>
      </>
    );
  }

  const roundWithStatus = calculateRoundStatus(round);
  const canTap = roundWithStatus.status === 'active' && user.role !== 'nikita';

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Round {round.id.slice(0, 8)}
          </Typography>
          <Chip
            label={roundWithStatus.status}
            color={roundWithStatus.status === 'active' ? 'success' :
                   roundWithStatus.status === 'cooldown' ? 'warning' : 'default'}
            sx={{ mr: 2 }}
          />
          <Button color="inherit" onClick={() => navigate('/rounds')}>
            Back to Rounds
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, mb: 8 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Game Status
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    Status: <strong>{roundWithStatus.status.charAt(0).toUpperCase() + roundWithStatus.status.slice(1)}</strong>
                  </Typography>

                  {roundWithStatus.timeLeft !== undefined && roundWithStatus.timeLeft > 0 && (
                    <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                      {formatTimeLeft(roundWithStatus.timeLeft)}
                    </Typography>
                  )}

                  <Typography variant="h3" color="primary" sx={{ mt: 2 }}>
                    {stats.playerPoints} pts
                  </Typography>
                </Box>

                {canTap && (
                  <Fab
                    color="primary"
                    size="large"
                    onClick={() => tapMutation.mutate()}
                    disabled={tapMutation.isPending}
                    sx={{ width: '100%', height: 80, borderRadius: 4 }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <TouchApp sx={{ fontSize: 40 }} />
                      <Typography variant="h6">
                        {tapMutation.isPending ? 'Tapping...' : 'TAP!'}
                      </Typography>
                    </Box>
                  </Fab>
                )}

                {roundWithStatus.status === 'cooldown' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Round starts in {formatTimeLeft(roundWithStatus.timeLeft || 0)}
                  </Alert>
                )}

                {roundWithStatus.status === 'completed' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Round completed
                  </Alert>
                )}

                {user.role === 'nikita' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    👑 Nikita role: You can watch but cannot earn points
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Leaderboard
                </Typography>

                {stats.leaderboard.length === 0 ? (
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No players yet
                  </Typography>
                ) : (
                  <List>
                    {stats.leaderboard.map((entry, index) => (
                      <ListItem
                        key={entry.username}
                        sx={{
                          bgcolor: entry.username === user.username ? 'primary.light' : 'background.paper',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="h6" component="span" sx={{ mr: 1 }}>
                                  #{index + 1}
                                </Typography>
                                <Typography
                                  variant="body1"
                                  component="span"
                                  sx={{ fontWeight: entry.username === user.username ? 'bold' : 'normal' }}
                                >
                                  {entry.username}
                                  {entry.username === user.username && ' (You)'}
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {entry.points}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
