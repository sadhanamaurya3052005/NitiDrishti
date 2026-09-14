'use client';

import {
  Activity,
  AlertOctagon,
  Baby,
  Bike,
  Briefcase,
  Cpu,
  Droplets,
  GraduationCap,
  Hammer,
  HeartHandshake,
  Home,
  Landmark,
  MapPin,
  Scale,
  Tractor,
  Trophy,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { CIVIC_SECTORS } from '@/lib/civic/sectors';
import { cn } from '@/lib/cn';

const ICONS: Record<(typeof CIVIC_SECTORS)[number]['icon'], LucideIcon> = {
  Tractor,
  HeartHandshake,
  GraduationCap,
  Briefcase,
  Baby,
  Wrench,
  Landmark,
  Activity,
  Home,
  Trophy,
  Cpu,
  Truck,
  MapPin,
  Droplets,
  Scale,
  Hammer,
  AlertOctagon,
  Bike,
};

export function CivicMarquee() {
  const { locale, showcase } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const [active, setActive] = useState<string | null>(null);
  const loop = [...CIVIC_SECTORS, ...CIVIC_SECTORS, ...CIVIC_SECTORS];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let frame = 0;
    const speed = 0.85;

    const tick = () => {
      if (!pausedRef.current) {
        const half = el.scrollWidth / 3;
        offsetRef.current -= speed;
        if (half > 0 && -offsetRef.current >= half) {
          offsetRef.current += half;
        }
        el.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const showName = (key: string) => {
    pausedRef.current = true;
    setActive(key);
  };

  const hideName = () => {
    pausedRef.current = false;
    setActive(null);
  };

  return (
    <section id="sectors" className="relative py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-saffron/40 to-transparent" />
      <div className="nd-section mb-7 text-center">
        <h2 className="font-deva text-display font-semibold tracking-tight text-ink">{showcase.marquee.title}</h2>
      </div>
      <div className="relative overflow-hidden py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-canvas to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-canvas to-transparent sm:w-20" />
        <div ref={trackRef} data-motion="keep" className="flex w-max items-start gap-3 px-3 sm:gap-5 will-change-transform">
          {loop.map((sector, index) => {
            const Icon = ICONS[sector.icon];
            const name = locale === 'hi' ? sector.nameHi : sector.nameEn;
            const key = `${sector.id}-${index}`;
            const open = active === key;
            return (
              <button
                key={key}
                type="button"
                onMouseEnter={() => showName(key)}
                onMouseLeave={hideName}
                onFocus={() => showName(key)}
                onBlur={hideName}
                onClick={() => {
                  if (open) hideName();
                  else showName(key);
                }}
                className="relative flex w-[5.6rem] shrink-0 flex-col items-center sm:w-[6.2rem]"
                aria-label={name}
              >
                <span
                  className={cn(
                    'flex h-[3.7rem] w-[3.7rem] items-center justify-center rounded-full text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] ring-4 ring-white/80 transition duration-200 dark:ring-white/10 sm:h-[4.1rem] sm:w-[4.1rem]',
                    open && 'scale-110 ring-saffron/50',
                  )}
                  style={{ backgroundColor: sector.color }}
                >
                  <Icon className="h-7 w-7 stroke-[1.75] sm:h-8 sm:w-8" />
                </span>
                <span className="mt-1.5 line-clamp-2 min-h-[2.2rem] w-full text-center text-[10px] font-semibold leading-tight text-ink sm:text-[11px]">
                  {name}
                </span>
                {open ? (
                  <span className="absolute -top-1 left-1/2 z-20 w-max max-w-[10rem] -translate-x-1/2 -translate-y-full rounded-pill bg-[#0b1f3a] px-2.5 py-1 text-center text-[11px] font-semibold text-white shadow-lift dark:bg-canvas-tint dark:text-ink">
                    {name}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CivicMarquee;
