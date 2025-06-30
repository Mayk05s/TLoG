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

export const GooseButton: React.FC<GooseButtonProps> = ({ score, onClick }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [waterRipples, setWaterRipples] = useState<WaterRipple[]>([]);
  const [rippleId, setRippleId] = useState(0);
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
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      setWaterRipples(ripples => [...ripples, {
        x: centerX,
        y: centerY,
        id: rippleId,
        timestamp: Date.now()
      }]);
      setRippleId(id => id + 1);
    }

    setTimeout(() => setIsPressed(false), 200);
  }, [onClick, rippleId]);

  React.useEffect(() => {
    if (waterRipples.length === 0) return;
    const timeout = setTimeout(() => {
      setWaterRipples(ripples => ripples.filter(r => Date.now() - r.timestamp < 1500));
    }, 100);
    return () => clearTimeout(timeout);
  }, [waterRipples]);

  return (
    <div className="goose-container">
      {/* Virus effect background */}
      <div className={`goose-background ${currentStage.bgClass}`}>
        {/* Main breathing background */}
        <div className="virus-environment">
          <div className="virus-layer virus-layer-1"></div>
          <div className="virus-layer virus-layer-2"></div>
          <div className="virus-layer virus-layer-3"></div>
        </div>

        {/* Floating spores and particles */}
        <div className="virus-particles">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`virus-spore virus-spore-${i + 1}`}></div>
          ))}
        </div>

        {/* Energy pulses */}
        <div className="energy-pulses">
          <div className="energy-pulse energy-pulse-1"></div>
          <div className="energy-pulse energy-pulse-2"></div>
          <div className="energy-pulse energy-pulse-3"></div>
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
        className={`goose-interactive ${isPressed ? 'goose-pressed' : ''}`}
        onClick={handleGooseClick}
        role="button"
        tabIndex={0}
        aria-label={`Goose mutation stage ${currentStage.threshold}+ - Click to tap`}
        onKeyDown={(e) => {
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

      {/* Mutation stage indicator */}
      <div className="goose-stage-indicator">
        <div className="mutation-level" style={{
          transform: `scaleX(${Math.min(currentStage.intensity / 2.5, 1)})`
        }}></div>
      </div>
    </div>
  );
};
