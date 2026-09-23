import type { CitizenProfile } from '@/components/providers/ExperienceProvider';
import type { DeclaredEligibilityProfile } from '@/lib/api';

export function declaredFromProfile(profile: CitizenProfile): DeclaredEligibilityProfile {
  return {
    age: profile.age,
    income: profile.income,
    land_hectares: profile.landHectares,
    gender: profile.gender,
    category: profile.category,
    occupation: profile.occupation,
  };
}

export function profileKey(profile: CitizenProfile): string {
  return [
    profile.age,
    profile.income,
    profile.landHectares,
    profile.gender,
    profile.category,
    profile.occupation,
  ].join('|');
}
