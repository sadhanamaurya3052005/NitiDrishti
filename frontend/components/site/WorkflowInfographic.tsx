'use client';

import { ArrowDown, ArrowRight, Landmark, Printer, Scale, Shield, UserRound } from 'lucide-react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const FLOW_EN = {
  heading: 'How it works',
  lede: 'Official rule in. Clear yes or no out.',
  steps: [
    { n: '1', title: 'Scheme is notified', body: 'gov.in page, gazette or PDF' },
    { n: '2', title: 'We store the rule', body: 'Kept as a version — never overwritten' },
    { n: '3', title: 'You answer 3 things', body: 'Age, income, land — as asked' },
    { n: '4', title: 'Maths checks it', body: 'AST engine. Not a guess. Not an LLM' },
    { n: '5', title: 'You get a print', body: 'Pass / fail + the official source' },
  ],
  desks: 'Same answer on every desk',
  deskLabels: ['Citizen', 'CSC', 'Officer'],
  privacy: 'Guest mode saves 0 rows on the server',
} as const;

const FLOW_HI = {
  heading: 'यह कैसे चलता है',
  lede: 'आधिकारिक नियम अंदर। साफ़ हाँ या ना बाहर।',
  steps: [
    { n: '1', title: 'योजना अधिसूचित होती है', body: 'gov.in पन्ना, राजपत्र या PDF' },
    { n: '2', title: 'नियम यहाँ सुरक्षित', body: 'संस्करण रहता है — मिटता नहीं' },
    { n: '3', title: 'आप तीन बातें बताते हैं', body: 'आयु, आय, भूमि — जैसा पूछा जाए' },
    { n: '4', title: 'गणित जाँच करता है', body: 'AST इंजन. अंदाज़ा नहीं. LLM नहीं' },
    { n: '5', title: 'छापने योग्य उत्तर', body: 'पास / फ़ेल + आधिकारिक स्रोत' },
  ],
  desks: 'हर डेस्क पर वही उत्तर',
  deskLabels: ['नागरिक', 'CSC', 'अधिकारी'],
  privacy: 'अतिथि मोड सर्वर पर 0 पंक्ति लिखता है',
} as const;

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 shadow-soft">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saffron text-[11px] font-bold text-white">
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{body}</span>
      </span>
    </div>
  );
}

function HArrow() {
  return <ArrowRight className="hidden h-4 w-4 shrink-0 text-saffron sm:block" aria-hidden />;
}

function VArrow() {
  return <ArrowDown className="mx-auto h-4 w-4 text-saffron" aria-hidden />;
}

export function WorkflowInfographic({ className }: { className?: string }) {
  const { locale } = useLocale();
  const copy = locale === 'hi' ? FLOW_HI : FLOW_EN;
  const [a, b, c, d, e] = copy.steps;

  return (
    <div
      className={cn(
        'rounded-[1.35rem] border border-line bg-gradient-to-br from-saffron-soft via-surface to-sky-soft p-3.5 shadow-lift dark:from-canvas-deep dark:via-surface dark:to-canvas-tint sm:p-4',
        className,
      )}
    >
      <div className="mb-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron">{copy.heading}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{copy.lede}</p>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <StepCard {...a} />
        <HArrow />
        <StepCard {...b} />
        <HArrow />
        <StepCard {...c} />
      </div>

      <VArrow />

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-[8%]">
        <StepCard {...d} />
        <HArrow />
        <StepCard {...e} />
      </div>

      <VArrow />

      <div className="rounded-xl border border-dashed border-saffron/40 bg-surface/80 px-3 py-2.5">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-saffron">{copy.desks}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {[UserRound, Landmark, Shield].map((Icon, index) => (
            <span
              key={copy.deskLabels[index]}
              className="inline-flex items-center gap-1 rounded-pill border border-line bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink"
            >
              <Icon className="h-3.5 w-3.5 text-saffron" />
              {copy.deskLabels[index]}
            </span>
          ))}
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-muted">
          <Printer className="h-3.5 w-3.5 text-mint" />
          <Scale className="h-3.5 w-3.5 text-sky" />
          {copy.privacy}
        </p>
      </div>
    </div>
  );
}

export default WorkflowInfographic;
