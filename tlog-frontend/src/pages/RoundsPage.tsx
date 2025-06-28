import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { type Round, roundsApi } from '../api';
import { calculateRoundStatus } from '../lib/utils';
import { AppHeader } from '../components/AppHeader';
import { RoundStatusChip } from '../components/RoundStatusChip';

export function RoundsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: rounds, isLoading, error, refetch } = useQuery<Round[], Error>({
    queryKey: ['rounds'],
    queryFn: roundsApi.getRounds,
    refetchInterval: 5000,
  });

  // Handle authentication errors
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
              const roundWithStatus = calculateRoundStatus(round, currentTime);
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
                          <Box sx={{ mb: 1 }}>
                            <RoundStatusChip roundWithStatus={roundWithStatus} />
                          </Box>
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
