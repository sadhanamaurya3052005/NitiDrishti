'use client';

/**
 * Lion Capital of Ashoka with सत्यमेव जयते — civic navbar mark.
 * Illustration for the product navbar; not a licensed government seal file.
 */
export function AshokaMark({ size = 52 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-line" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/satyamev-jayate.png"
        alt="Satyamev Jayate — Lion Capital of Ashoka"
        width={size}
        height={size}
        className="h-[138%] w-[138%] max-w-none object-cover object-[center_12%]"
      />
    </span>
  );
}

export default AshokaMark;
