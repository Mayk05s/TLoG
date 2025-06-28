import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Fab,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { TouchApp } from '@mui/icons-material';
import { type RoundDetailsResponse, roundsApi, type StatsResponse, tapsApi } from '../api';
import { calculateRoundStatus, formatTimeLeft } from '../lib/utils';
import { AppHeader } from '../components/AppHeader';

export function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: round, isLoading: roundLoading, error: roundError } = useQuery<RoundDetailsResponse, Error>({
    queryKey: ['round', id],
    queryFn: () => roundsApi.getRound(id!),
    refetchInterval: 2000,
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<StatsResponse, Error>({
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
        <AppHeader
          title="Error Loading Round"
          onBack={() => navigate('/rounds')}
          backButtonText="Back to Rounds"
        />
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load round data'}
          </Alert>
        </Container>
      </>
    );
  }

  const roundWithStatus = calculateRoundStatus(round, currentTime);
  const canTap = roundWithStatus.status === 'active' && user.role !== 'nikita';

  return (
    <>
      <AppHeader
        title={`Round ${round.id.slice(0, 8)}`}
        onBack={() => navigate('/rounds')}
        backButtonText="Back to Rounds"
      />

      <Container sx={{ mt: 4, mb: 8 }}>
        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Game Status
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="body1">Status:</Typography>
                    <Chip
                      label={roundWithStatus.status}
                      color={roundWithStatus.status === 'active' ?
                             'success' :
                             roundWithStatus.status === 'cooldown' ? 'warning' : 'default'}
                    />
                  </Box>

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

          <Grid xs={12} md={6}>
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
                                {entry.points} pts
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
