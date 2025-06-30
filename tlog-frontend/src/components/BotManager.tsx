import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Collapse, Container, Slider, Typography } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { BOT_BEHAVIOR, BOT_SPEED_PRESETS, BOTS_CONFIG } from '../config/bots.config';
import { BotInstance } from './BotInstance';

type SpeedPreset = keyof typeof BOT_SPEED_PRESETS;

interface LeaderboardEntry {
  username: string;
  points: number;
  tapCount?: number;
}

interface RoundData {
  readonly id: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly status: 'cooldown' | 'active' | 'completed';
  readonly leaderboard?: readonly LeaderboardEntry[];
}

interface BotManagerProps {
  roundData: RoundData;
  onStatsUpdate?: () => void;
}

const speedPresetKeys = Object.keys(BOT_SPEED_PRESETS) as SpeedPreset[];

export function BotManager({ roundData, onStatsUpdate }: BotManagerProps) {
  const [activeBotConfigs, setActiveBotConfigs] = useState<Array<{username: string; password: string}>>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSpeedIndex, setSelectedSpeedIndex] = useState(1);
  const leaderboardIntervalRef = useRef<number | undefined>(undefined);

  const selectedSpeed = speedPresetKeys[selectedSpeedIndex];

  const availableBots = BOTS_CONFIG.filter(bot =>
    !activeBotConfigs.some(activeBot => activeBot.username === bot.username)
  );

  const canAddBots = activeBotConfigs.length < BOT_BEHAVIOR.MAX_BOTS &&
                    availableBots.length > 0 &&
                    roundData.status !== 'completed';

  const addBot = useCallback(() => {
    if (!canAddBots) return;

    const shuffledBots = [...availableBots];

    for (let i = shuffledBots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledBots[i], shuffledBots[j]] = [shuffledBots[j], shuffledBots[i]];
    }

    const botToAdd = shuffledBots[0];
    setActiveBotConfigs(prev => [...prev, botToAdd]);
  }, [canAddBots, availableBots]);

  const removeBot = useCallback((username: string) => {
    setActiveBotConfigs(prev => prev.filter(bot => bot.username !== username));
  }, []);

  const removeAllBots = useCallback(() => {
    setActiveBotConfigs([]);
  }, []);

  useEffect(() => {
    if (roundData.status === 'completed') {
      removeAllBots();
    }
  }, [roundData.status, removeAllBots]);

  useEffect(() => {
    return () => {
      if (leaderboardIntervalRef.current) {
        clearInterval(leaderboardIntervalRef.current);
      }
    };
  }, []);

  if (roundData.status === 'completed') {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      }}
    >
      <Container maxWidth={false} sx={{ px: 2 }}>
        <Card elevation={0} sx={{ bgcolor: 'transparent' }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Collapse in={isExpanded}>
              <Container sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>
                    🤖 Bot Manager
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {activeBotConfigs.length}/{BOT_BEHAVIOR.MAX_BOTS} bots
                  </Typography>
                  {roundData.status === 'cooldown' && (
                    <Typography variant="caption" color="warning.main" sx={{ whiteSpace: 'nowrap' }}>
                      (Ready to start when round begins)
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                    Speed:
                  </Typography>
                  <Slider
                    value={selectedSpeedIndex}
                    onChange={(_, value) => setSelectedSpeedIndex(value as number)}
                    min={0}
                    max={speedPresetKeys.length - 1}
                    step={1}
                    marks={speedPresetKeys.map((_, index) => ({
                      value: index,
                      label: BOT_SPEED_PRESETS[speedPresetKeys[index]].name,
                    }))}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={addBot}
                    disabled={!canAddBots}
                    sx={{ minWidth: '100px' }}
                  >
                    Add Bot
                  </Button>
                </Box>

                {activeBotConfigs.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={removeAllBots}
                    sx={{ minWidth: '100px' }}
                  >
                    Remove All
                  </Button>
                )}
              </Container>

              {activeBotConfigs.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    width: '100%',
                    mb: 1,
                  }}
                >
                  {activeBotConfigs.map((botConfig) => (
                    <BotInstance
                      key={botConfig.username}
                      botConfig={botConfig}
                      roundData={roundData}
                      speedPreset={selectedSpeed}
                      onRemove={removeBot}
                      onStatsUpdate={onStatsUpdate}
                    />
                  ))}
                </Box>
              )}
            </Collapse>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: activeBotConfigs.length > 0 ? 1 : 0 }}>
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                sx={{ minWidth: 'auto', fontSize: '0.8rem' }}
              >
                {isExpanded ? 'Hide' : 'Show'} Bot Manager {activeBotConfigs.length > 0 && `(${activeBotConfigs.length})`}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
