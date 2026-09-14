'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Captions, Pause, Play, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useLocale } from '@/components/providers/LocaleProvider';

const FRAMES = [
  '/heroes/eligibility-cockpit.png',
  '/heroes/csc-kiosk.png',
  '/heroes/nyay-mitra.png',
  '/heroes/analytics-map.png',
] as const;

const FILM_MS = 90_000;

export function WalkthroughFilm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { home } = useLocale();
  const chapters = home.walkthrough.steps;
  const chapterMs = FILM_MS / Math.max(1, chapters.length);
  const [captions, setCaptions] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [seek, setSeek] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      setPlaying(true);
      setSeek(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !playing) return;
    const origin = performance.now() - elapsed;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(FILM_MS, now - origin);
      setElapsed(next);
      if (next < FILM_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playing, seek]);

  const step = Math.min(chapters.length - 1, Math.floor(elapsed / chapterMs));
  const chapter = chapters[step];
  const progress = elapsed / FILM_MS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-navy-deep/85 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative w-full max-w-5xl overflow-hidden rounded-card border border-white/15 bg-navy-deep shadow-lift">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <p className="text-sm font-semibold">{home.walkthrough.title}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  className="inline-flex items-center gap-1 rounded-pill border border-white/20 px-3 py-1 text-xs"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={() => setCaptions((value) => !value)}
                  className="inline-flex items-center gap-1 rounded-pill border border-white/20 px-3 py-1 text-xs"
                >
                  <Captions className="h-3.5 w-3.5" />
                  {home.walkthrough.captions}
                </button>
                <button type="button" onClick={onClose} className="rounded-full p-1" aria-label={home.walkthrough.close}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FRAMES[step % FRAMES.length]} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
              <p className="absolute left-6 top-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron">
                {home.walkthrough.eyebrow} · {Math.ceil((FILM_MS - elapsed) / 1000)}s
              </p>
              {captions && chapter && (
                <div className="absolute inset-x-6 bottom-8 max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-saffron">
                    {String(step + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{chapter.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">{chapter.body}</p>
                </div>
              )}
            </div>

            <div className="px-3 pb-3 pt-2">
              <div className="h-1 overflow-hidden rounded-pill bg-white/15">
                <div className="h-full bg-saffron" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="mt-2 flex gap-1.5">
                {chapters.map((item, itemIndex) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      setElapsed(itemIndex * chapterMs);
                      setSeek((value) => value + 1);
                    }}
                    className={`h-1.5 flex-1 rounded-pill ${itemIndex === step ? 'bg-saffron' : 'bg-white/20'}`}
                    aria-label={item.title}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
