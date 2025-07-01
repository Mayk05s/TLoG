import React, { useCallback, useMemo, useRef, useState } from 'react';
import gooseStage0 from '../assets/goose/1.png';
import gooseStage1 from '../assets/goose/2.png';
import gooseStage2 from '../assets/goose/3.png';
import gooseStage3 from '../assets/goose/4.png';
import gooseStage4 from '../assets/goose/5.png';
import gooseStage5 from '../assets/goose/6.png';
import gooseStage6 from '../assets/goose/7.png';
import '../styles/_components.scss';
import { Box, Typography } from '@mui/material';
import { formatTimeLeft } from '../lib/utils';

interface GooseButtonProps {
  score: number;
  onClick: () => void;
  disabled?: boolean;
  timeLeft?: number;
}

const GOOSE_STAGES = [
  { threshold: 0, image: gooseStage0, bgClass: 'goose-bg-stage-0', intensity: 1 },
  { threshold: 10, image: gooseStage1, bgClass: 'goose-bg-stage-1', intensity: 1.2 },
  { threshold: 50, image: gooseStage2, bgClass: 'goose-bg-stage-2', intensity: 1.4 },
  { threshold: 150, image: gooseStage3, bgClass: 'goose-bg-stage-3', intensity: 1.6 },
  { threshold: 300, image: gooseStage4, bgClass: 'goose-bg-stage-4', intensity: 1.8 },
  { threshold: 500, image: gooseStage5, bgClass: 'goose-bg-stage-5', intensity: 2 },
  { threshold: 1000, image: gooseStage6, bgClass: 'goose-bg-stage-6', intensity: 2.5 },
];

