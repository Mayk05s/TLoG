import React, { useCallback, useMemo, useState } from 'react';

// Импорты изображений гуся
import gooseStage0 from '../assets/goose/1.png';
import gooseStage1 from '../assets/goose/2.png';
import gooseStage2 from '../assets/goose/3.png';
import gooseStage3 from '../assets/goose/4.png';
import gooseStage4 from '../assets/goose/5.png';
import gooseStage5 from '../assets/goose/6.png';
import gooseStage6 from '../assets/goose/7.png';

interface GooseButtonProps {
  score: number;
  onClick: () => void;
}

const GOOSE_STAGES = [
  { threshold: 0, image: gooseStage0, bgColors: 'from-gray-400 to-gray-600' },
  { threshold: 10, image: gooseStage1, bgColors: 'from-green-400 to-green-600' },
  { threshold: 50, image: gooseStage2, bgColors: 'from-blue-400 to-blue-600' },
  { threshold: 150, image: gooseStage3, bgColors: 'from-purple-400 to-purple-600' },
  { threshold: 300, image: gooseStage4, bgColors: 'from-yellow-400 to-yellow-600' },
  { threshold: 500, image: gooseStage5, bgColors: 'from-red-400 to-red-600' },
  { threshold: 1000, image: gooseStage6, bgColors: 'from-pink-400 to-pink-600' },
];

export const GooseButton: React.FC<GooseButtonProps> = ({ score, onClick }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showClickEffect, setShowClickEffect] = useState(false);

  const currentStage = useMemo(() => {
    return GOOSE_STAGES.slice()
      .reverse()
      .find(stage => score >= stage.threshold) || GOOSE_STAGES[0];
  }, [score]);

  const handleClick = useCallback(() => {
    setIsClicked(true);
    setShowClickEffect(true);
    onClick();

    setTimeout(() => setIsClicked(false), 150);
    setTimeout(() => setShowClickEffect(false), 500);
  }, [onClick]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <div
        className={`animate-goose-bg-breathing absolute inset-0 rounded-full bg-gradient-to-br ${currentStage.bgColors}`}
        style={{ filter: `blur(10px) saturate(${1 + score / 500})` }}
      />
      <button
        onClick={handleClick}
        className="relative z-10 flex items-center justify-center w-full h-full bg-transparent rounded-full focus:outline-none"
        aria-label="Goose button"
      >
        {showClickEffect && (
          <div className="animate-click-ring-animation pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/80" />
        )}
        <img
          src={currentStage.image}
          alt={`Goose stage for score ${score}`}
          className={`transition-transform duration-150 ease-in-out ${isClicked ? 'scale-90' : 'scale-100'}`}
          style={{ width: '75%', height: '75%' }}
        />
      </button>
    </div>
  );
};
