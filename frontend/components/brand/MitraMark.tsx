'use client';

import { cn } from '@/lib/cn';

/** Theme-aware AI chatbot mark — chat bubble + sparkle, not a mascot. */
export function MitraMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="AI chatbot"
    >
      <circle cx="32" cy="32" r="31" className="fill-ink" />
      <circle cx="32" cy="32" r="31" fill="none" stroke="#C9A227" strokeWidth="1.6" />

      <path
        d="M16 20.5c0-3.3 2.7-6 6-6h20c3.3 0 6 2.7 6 6v16c0 3.3-2.7 6-6 6H28.2L18 50.5V42.5c-1.3-1.2-2-2.9-2-4.8v-17.2Z"
        className="fill-canvas"
      />

      <path
        d="M42.5 19.5 44 24.2l4.7 1.5-4.7 1.5-1.5 4.7-1.5-4.7-4.7-1.5 4.7-1.5 1.5-4.7Z"
        fill="#E07012"
      />
      <path
        d="M49.2 28.2 50 30.6l2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4Z"
        fill="#E07012"
      />

      <circle cx="26" cy="31.5" r="2.15" className="fill-ink" />
      <circle cx="33.5" cy="31.5" r="2.15" className="fill-ink" />
      <circle cx="41" cy="31.5" r="2.15" className="fill-ink" />
    </svg>
  );
}

export default MitraMark;
