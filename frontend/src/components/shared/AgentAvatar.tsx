import type { Agent } from '../../types';

interface AgentAvatarProps {
  name: string;
  role: Agent['role'];
  status: Agent['status'];
  size?: 'sm' | 'md';
}

const ROLE_COLORS: Record<string, string> = {
  builder: 'bg-accent-sky',
  tester: 'bg-accent-mint',
  reviewer: 'bg-accent-lavender',
  custom: 'bg-accent-coral',
};

const ROLE_GLOWS: Record<string, string> = {
  builder: 'glow-sky',
  tester: 'glow-mint',
  reviewer: 'glow-lavender',
  custom: 'glow-coral',
};

const STATUS_CLASSES: Record<string, string> = {
  idle: 'opacity-50',
  working: 'animate-bounce',
  done: 'ring-2 ring-accent-mint/50',
  error: 'bg-accent-coral animate-pulse',
};

export default function AgentAvatar({ name, role, status, size = 'md' }: AgentAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const baseColor = status === 'error' ? 'bg-accent-coral' : (ROLE_COLORS[role] || ROLE_COLORS.custom);
  const glowClass = status === 'working' ? (ROLE_GLOWS[role] || ROLE_GLOWS.custom) : '';
  const statusClass = STATUS_CLASSES[status] || '';
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full text-white font-display font-bold ${baseColor} ${statusClass} ${glowClass} ${sizeClass}`}>
      {initial}
      {status === 'done' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-mint rounded-full border-2 border-atelier-surface flex items-center justify-center text-[8px]">
          &#10003;
        </span>
      )}
    </div>
  );
}
