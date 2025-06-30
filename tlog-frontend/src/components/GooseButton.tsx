import React, { useCallback, useMemo, useRef, useState } from 'react';
import gooseStage0 from '../assets/goose/1.png';
import gooseStage1 from '../assets/goose/2.png';
import gooseStage2 from '../assets/goose/3.png';
import gooseStage3 from '../assets/goose/4.png';
import gooseStage4 from '../assets/goose/5.png';
import gooseStage5 from '../assets/goose/6.png';
import gooseStage6 from '../assets/goose/7.png';
import '../styles/_components.scss';

interface GooseButtonProps {
  score: number;
  onClick: () => void;
  disabled?: boolean;
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

export const GooseButton: React.FC<GooseButtonProps> = ({ score, onClick, disabled }) => {
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
        timestamp: Date.now()
      }]);
      setRippleId(id => id + 1);

      if (containerRect && !disabled) {
        const pulseX = rect.left - containerRect.left + clickX;
        const pulseY = rect.top - containerRect.top + clickY;

        setEnergyPulses(pulses => [...pulses, {
          x: pulseX,
          y: pulseY,
          id: pulseId,
          timestamp: Date.now()
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
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`virus-spore virus-spore-${i + 1}`}></div>
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
            handleGooseClick(e as React.MouseEvent<HTMLDivElement>);
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
              animationDelay: `${Date.now() - ripple.timestamp}ms`
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
          transform: `scaleX(${Math.min(currentStage.intensity / 2.5, 1)})`
        }}></div>
      </div>

      {/* Round inactive overlay */}
      {disabled && (
        <div className="round-inactive-overlay">
          <div className="round-inactive-text">ROUND INACTIVE</div>
        </div>
      )}
    </div>
  );
};
