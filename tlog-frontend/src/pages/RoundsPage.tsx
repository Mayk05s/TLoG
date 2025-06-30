import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Grid,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { Add, ExpandLess, ExpandMore, Refresh } from '@mui/icons-material';
import { type Round } from '../store/types';
import { useCreateRoundMutation, useGetRoundsQuery } from '../store/api';
import { calculateRoundStatus, formatTimeLeft } from '../lib/utils';
import { AppHeader } from '../components/AppHeader';

export function RoundsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showCompleted, setShowCompleted] = useState(false);

  const {
    data: rounds,
    isLoading,
    error,
    refetch
  } = useGetRoundsQuery(undefined, {
    pollingInterval: 5000,
  });

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) {
      localStorage.clear();
      navigate('/login');
    }
  }, [error, navigate]);

  const [createRound, { isLoading: isCreating }] = useCreateRoundMutation();

  const handleCreateRound = async () => {
    try {
      const newRound = await createRound().unwrap();
      navigate(`/rounds/${newRound.id}`);
    } catch (error) {
      console.error('Failed to create round:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const sortRoundsByStatus = (rounds: Round[]) => {
    const roundsWithStatus = rounds.map(round => ({
      ...round,
      calculatedStatus: calculateRoundStatus(round, currentTime),
    }));

    return roundsWithStatus.sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 0, cooldown: 1, completed: 2 };
      const aOrder = statusOrder[a.calculatedStatus.status] ?? 3;
      const bOrder = statusOrder[b.calculatedStatus.status] ?? 3;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.createdAt - a.createdAt;
    });
  };

  const groupRoundsByStatus = (rounds: Round[]) => {
    const sortedRounds = sortRoundsByStatus(rounds);
    const groups: Record<string, Round[]> = {
      active: [],
      cooldown: [],
      completed: [],
    };

    sortedRounds.forEach(round => {
      const status = calculateRoundStatus(round, currentTime).status;
      if (status in groups) {
        groups[status].push(round);
      }
    });

    return {
      active: groups.active,
      cooldown: groups.cooldown,
      completed: groups.completed,
    };
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
    const errorMessage = 'data' in error && error.data
      ? String(error.data)
      : 'status' in error
        ? `Error ${error.status}`
        : 'Failed to connect to backend';

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
          {errorMessage}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <AppHeader
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
              startIcon={isCreating ? <CircularProgress size={20} /> : <Add />}
              onClick={handleCreateRound}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Round'}
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
              if (!rounds) return null;
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
                          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={round.id}>
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
                          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={round.id}>
                            <RoundCard round={round} currentTime={currentTime} navigate={navigate} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {groupedRounds.completed.length > 0 && (
                    <Box>
                      <Paper
                        elevation={1}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          mb: 2,
                          cursor: 'pointer',
                          bgcolor: showCompleted ? 'action.selected' : 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            borderColor: 'primary.main',
                            transform: 'translateY(-1px)',
                            boxShadow: 2,
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                        onClick={() => setShowCompleted(prev => !prev)}
                      >
                        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          ⚪ Completed Rounds ({groupedRounds.completed.length})
                        </Typography>
                        <IconButton
                          size="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        >
                          {showCompleted ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Paper>

                      <Collapse in={showCompleted}>
                        <Grid container spacing={2}>
                          {groupedRounds.completed.map((round) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={round.id}>
                              <RoundCard round={round} currentTime={currentTime} navigate={navigate} />
                            </Grid>
                          ))}
                        </Grid>
                      </Collapse>
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

// Round card component
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
