'use client';

import Image from 'next/image';

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  className = '',
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <div 
        className={`relative rounded-full overflow-hidden shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  const initials = getInitials(name);
  const colorClass = COLORS[getColorIndex(name)];

  return (
    <div 
      className={`relative rounded-full flex items-center justify-center shrink-0 text-white font-medium ${colorClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials}
    </div>
  );
}
