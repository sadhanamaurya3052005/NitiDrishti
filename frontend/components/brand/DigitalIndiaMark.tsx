'use client';

/**
 * Digital India programme mark for the public navbar.
 * Student-project illustration — not a licensed government asset file.
 * Light theme: dark ink. Dark theme: light ink.
 */
export function DigitalIndiaMark({ size = 36 }: { size?: number }) {
  const width = Math.round(size * 2.55);
  return (
    <span className="inline-flex items-center" style={{ height: size, width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/digital-india.png"
        alt="Digital India"
        width={width}
        height={size}
        className="h-full w-full object-contain object-left brightness-0 dark:brightness-0 dark:invert"
      />
    </span>
  );
}

export default DigitalIndiaMark;
