'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Mic, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { MitraMark } from '@/components/brand/MitraMark';
import { useLocale } from '@/components/providers/LocaleProvider';
import { answerAssistant } from '@/lib/assistant/engine';
import { askAssistant } from '@/lib/blockE';
import { cn } from '@/lib/cn';
import { OPEN_ASSISTANT_EVENT, WALKTHROUGH_EVENT } from '@/lib/tools';
import { speak, speechSupported, stopSpeaking } from '@/lib/speech';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations: string[];
}

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn('w-[3px] rounded-full bg-white', active ? 'animate-eq-bar' : 'h-1.5 opacity-70')}
          style={{ animationDelay: `${bar * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export function AssistantDock() {
  const { locale, toggleLocale, showcase } = useLocale();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [shot, setShot] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    const openDock = () => setOpen(true);
    const onWalkthrough = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setHidden(Boolean(detail?.open));
      if (detail?.open) setOpen(false);
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, openDock);
    window.addEventListener(WALKTHROUGH_EVENT, onWalkthrough);
    return () => {
      window.removeEventListener(OPEN_ASSISTANT_EVENT, openDock);
      window.removeEventListener(WALKTHROUGH_EVENT, onWalkthrough);
    };
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  const pushReply = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const user: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      citations: [],
    };
    setMessages((current) => [...current, user]);
    setInput('');
    void (async () => {
      let text: string;
      let citations: string[];
      try {
        const remote = await askAssistant(trimmed);
        text = remote.text;
        citations = remote.citations.map((item) => item.source_url);
      } catch {
        const reply = answerAssistant(trimmed, locale);
        text = reply.text;
        citations = reply.citations;
      }
      const bot: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text,
        citations,
      };
      setMessages((current) => [...current, bot]);
      if (voiceOut) speak(text, locale);
    })();
  };

  const startVoice = () => {
    const SpeechCtor =
      typeof window !== 'undefined'
        ? ((window as Window & {
            SpeechRecognition?: new () => SpeechRec;
            webkitSpeechRecognition?: new () => SpeechRec;
          }).SpeechRecognition ??
          (window as Window & { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition)
        : undefined;

    if (!SpeechCtor) {
      setListening(true);
      window.setTimeout(() => {
        const sample = locale === 'hi' ? 'पीएम किसान की पात्रता क्या है' : 'What is PM-Kisan eligibility';
        setListening(false);
        pushReply(sample);
      }, 900);
      return;
    }

    const rec = new SpeechCtor();
    rec.lang = locale === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const text = event.results[event.results.length - 1]?.[0]?.transcript ?? '';
      if (text) pushReply(text);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const heading = locale === 'hi' ? 'नीति दृष्टि सहायक' : 'NitiDrishti Assistant';
  const subtitle =
    locale === 'hi'
      ? 'आधिकारिक संग्रहित पाठ खोजता है। पात्रता तय नहीं करता।'
      : 'Searches official ingested text. Does not decide eligibility.';
  const prompts =
    locale === 'hi'
      ? ['पीएम किसान', 'पात्रता कैसे तय होती है?', 'आधार सुरक्षित है?']
      : ['PM-Kisan', 'How is eligibility decided?', 'Is Aadhaar stored?'];

  return (
    <div className="nd-no-print pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {hidden ? null : (
        <>
          <AnimatePresence>
            {open && (
              <motion.section
                initial={{ opacity: 0, y: 22, scale: 0.94, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 16, scale: 0.96, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex h-[min(74dvh,560px)] w-[min(calc(100vw-2rem),400px)] flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface/95 shadow-lift backdrop-blur-xl"
                aria-label={`${heading}. ${subtitle}`}
              >
                <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0b1f3a] via-[#163a6b] to-[#c45c12] px-3 py-3 text-white dark:from-[#07111c] dark:via-[#1b3a63] dark:to-[#e07a14]">
                  <span className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="relative flex h-11 w-11 items-center justify-center">
                        <span className="absolute inset-0 animate-pulse-ring rounded-full border border-white/40" />
                        <MitraMark size={40} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">{heading}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/80">{subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={toggleLocale}
                        className="rounded-pill border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold"
                      >
                        {locale === 'en' ? 'हिन्दी' : 'EN'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceOut((value) => {
                            if (value) stopSpeaking();
                            return !value;
                          });
                        }}
                        className="rounded-full p-1.5 hover:bg-white/10"
                        aria-label={voiceOut ? 'Mute' : 'Speak replies'}
                      >
                        {voiceOut ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {listening ? (
                    <div className="relative mt-3 flex items-center justify-between rounded-2xl bg-black/25 px-3 py-2">
                      <p className="text-[11px] font-medium text-white/90">
                        {locale === 'hi' ? 'सुन रहा हूँ… बोलिए' : 'Listening… speak now'}
                      </p>
                      <Equalizer active />
                    </div>
                  ) : null}
                </header>

                <div ref={scroller} className="flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-saffron-soft/40 to-transparent px-3 py-3 dark:from-saffron-soft/20">
                  {messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line bg-surface/80 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <Sparkles className="h-3.5 w-3.5 text-saffron" />
                        {locale === 'hi' ? 'शुरू करने के लिए पूछें' : 'Try a grounded question'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {prompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => pushReply(prompt)}
                            className="rounded-pill border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-saffron/50 hover:text-saffron-deep"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-soft',
                        message.role === 'user'
                          ? 'ml-auto rounded-br-md bg-gradient-to-br from-saffron to-[#c45c12] text-white'
                          : 'rounded-bl-md border border-line bg-surface text-ink',
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {message.citations.length > 0 && (
                        <p className="mt-1 truncate text-[10px] opacity-70">{message.citations.join(' · ')}</p>
                      )}
                    </motion.div>
                  ))}
                </div>

                <form
                  className="flex items-center gap-1.5 border-t border-line bg-surface p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    pushReply(input);
                  }}
                >
                  <button
                    type="button"
                    onClick={startVoice}
                    className={cn(
                      'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
                      listening ? 'bg-rose text-white shadow-[0_0_0_6px_rgb(210_42_76_/_0.18)]' : 'border border-line text-ink hover:border-saffron/40',
                    )}
                    aria-label={locale === 'hi' ? 'बोलें' : 'Voice'}
                  >
                    {listening && <span className="absolute inset-0 animate-pulse-ring rounded-full border border-rose" />}
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:border-sky/50"
                    aria-label={showcase.copilot.camera}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={camRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (shot) URL.revokeObjectURL(shot);
                      setShot(URL.createObjectURL(file));
                      pushReply(showcase.copilot.cameraNote);
                    }}
                  />
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={locale === 'hi' ? 'योजना या नियम पूछें…' : 'Ask a scheme or a rule…'}
                    className="h-11 flex-1 rounded-pill border border-line bg-canvas px-3 text-sm text-ink outline-none ring-saffron/40 focus:ring-2"
                  />
                  <button
                    type="submit"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-[#c45c12] text-white shadow-glow"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                {shot ? (
                  <div className="relative mx-2 mb-2 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot} alt="" className="max-h-28 w-full object-cover" />
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded bg-black/80 py-1 text-center text-[10px] text-white">
                      [Identity Redacted]
                    </div>
                  </div>
                ) : null}
                {speechSupported() ? null : (
                  <p className="px-3 pb-2 text-[10px] text-ink-muted">Voice needs a browser speech engine.</p>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="pointer-events-auto group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-saffron via-[#e07a14] to-[#163a6b] text-white shadow-glow"
            aria-expanded={open}
            aria-label={heading}
          >
            <span className="absolute inset-[-6px] animate-orbit rounded-full border border-dashed border-saffron/50" />
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-saffron" />
            {open ? <X className="relative h-6 w-6" /> : listening ? <Equalizer active /> : <MitraMark size={40} />}
          </button>
        </>
      )}
    </div>
  );
}

export default AssistantDock;