interface WaterRipple {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

interface EnergyPulse {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export const GooseButton: React.FC<GooseButtonProps> = ({ score, onClick, disabled, timeLeft }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [waterRipples, setWaterRipples] = useState<WaterRipple[]>([]);
  const [energyPulses, setEnergyPulses] = useState<EnergyPulse[]>([]);
  const [rippleId, setRippleId] = useState(0);
  const [pulseId, setPulseId] = useState(0);
  const gooseRef = useRef<HTMLDivElement>(null);

  const currentStage = useMemo(() => {
    return GOOSE_STAGES.slice()
      .reverse()
      .find(stage => score >= stage.threshold) || GOOSE_STAGES[0];
  }, [score]);

  const virusSpores = useMemo(() => {
    const maxScore = 1000;
    const scoreProgress = Math.min(score / maxScore, 1);

    // Minimum and maximum number of spores
    const minSpores = 6;
    const maxSpores = 70;
    const baseCount = Math.round(minSpores + (scoreProgress * (maxSpores - minSpores)));

    // Color progression based on score
    const colorProgress = scoreProgress;
    const red = Math.round(255 * colorProgress);
    const green = Math.round(255 * (1 - colorProgress * 0.5));
    const blue = Math.round(100 * (1 - colorProgress));
    const sporeColor = `rgba(${red}, ${green}, ${blue}, 0.8)`;
    const shadowColor = `rgba(${red}, ${green}, ${blue}, 0.6)`;

    const spores = [];

    // Generate spores based on the current score
    for (let i = 0; i < baseCount; i++) {
      const sizeVariant = (i % 5) + 1;
      const sizeMultiplier = 1 + (scoreProgress * 3);

      let top, left;

      if (i < 12) {
        // First 12 spores - evenly distributed on a 4x3 grid
        const gridX = i % 4;
        const gridY = Math.floor(i / 4) % 3;
        const baseX = (gridX / 3) * 80 + 10; // 10%, 36.7%, 63.3%, 90%
        const baseY = (gridY / 2) * 80 + 10; // 10%, 50%, 90%

        // Random offset within the grid cell
        const offsetX = ((i * 73) % 21) - 10;
        const offsetY = ((i * 97) % 21) - 10;

        top = Math.max(5, Math.min(90, baseY + offsetY));
        left = Math.max(5, Math.min(90, baseX + offsetX));
      } else {
        // Other spores - pseudo-randomly across the area
        const seed1 = (i * 73 + 17) % 100;
        const seed2 = (i * 97 + 23) % 100;
        top = (seed1 * 0.85) + 5;
        left = (seed2 * 0.85) + 5;
      }

      spores.push({
        id: i,
        className: 'virus-spore',
        size: Math.round(3 + (sizeVariant * 1.5 * sizeMultiplier)),
        opacity: 1,
        top: top + '%',
        left: left + '%',
        backgroundColor: sporeColor,
        boxShadow: `0 0 ${Math.round(4 + scoreProgress * 8)}px ${shadowColor}`,
        animationDelay: (i * 0.1) + 's',
        animationDuration: (6 + (i % 3)) + 's',
      });
    }

    // Giant spores only at high levels (800+ points)
    if (score >= 800) {
      const giantSporeCount = Math.min(3, Math.floor((score - 800) / 67) + 1);

      for (let i = 0; i < giantSporeCount; i++) {
        const giantIndex = baseCount + i;
        const sizeVariant = (giantIndex % 5) + 1;
        const sizeMultiplier = 1 + (scoreProgress * 3);

        let top, left;

        if (giantIndex < 12) {
          const gridX = giantIndex % 4;
          const gridY = Math.floor(giantIndex / 4) % 3;
          const baseX = (gridX / 3) * 80 + 10;
          const baseY = (gridY / 2) * 80 + 10;

          const offsetX = ((giantIndex * 73) % 21) - 10;
          const offsetY = ((giantIndex * 97) % 21) - 10;

          top = Math.max(5, Math.min(90, baseY + offsetY));
          left = Math.max(5, Math.min(90, baseX + offsetX));
        } else {
          const seed1 = (giantIndex * 73 + 17) % 100;
          const seed2 = (giantIndex * 97 + 23) % 100;
          top = (seed1 * 0.85) + 5;
          left = (seed2 * 0.85) + 5;
        }

        const giantRed = Math.min(255, red + 50);
        const giantGreen = Math.max(0, green - 50);
        const giantBlue = Math.max(0, blue - 20);
        const giantColor = `rgba(${giantRed}, ${giantGreen}, ${giantBlue}, 0.9)`;
        const giantShadow = `rgba(${giantRed}, ${giantGreen}, ${giantBlue}, 0.7)`;

        spores.push({
          id: giantIndex,
          className: 'virus-spore virus-spore-giant',
          size: Math.round(15 + (sizeVariant * 4 * sizeMultiplier)),
          opacity: 1,
          top: top + '%',
          left: left + '%',
          backgroundColor: giantColor,
          boxShadow: `0 0 ${Math.round(12 + scoreProgress * 16)}px ${giantShadow}`,
          animationDelay: (giantIndex * 0.1) + 's',
          animationDuration: (6 + (giantIndex % 3)) + 's',
        });
      }
    }

    return spores;
  }, [score]); // Recalculate based on score directly

  const handleGooseClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsPressed(true);
    onClick();

    if (gooseRef.current) {
      const rect = gooseRef.current.getBoundingClientRect();
      const containerRect = gooseRef.current.closest('.goose-container')?.getBoundingClientRect();

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      setWaterRipples(ripples => [...ripples, {
        x: clickX,
        y: clickY,
        id: rippleId,
        timestamp: Date.now(),
      }]);
      setRippleId(id => id + 1);

      if (containerRect && !disabled) {
        const pulseX = rect.left - containerRect.left + clickX;
        const pulseY = rect.top - containerRect.top + clickY;

        setEnergyPulses(pulses => [...pulses, {
          x: pulseX,
          y: pulseY,
          id: pulseId,
          timestamp: Date.now(),
        }]);
        setPulseId(id => id + 1);
      }
    }

    setTimeout(() => setIsPressed(false), 200);
  }, [onClick, rippleId, pulseId, disabled]);

