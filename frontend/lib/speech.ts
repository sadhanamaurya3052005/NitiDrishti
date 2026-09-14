import type { Locale } from '@/lib/config';

/**
 * Read-aloud support built on the browser's own speech engine, so the
 * accessibility feature costs nothing and sends no text to a server.
 */

const VOICE_LANG: Record<Locale, string> = { en: 'en-IN', hi: 'hi-IN' };

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Pick the closest installed voice for the locale, falling back to the default. */
function pickVoice(locale: Locale): SpeechSynthesisVoice | null {
  const wanted = VOICE_LANG[locale];
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === wanted) ??
    voices.find((voice) => voice.lang.startsWith(wanted.split('-')[0] ?? 'en')) ??
    null
  );
}

export function speak(text: string, locale: Locale, onEnd?: () => void, rate = 1): void {
  if (!speechSupported() || !text.trim()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = VOICE_LANG[locale];
  utterance.rate = (locale === 'hi' ? 0.92 : 1) * rate;
  utterance.pitch = 1;

  const voice = pickVoice(locale);
  if (voice) utterance.voice = voice;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Collect what a listener actually needs from the current screen: the heading,
 * the summary line, and the section labels — not every word on the page.
 */
export function readableTextFromMain(): string {
  const main = document.querySelector('main');
  if (!main) return '';

  const parts: string[] = [];
  main.querySelectorAll('h1, [data-speech="summary"], h2, h3').forEach((node) => {
    const text = node.textContent?.trim();
    if (text) parts.push(text);
  });

  return parts.slice(0, 14).join('. ');
}
