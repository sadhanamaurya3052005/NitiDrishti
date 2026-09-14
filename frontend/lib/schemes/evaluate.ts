import type { CitizenProfile } from '@/components/providers/ExperienceProvider';
import type { SchemeRecord, SchemeRule } from '@/types';

export type RuleVerdict = 'pass' | 'fail' | 'unknown';

export interface EvaluatedRule {
  id: string;
  label: string;
  detail: string;
  verdict: RuleVerdict;
  explanation: string;
}

export interface SchemeEvaluation {
  schemeId: string;
  status: 'ELIGIBLE' | 'PARTIAL_INFO' | 'INELIGIBLE';
  score: number;
  rules: EvaluatedRule[];
}

function checkRule(rule: SchemeRule, profile: CitizenProfile): EvaluatedRule {
  const base = { id: rule.id, label: rule.label, detail: rule.detail };

  if (rule.kind === 'always') {
    return { ...base, verdict: 'unknown', explanation: 'Verified against the official exclusion list at application time.' };
  }

  if (rule.kind === 'age') {
    const min = rule.min ?? 0;
    const max = rule.max ?? 120;
    const pass = profile.age >= min && profile.age <= max;
    return {
      ...base,
      verdict: pass ? 'pass' : 'fail',
      explanation: pass
        ? `Age ${profile.age} is within ${min}–${max}.`
        : `Age ${profile.age} is outside ${min}–${max}.`,
    };
  }

  if (rule.kind === 'income') {
    const max = rule.max ?? Number.POSITIVE_INFINITY;
    const pass = profile.income <= max;
    return {
      ...base,
      verdict: pass ? 'pass' : 'fail',
      explanation: pass
        ? `Income ₹${profile.income.toLocaleString('en-IN')} ≤ ₹${max.toLocaleString('en-IN')}.`
        : `Income ₹${profile.income.toLocaleString('en-IN')} exceeds ₹${max.toLocaleString('en-IN')}.`,
    };
  }

  if (rule.kind === 'land') {
    const min = rule.min ?? 0;
    const pass = profile.landHectares >= min;
    return {
      ...base,
      verdict: pass ? 'pass' : 'fail',
      explanation: pass
        ? `Landholding ${profile.landHectares} ha meets the cultivator test.`
        : `Landholding ${profile.landHectares} ha is below the recorded-land threshold.`,
    };
  }

  if (rule.kind === 'gender') {
    if (profile.gender === 'any') {
      return { ...base, verdict: 'unknown', explanation: 'Gender not declared — mark female on the profile to complete this test.' };
    }
    const pass = profile.gender === rule.equals;
    return {
      ...base,
      verdict: pass ? 'pass' : 'fail',
      explanation: pass ? 'Gender criterion matches.' : 'Gender criterion does not match this scheme.',
    };
  }

  if (rule.kind === 'category' && rule.includes) {
    const pass = rule.includes.includes(profile.category);
    return {
      ...base,
      verdict: pass ? 'pass' : 'fail',
      explanation: pass
        ? `Category ${profile.category} is listed.`
        : `Category ${profile.category} is not in ${rule.includes.join(', ')}.`,
    };
  }

  if (rule.kind === 'occupation' && rule.includes) {
    const pass = rule.includes.includes(profile.occupation);
    return {
      ...base,
      verdict: pass ? 'pass' : 'fail',
      explanation: pass
        ? `Occupation ${profile.occupation} is in the notified set.`
        : `Occupation ${profile.occupation} is outside ${rule.includes.join(', ')}.`,
    };
  }

  return { ...base, verdict: 'unknown', explanation: 'Needs an official document check.' };
}

export function evaluateScheme(scheme: SchemeRecord, profile: CitizenProfile): SchemeEvaluation {
  const rules = scheme.rules.map((rule) => checkRule(rule, profile));
  const fails = rules.filter((rule) => rule.verdict === 'fail').length;
  const unknowns = rules.filter((rule) => rule.verdict === 'unknown').length;
  const passes = rules.filter((rule) => rule.verdict === 'pass').length;
  const score = Math.round((passes / Math.max(1, rules.length)) * 100);

  let status: SchemeEvaluation['status'] = 'ELIGIBLE';
  if (fails > 0) status = 'INELIGIBLE';
  else if (unknowns > 0) status = 'PARTIAL_INFO';

  return { schemeId: scheme.id, status, score, rules };
}
