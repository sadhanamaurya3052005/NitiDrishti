'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useLocale } from '@/components/providers/LocaleProvider';
import { openAssistantDock } from '@/lib/tools';

export default function AssistantPage() {
  const { desk } = useLocale();

  useEffect(() => {
    openAssistantDock();
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.assistantPage.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.assistantPage.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{desk.assistantPage.lede}</p>
        </div>
        <MetricBadge label="Assistant" />
      </header>
      <Button variant="saffron" className="mt-8" onClick={() => openAssistantDock()}>
        {desk.assistantPage.open}
      </Button>
    </div>
  );
}
