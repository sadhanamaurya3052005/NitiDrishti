'use client';

import { cn } from '@/lib/cn';

/** Robot mark for the Mitra chatbot dock. */
export function MitraMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full', className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mitra-robot.png"
        alt="NitiDrishti Mitra"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default MitraMark;
