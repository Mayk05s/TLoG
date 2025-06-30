import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useGetRoundQuery, useSubmitTapMutation } from '../store/api';
import { calculateRoundStatus, formatTimeLeft } from '../lib/utils';
import { AppHeader } from '../components/AppHeader';
import { GooseButton } from '../components/GooseButton';
import { BotManager } from '../components/BotManager';

export function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isRoundEnded, setIsRoundEnded] = useState(false);

  const {
    data: roundData,
    isLoading,
    error,
    refetch: refetchStats
  } = useGetRoundQuery(id!, {
    pollingInterval: isRoundEnded ? 0 : 2000,
    skip: !id,
  });

  const [submitTap] = useSubmitTapMutation();

  const handleTap = async () => {
    try {
      await submitTap(id!).unwrap();
    } catch (error) {
      console.warn('Tap failed:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (roundData) {
      const roundEnded = currentTime > roundData.endsAt + 2000;
      setIsRoundEnded(roundEnded);
    }
  }, [roundData, currentTime]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <>
        <AppHeader
          username={user.username}
          role={user.role}
          onLogout={handleLogout}
        />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading round data...
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

  if (error || !roundData) {
    return (
      <>
        <AppHeader
          username={user.username}
          role={user.role}
          onLogout={handleLogout}
        />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load round data'}
          </Alert>
        </Container>
      </>
    );
  }

  const roundWithStatus = calculateRoundStatus(roundData, currentTime);
  const canTap = roundWithStatus.status === 'active' && user.role !== 'nikita';
  const isCompleted = roundWithStatus.status === 'completed';
  const winner = isCompleted && roundData?.stats?.winner ? roundData.stats.winner : null;

  return (
    <>
      <AppHeader
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
      />

      <Container maxWidth="lg" sx={{ py: 2, pb: 20 }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Round {roundData.id.slice(0, 8)}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate('/rounds')}
            sx={{ minWidth: '120px' }}
          >
            ← Back to Rounds
          </Button>
        </Box>

        {isCompleted && winner && (
          <Paper
            elevation={4}
            sx={{
              p: 2,
              mb: 3,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
              color: 'common.white',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🏆 Round Champion
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
                {winner.username}
              </Typography>
              <Typography component="span" sx={{ opacity: 0.9 }}>
                with
              </Typography>
              <Chip label={`${winner.points} points`} color="secondary" sx={{ fontWeight: 'bold' }} />
            </Box>
          </Paper>
        )}

        <Box sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', lg: 'row' }
        }}>
          <Box sx={{ flex: 1 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 2,
                  mb: 3
                }}>
                  <Chip
                    label={roundWithStatus.status.charAt(0).toUpperCase() + roundWithStatus.status.slice(1)}
                    color={roundWithStatus.status === 'active' ? 'success' :
                      roundWithStatus.status === 'cooldown' ? 'warning' : 'default'}
                    size="medium"
                  />
                  {roundWithStatus.timeLeft !== undefined && roundWithStatus.timeLeft > 0 && (
                    <Typography variant="h4" className="text-mono" sx={{ color: 'primary.main' }}>
                      {formatTimeLeft(roundWithStatus.timeLeft)}
                    </Typography>
                  )}
                </Box>

                <Box sx={{
                  textAlign: 'center',
                  mb: 3,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'grey.300'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Your Score
                  </Typography>
                  <Typography variant="h2" sx={{
                    fontWeight: 'bold',
                    color: 'text.primary',
                    lineHeight: 1
                  }}>
                    {roundData.stats?.currentUserPoints || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total in round: {roundData.stats?.totalPoints || 0}
                  </Typography>
                </Box>

                <GooseButton
                  score={roundData.stats?.currentUserPoints || 0}
                  onClick={canTap ? handleTap : () => {}}
                />

                {roundWithStatus.status === 'cooldown' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Round starts in {formatTimeLeft(roundWithStatus.timeLeft || 0)}
                  </Alert>
                )}

                {isCompleted && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Round completed!
                    </Alert>
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="h6" gutterBottom>
                        Final Results
                      </Typography>
                      <Typography variant="body1">
                        Total points scored: {roundData.stats?.totalPoints || 0}
                      </Typography>
                      <Typography variant="body1">
                        Your final score: {roundData.stats?.currentUserPoints || 0} points
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {user.role === 'nikita' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    👑 Nikita role: You can watch but cannot earn points
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{
            width: { xs: '100%', lg: '300px' },
            flexShrink: 0
          }}>
            <Card sx={{ position: { lg: 'sticky' }, top: { lg: 20 } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🏆 Leaderboard
                </Typography>

                {!roundData.leaderboard || roundData.leaderboard.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No players yet
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {roundData.leaderboard.map((entry, index) => (
                      <ListItem
                        key={entry.username}
                        sx={{
                          bgcolor: entry.username === user.username ? 'primary.light' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                          border: entry.username === user.username ? 1 : 0,
                          borderColor: 'primary.main'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" component="span" sx={{ minWidth: '20px' }}>
                                  #{index + 1}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  component="span"
                                  sx={{
                                    fontWeight: entry.username === user.username ? 'bold' : 'normal',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {entry.username}
                                  {entry.username === user.username && ' (You)'}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
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
          </Box>
        </Box>

        <BotManager
          roundId={id!}
          roundStatus={roundWithStatus.status}
          onStatsUpdate={() => refetchStats()}
        />
      </Container>
    </>
  );
}
