/**
 * Robot Player Badge Component
 * Displays information about robot players
 */

'use client';

interface RobotBadgeProps {
  difficulty: 'easy' | 'medium' | 'hard';
  size?: 'sm' | 'md';
}

const difficultyColors = {
  easy: 'bg-green-700 text-green-100',
  medium: 'bg-yellow-700 text-yellow-100',
  hard: 'bg-red-700 text-red-100',
};

const difficultyLabels = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function RobotBadge({ difficulty, size = 'sm' }: RobotBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full font-semibold ${difficultyColors[difficulty]}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-75" />
      🤖 {difficultyLabels[difficulty]}
    </span>
  );
}