  React.useEffect(() => {
    if (waterRipples.length === 0) return;
    const timeout = setTimeout(() => {
      setWaterRipples(ripples => ripples.filter(r => Date.now() - r.timestamp < 1500));
    }, 100);
    return () => clearTimeout(timeout);
  }, [waterRipples]);

  React.useEffect(() => {
    if (energyPulses.length === 0) return;
    const timeout = setTimeout(() => {
      setEnergyPulses(pulses => pulses.filter(p => Date.now() - p.timestamp < 1500));
    }, 100);
    return () => clearTimeout(timeout);
  }, [energyPulses]);

  return (
    <div className="goose-container">
      <Box sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        // transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center',
        p: 2,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 2,
        border: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)'
      }}>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ mb: 1 }}>
          Your Score
        </Typography>
        <Typography variant="h2" sx={{
          fontWeight: 'bold',
          color: 'white',
          lineHeight: 1
        }}>
          {score || 0}
        </Typography>
      </Box>

      {/* Virus effect background */}
      <div className={`goose-background ${currentStage.bgClass}`}>
        {/* Main breathing background */}
        {!disabled && (
          <div className="virus-environment">
            <div className="virus-layer virus-layer-1"></div>
            <div className="virus-layer virus-layer-2"></div>
            <div className="virus-layer virus-layer-3"></div>
          </div>
        )}

        {/* Floating spores and particles */}
        <div className="virus-particles">
          {virusSpores.map(spore => (
            <div
              key={spore.id}
              className={spore.className}
              style={{
                width: spore.size,
                height: spore.size,
                opacity: spore.opacity,
                top: spore.top,
                left: spore.left,
                backgroundColor: spore.backgroundColor,
                boxShadow: spore.boxShadow,
                animationDelay: spore.animationDelay,
                animationDuration: spore.animationDuration,
              }}
            ></div>
          ))}
        </div>

        {/* Light waves */}
        <div className="light-waves">
          <div className="light-wave light-wave-1"></div>
          <div className="light-wave light-wave-2"></div>
        </div>
      </div>

      {/* Interactive goose area */}
      <div
        ref={gooseRef}
        className={`goose-interactive ${isPressed ? 'goose-pressed' : ''} ${disabled ? 'goose-disabled' : ''}`}
        onClick={disabled ? undefined : handleGooseClick}
        role="button"
        tabIndex={0}
        aria-label={`Goose mutation stage ${currentStage.threshold}+ - Click to tap`}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onClick();
            setIsPressed(true);
            setTimeout(() => setIsPressed(false), 200);
          }
        }}
      >
        {waterRipples.map(ripple => (
          <div
            key={ripple.id}
            className="water-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              animationDelay: `${Date.now() - ripple.timestamp}ms`,
            }}
          />
        ))}
        {/* Goose sprite */}
        <div className="goose-sprite-container">
          <img
            src={currentStage.image}
            alt={`Mutated goose - Stage ${score}+ taps`}
            className="goose-sprite"
            draggable={false}
          />

          {/* Glowing eyes for high stages */}
          {currentStage.threshold >= 500 && (
            <div className="goose-eyes-glow"></div>
          )}

          {/* Energy aura for maximum stages */}
          {currentStage.threshold >= 1000 && (
            <div className="goose-energy-aura"></div>
          )}
        </div>
      </div>
      {energyPulses.map(pulse => (
        <div
          key={pulse.id}
          className="energy-pulse energy-pulse-click"
          style={{
            left: pulse.x,
            top: pulse.y,
          }}
        />
      ))}

      {/* Mutation stage indicator */}
      <div className="goose-stage-indicator">
        <div className="mutation-level" style={{
          transform: `scaleX(${Math.min(currentStage.intensity / 2.5, 1)})`,
        }}></div>
      </div>

      {/* Round inactive overlay */}
      {disabled && (
        <div className="round-inactive-overlay">
          <div className="round-inactive-text">
            {timeLeft && timeLeft > 0 ? formatTimeLeft(timeLeft) : 'ROUND COMPILED'}
          </div>
        </div>
      )}
    </div>
  );
};
