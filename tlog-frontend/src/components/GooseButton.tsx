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
    setTimeout(() => setShowClickEffect(false), 300);
  }, [onClick]);

  const gradientMoveKeyframes = `
    @keyframes gradientMove {
      0% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.05) rotate(1deg); }
      100% { transform: scale(1.1) rotate(-1deg); }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: gradientMoveKeyframes }} />
      <div
        className="relative flex items-center justify-center"
      >
        {/* Анимированный фон */}
        <div
          className={`
            absolute inset-0 rounded-full blur-xl opacity-60
            bg-gradient-to-br ${currentStage.bgColors}
            animate-pulse
            transition-all duration-1000 ease-in-out
          `}
          style={{
            transform: isClicked ? 'scale(1.2)' : 'scale(1)',
            animation: 'gradientMove 4s ease-in-out infinite alternate',
          }}
        />

        {/* Эффект вспышки при клике */}
        {showClickEffect && (
          <div className="absolute inset-0 rounded-full bg-white opacity-40 animate-ping" />
        )}

        {/* Кнопка с гусем */}
        <button
          onClick={handleClick}
          className={`
            relative z-10 rounded-full border-2 border-white shadow-lg
            transition-all duration-150 ease-out
            hover:scale-105 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-blue-300
            bg-gradient-to-br ${currentStage.bgColors}
            ${isClicked ? 'animate-bounce' : ''}
            w-full h-full
            flex items-center justify-center
          `}
          style={{
            transform: isClicked
              ? 'scale(0.9) rotate(2deg)'
              : 'scale(1) rotate(0deg)',
            boxShadow: showClickEffect
              ? '0 0 20px rgba(255, 255, 255, 0.8)'
              : '0 4px 15px rgba(0, 0, 0, 0.3)',
          }}
        >
          <img
            src={currentStage.image}
            alt={`Goose Stage ${GOOSE_STAGES.indexOf(currentStage)}`}
            className={`
              max-w-full max-h-full object-contain
              transition-all duration-150 ease-out
              ${isClicked ? 'brightness-125 saturate-150' : 'brightness-100'}
              ${showClickEffect ? 'animate-pulse' : ''}
            `}
            style={{
              width: '80%',
              height: '80%',
              filter: showClickEffect
                ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
                : 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))',
            }}
            draggable={false}
          />
        </button>

        {/* Индикатор стадии */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <div className={`
            px-2 py-0.5 rounded-full text-xs font-bold text-white
            bg-gradient-to-r ${currentStage.bgColors}
            border border-white shadow-md
          `}>
          </div>
        </div>
      </div>
    </>
  );
};
