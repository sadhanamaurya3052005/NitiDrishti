import type { ToolId } from '@/lib/i18n/app';

/** Smart-tool routes for the application shell. */
export const TOOL_ROUTES: Record<ToolId, string> = {
  explore: '/schemes',
  eligibility: '/eligibility',
  whatif: '/what-if',
  compare: '/compare',
  alerts: '/alerts',
  assistant: '/assistant',
};

export const TOOL_ORDER: readonly ToolId[] = [
  'explore',
  'eligibility',
  'whatif',
  'compare',
  'alerts',
  'assistant',
];

export const OPEN_ASSISTANT_EVENT = 'nd:open-assistant';
export const WALKTHROUGH_EVENT = 'nd:walkthrough';

export function openAssistantDock(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
}

export function setWalkthroughOpen(open: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WALKTHROUGH_EVENT, { detail: { open } }));
}
