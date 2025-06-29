import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { type Round, roundsApi } from '../api';
import { calculateRoundStatus, formatTimeLeft } from '../lib/utils';
import { AppHeader } from '../components/AppHeader';
import '../styles/main.scss';

export function RoundsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: rounds, isLoading, error, refetch } = useQuery<Round[], Error>({
    queryKey: ['rounds'],
    queryFn: roundsApi.getRounds,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (error && error.message.includes('401')) {
      localStorage.clear();
      navigate('/login');
    }
  }, [error, navigate]);

  const createRoundMutation = useMutation({
    mutationFn: roundsApi.createRound,
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getStatusText = (round: Round): string => {
    const roundWithStatus = calculateRoundStatus(round, currentTime);
    switch (roundWithStatus.status) {
      case 'cooldown':
        return `Starts in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'active':
        return `${formatTimeLeft(roundWithStatus.timeLeft || 0)} left`;
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'cooldown':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const sortRoundsByStatus = (rounds: Round[]) => {
    const roundsWithStatus = rounds.map(round => ({
      ...round,
      calculatedStatus: calculateRoundStatus(round, currentTime),
    }));

    return roundsWithStatus.sort((a, b) => {
      const statusOrder = { active: 0, cooldown: 1, completed: 2 };
      const aOrder = statusOrder[a.calculatedStatus.status] ?? 3;
      const bOrder = statusOrder[b.calculatedStatus.status] ?? 3;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.createdAt - a.createdAt;
    });
  };

  const groupRoundsByStatus = (rounds: Round[]) => {
    const sortedRounds = sortRoundsByStatus(rounds);
    const groups = {
      active: [] as Round[],
      cooldown: [] as Round[],
      completed: [] as Round[],
    };

    sortedRounds.forEach(round => {
      const status = calculateRoundStatus(round, currentTime).status;
      if (status in groups) {
        groups[status].push(round);
      }
    });

    return groups;
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading rounds...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              <Refresh />
            </Button>
          }
        >
          Failed to connect to backend: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <AppHeader
        title="Game Rounds"
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
      />

      <Container maxWidth="lg" sx={{ mb: 8 }}>
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {user.role === 'admin' ? 'Create your first round!' : 'Wait for an admin to create a round.'}
            </Typography>
          </Paper>
        ) : (
          <>
            {(() => {
              const groupedRounds = groupRoundsByStatus(rounds);

              return (
                <>
                  {groupedRounds.active.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
                        🟢 Active Rounds ({groupedRounds.active.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {groupedRounds.active.map((round) => (
                          <Grid item xs={12} sm={6} lg={3} key={round.id}>
                            <RoundCard round={round} currentTime={currentTime} navigate={navigate} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {groupedRounds.cooldown.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'warning.main', fontWeight: 600 }}>
                        🟡 Starting Soon ({groupedRounds.cooldown.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {groupedRounds.cooldown.map((round) => (
                          <Grid item xs={12} sm={6} lg={3} key={round.id}>
                            <RoundCard round={round} currentTime={currentTime} navigate={navigate} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {groupedRounds.completed.length > 0 && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
                        ⚪ Completed Rounds ({groupedRounds.completed.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {groupedRounds.completed.map((round) => (
                          <Grid item xs={12} sm={6} lg={3} key={round.id}>
                            <RoundCard round={round} currentTime={currentTime} navigate={navigate} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </>
              );
            })()}
          </>
        )}
      </Container>
    </>
  );
}

// Отдельный компонент для карточки раунда
function RoundCard({ round, currentTime, navigate }: {
  round: Round;
  currentTime: number;
  navigate: (path: string) => void;
}) {
  const roundWithStatus = calculateRoundStatus(round, currentTime);

  const getStatusText = (): string => {
    switch (roundWithStatus.status) {
      case 'cooldown':
        return `Starts in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'active':
        return `${formatTimeLeft(roundWithStatus.timeLeft || 0)} left`;
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (roundWithStatus.status) {
      case 'active':
        return 'success';
      case 'cooldown':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Card
      sx={{
        cursor: 'pointer',
        height: '140px',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s',
      }}
      onClick={() => navigate(`/rounds/${round.id}`)}
    >
      <CardContent sx={{ flex: 1, p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, mr: 2 }}>
            Round {round.id.slice(0, 8)}
          </Typography>
          <Box sx={{ fontSize: '1.5rem', flexShrink: 0 }}>
            {roundWithStatus.status === 'active' ? '🟢' :
              roundWithStatus.status === 'cooldown' ? '🟡' : '⚪'}
          </Box>
        </Box>

        <Chip
          label={getStatusText()}
          color={getStatusColor() as any}
          size="small"
          sx={{ width: '100%', mb: 1 }}
        />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 'auto',
            fontSize: '0.875rem',
          }}
        >
          {roundWithStatus.status === 'active' && '🔥 Active now!'}
          {roundWithStatus.status === 'cooldown' && '⏰ Get ready...'}
          {roundWithStatus.status === 'completed' && '✅ Finished'}
        </Typography>
      </CardContent>
    </Card>
  );
}
