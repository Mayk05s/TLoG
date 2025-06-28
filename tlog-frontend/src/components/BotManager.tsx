import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { API_BASE_URL, authApi, tapsApi } from '../api';
import { BOT_BEHAVIOR, BOTS_CONFIG } from '../config/bots.config';

interface BotStatus {
  username: string;
  status: 'idle' | 'authenticating' | 'registering' | 'active' | 'error';
  token?: string;
  tapsCount: number;
  lastTap?: number;
  error?: string;
}

interface BotManagerProps {
  roundId: string;
  roundStatus: 'cooldown' | 'active' | 'completed';
  onStatsUpdate?: () => void;
}

export function BotManager({ roundId, roundStatus, onStatsUpdate }: BotManagerProps) {
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const intervalsRef = useRef<Map<string, number>>(new Map());

  const stopAllBots = useCallback(() => {
    intervalsRef.current.forEach((interval, username) => {
      clearInterval(interval);
      updateBotStatus(username, { status: 'idle' });
    });
    intervalsRef.current.clear();
  }, []);

  useEffect(() => {
    initializeBots();
    return () => {
      stopAllBots();
    };
  }, [stopAllBots]);

  useEffect(() => {
    if (roundStatus !== 'active') {
      stopAllBots();
    }
  }, [roundStatus, stopAllBots]);

  const initializeBots = () => {
    const initialBots: BotStatus[] = BOTS_CONFIG.map(bot => ({
      username: bot.username,
      status: 'idle',
      tapsCount: 0,
    }));
    setBots(initialBots);
  };

  const authenticateBot = async (botConfig: typeof BOTS_CONFIG[0]): Promise<string | null> => {
    try {
      const response = await authApi.login(botConfig.username, botConfig.password);
      return response.accessToken;
    } catch (error) {
      console.warn(`Bot ${botConfig.username} auth failed:`, error);
      return null;
    }
  };

  const registerBot = async (botConfig: typeof BOTS_CONFIG[0]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: botConfig.username,
        password: botConfig.password
      })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
  };

  const updateBotStatus = (username: string, updates: Partial<BotStatus>) => {
    setBots(prev => prev.map(bot =>
      bot.username === username ? { ...bot, ...updates } : bot,
    ));
  };

  const performBotTap = async (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    try {
      const currentToken = localStorage.getItem('accessToken');
      localStorage.setItem('accessToken', bot.token);

      await tapsApi.submitTap(roundId);

      if (currentToken) {
        localStorage.setItem('accessToken', currentToken);
      }

      updateBotStatus(bot.username, {
        tapsCount: bot.tapsCount + 1,
        lastTap: Date.now(),
      });

      if (onStatsUpdate) {
        onStatsUpdate();
      }
    } catch (error) {
      console.error(`Bot ${bot.username} tap failed:`, error);
      updateBotStatus(bot.username, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const getRandomInterval = () => {
    return Math.floor(
      Math.random() * (BOT_BEHAVIOR.MAX_TAP_INTERVAL - BOT_BEHAVIOR.MIN_TAP_INTERVAL) +
      BOT_BEHAVIOR.MIN_TAP_INTERVAL,
    );
  };

  const startBot = (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    const interval = setInterval(() => {
      if (roundStatus !== 'active') {
        stopBot(bot.username);
        return;
      }

      if (Math.random() < BOT_BEHAVIOR.CHANCE_TO_TAP_PER_CHECK) {
        performBotTap(bot);
      }
    }, getRandomInterval());

    intervalsRef.current.set(bot.username, interval);
    updateBotStatus(bot.username, { status: 'active' });
  };

  const stopBot = (username: string) => {
    const interval = intervalsRef.current.get(username);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(username);
    }
    updateBotStatus(username, { status: 'idle' });
  };

  const addAllBots = async () => {
    if (roundStatus !== 'active') return;

    setIsInitializing(true);

    for (const botConfig of BOTS_CONFIG) {
      updateBotStatus(botConfig.username, { status: 'authenticating' });

      try {
        let token = await authenticateBot(botConfig);

        if (!token) {
          updateBotStatus(botConfig.username, { status: 'registering' });
          await registerBot(botConfig);
          token = await authenticateBot(botConfig);
        }

        if (token) {
          updateBotStatus(botConfig.username, {
            status: 'idle',
            token,
            error: undefined,
          });

          const botStatus = bots.find(b => b.username === botConfig.username);
          if (botStatus) {
            startBot({ ...botStatus, token });
          }
        } else {
          updateBotStatus(botConfig.username, {
            status: 'error',
            error: 'Failed to authenticate after registration',
          });
        }
      } catch (error) {
        updateBotStatus(botConfig.username, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsInitializing(false);
  };

  const getStatusColor = (status: BotStatus['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'authenticating':
      case 'registering':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (bot: BotStatus) => {
    switch (bot.status) {
      case 'idle':
        return 'Ready';
      case 'authenticating':
        return 'Logging in...';
      case 'registering':
        return 'Registering...';
      case 'active':
        return `Active (${bot.tapsCount} taps)`;
      case 'error':
        return bot.error || 'Error';
      default:
        return 'Unknown';
    }
  };

  const activeBots = bots.filter(bot => bot.status === 'active').length;
  const totalTaps = bots.reduce((sum, bot) => sum + bot.tapsCount, 0);

  if (roundStatus === 'completed') {
    return null;
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            🤖 Bot Manager
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={addAllBots}
            disabled={isInitializing || roundStatus !== 'active'}
            sx={{ minWidth: '100px' }}
          >
            {isInitializing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              'Add Bots'
            )}
          </Button>
        </Box>

        {activeBots > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {activeBots} bots active • {totalTaps} total taps
          </Alert>
        )}

        <Button
          variant="text"
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ mb: 1 }}
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>

        <Collapse in={isExpanded}>
          <List dense>
            {bots.map((bot) => (
              <ListItem
                key={bot.username}
                sx={{
                  bgcolor: bot.status === 'active' ? 'success.light' : 'transparent',
                  borderRadius: 1,
                  mb: 0.5,
                  opacity: bot.status === 'error' ? 0.7 : 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {bot.username}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getStatusText(bot)}
                          color={getStatusColor(bot.status)}
                          size="small"
                        />
                        {bot.status === 'active' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => stopBot(bot.username)}
                            sx={{ minWidth: '60px', fontSize: '0.75rem' }}
                          >
                            Stop
                          </Button>
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </CardContent>
    </Card>
  );
}
