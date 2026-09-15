import type { CitizenProfile } from '@/components/providers/ExperienceProvider';
import { evaluateScheme } from '@/lib/schemes/evaluate';
import type { SchemeRecord } from '@/types';

export interface UnlockHint {
  field: 'income' | 'age' | 'land' | 'document' | 'other';
  message: string;
}

/** Counterfactual shortest change for a failed AST rule (What-If desk). */
export function unlockHints(scheme: SchemeRecord, profile: CitizenProfile): UnlockHint[] {
  const evaluation = evaluateScheme(scheme, profile);
  const hints: UnlockHint[] = [];

  for (const rule of scheme.rules) {
    const result = evaluation.rules.find((item) => item.id === rule.id);
    if (result?.verdict !== 'fail') continue;

    if (rule.kind === 'income' && rule.max !== undefined) {
      const delta = profile.income - rule.max;
      hints.push({
        field: 'income',
        message: `If annual income ≤ ₹${rule.max.toLocaleString('en-IN')} (now ₹${profile.income.toLocaleString('en-IN')}, Δ ₹${delta.toLocaleString('en-IN')}), this inequality passes.`,
      });
      continue;
    }

    if (rule.kind === 'age') {
      const min = rule.min ?? 0;
      const max = rule.max ?? 120;
      if (profile.age < min) {
        hints.push({
          field: 'age',
          message: `Age ${profile.age} is below ${min}. This rule passes in ${min - profile.age} year(s), or not at all if the gazette uses a cutoff date.`,
        });
      } else if (profile.age > max) {
        hints.push({
          field: 'age',
          message: `Age ${profile.age} exceeds ${max}. No counterfactual unlock exists for this cap.`,
        });
      }
      continue;
    }

    if (rule.kind === 'land' && rule.min !== undefined) {
      hints.push({
        field: 'land',
        message: `Recorded land must be ≥ ${rule.min} ha (now ${profile.landHectares} ha).`,
      });
      continue;
    }

    hints.push({
      field: 'other',
      message: result.explanation,
    });
  }

  return hints;
}
