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
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { Close, Pause, PlayArrow } from '@mui/icons-material';
import { API_BASE_URL, authApi } from '../api';
import { BOT_BEHAVIOR, BOT_SPEED_PRESETS, BOTS_CONFIG } from '../config/bots.config';

type SpeedPreset = keyof typeof BOT_SPEED_PRESETS;

interface BotStatus {
  username: string;
  status: 'idle' | 'authenticating' | 'registering' | 'active' | 'paused' | 'error';
  token?: string;
  tapsCount: number;
  lastTap?: number;
  error?: string;
  speedPreset: SpeedPreset;
}

interface BotManagerProps {
  roundId: string;
  roundStatus: 'cooldown' | 'active' | 'completed';
  onStatsUpdate?: () => void;
}

export function BotManager({ roundId, roundStatus, onStatsUpdate }: BotManagerProps) {
  const [activeBots, setActiveBots] = useState<BotStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedPreset>('normal');
  const intervalsRef = useRef<Map<string, number>>(new Map());

  const stopAllBots = useCallback(() => {
    intervalsRef.current.forEach((interval) => {
      clearInterval(interval);
    });
    intervalsRef.current.clear();
    setActiveBots([]);
  }, []);

  useEffect(() => {
    return () => {
      stopAllBots();
    };
  }, [stopAllBots]);

  useEffect(() => {
    if (roundStatus !== 'active') {
      stopAllBots();
    }
  }, [roundStatus, stopAllBots]);

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
        password: botConfig.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
  };

  const updateBotStatus = (username: string, updates: Partial<BotStatus>) => {
    setActiveBots(prev => prev.map(bot =>
      bot.username === username ? { ...bot, ...updates } : bot,
    ));
  };

  const performBotTap = async (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    try {
      const response = await fetch(`${API_BASE_URL}/tap/${roundId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bot.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Tap failed: ${response.status}`);
      }
      
      setActiveBots(prev => prev.map(existingBot =>
        existingBot.username === bot.username
          ? {
            ...existingBot,
            tapsCount: existingBot.tapsCount + 1,
            lastTap: Date.now(),
          }
          : existingBot,
      ));

    } catch (error) {
      console.error(`Bot ${bot.username} tap failed:`, error);

      updateBotStatus(bot.username, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const getRandomInterval = (speedPreset: SpeedPreset) => {
    const preset = BOT_SPEED_PRESETS[speedPreset];
    return Math.floor(
      Math.random() * (preset.maxInterval - preset.minInterval) + preset.minInterval,
    );
  };

  const startBot = (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    const preset = BOT_SPEED_PRESETS[bot.speedPreset];

    const interval = setInterval(() => {
      if (roundStatus !== 'active') {
        stopBot(bot.username);
        return;
      }

      if (Math.random() < preset.tapChance) {
        performBotTap(bot);
      }
    }, getRandomInterval(bot.speedPreset));

    intervalsRef.current.set(bot.username, interval);
    updateBotStatus(bot.username, { status: 'active' });
  };

  const stopBot = (username: string) => {
    const interval = intervalsRef.current.get(username);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(username);
    }
    setActiveBots(prev => prev.filter(bot => bot.username !== username));
  };

  const pauseBot = (username: string) => {
    const interval = intervalsRef.current.get(username);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(username);
    }
    updateBotStatus(username, { status: 'paused' });
  };

  const resumeBot = (username: string) => {
    const bot = activeBots.find(b => b.username === username);
    if (bot && bot.token) {
      startBot(bot);
    }
  };

  const getNextAvailableBot = () => {
    const usedBotNames = activeBots.map(bot => bot.username);
    return BOTS_CONFIG.find(bot => !usedBotNames.includes(bot.username));
  };

  const addBot = async () => {
    if (roundStatus !== 'active' || activeBots.length >= BOT_BEHAVIOR.MAX_BOTS) return;

    const botConfig = getNextAvailableBot();
    if (!botConfig) return;

    setIsAddingBot(true);

    const newBot: BotStatus = {
      username: botConfig.username,
      status: 'authenticating',
      tapsCount: 0,
      speedPreset: selectedSpeed,
    };

    setActiveBots(prev => [...prev, newBot]);

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

        const botWithToken = { ...newBot, token };
        startBot(botWithToken);
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

    setIsAddingBot(false);
  };

  const getShortBotName = (username: string) => {
    return username.replace('bot_', '').replace('_2', '²');
  };

  const getStatusColor = (status: BotStatus['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'authenticating':
      case 'registering':
        return 'info';
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
        return 'Login...';
      case 'registering':
        return 'Signup...';
      case 'active':
        return `${bot.tapsCount}`;
      case 'paused':
        return 'Paused';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const activeBotsCount = activeBots.filter(bot => bot.status === 'active').length;
  const totalTaps = activeBots.reduce((sum, bot) => sum + bot.tapsCount, 0);
  const canAddMore = activeBots.length < BOT_BEHAVIOR.MAX_BOTS && getNextAvailableBot();

  if (roundStatus === 'completed') {
    return null;
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🤖 Bot Manager
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Speed</InputLabel>
              <Select
                value={selectedSpeed}
                label="Speed"
                onChange={(e) => setSelectedSpeed(e.target.value as SpeedPreset)}
                disabled={roundStatus !== 'active'}
              >
                {Object.entries(BOT_SPEED_PRESETS).map(([key, preset]) => (
                  <MenuItem key={key} value={key}>
                    {preset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              size="small"
              onClick={addBot}
              disabled={isAddingBot || roundStatus !== 'active' || !canAddMore}
              sx={{ minWidth: '100px' }}
            >
              {isAddingBot ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                'Add Bot'
              )}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {activeBots.length}/{BOT_BEHAVIOR.MAX_BOTS} bots • {activeBotsCount} active
          </Typography>
        </Box>

        {activeBotsCount > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {activeBotsCount} bots active • {totalTaps} total taps
          </Alert>
        )}

        {activeBots.length > 0 && (
          <>
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
                {activeBots.map((bot) => (
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
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {getShortBotName(bot.username)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Speed: {BOT_SPEED_PRESETS[bot.speedPreset].name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={getStatusText(bot)}
                              color={getStatusColor(bot.status)}
                              size="small"
                            />

                            {/* Кнопка паузы/воспроизведения */}
                            {(bot.status === 'active' || bot.status === 'paused') && (
                              <IconButton
                                size="small"
                                onClick={() => bot.status === 'active' ? pauseBot(bot.username) : resumeBot(bot.username)}
                                color={bot.status === 'active' ? 'warning' : 'success'}
                              >
                                {bot.status === 'active' ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                              </IconButton>
                            )}

                            {/* Кнопка удаления (крестик) */}
                            <IconButton
                              size="small"
                              onClick={() => stopBot(bot.username)}
                              color="error"
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}
