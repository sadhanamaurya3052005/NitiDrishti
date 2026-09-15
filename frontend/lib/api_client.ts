/**
 * Docs3 name: lib/api_client.ts
 * The frontend talks only to our FastAPI backend (PROJECT_RULES Rule 6).
 */
export { apiFetch, ApiError, getHealth, getSchemes, evaluateEligibility, compareSchemes, createDossier, listDossiers, getSchemeDocuments } from '@/lib/api';
export {
  getOpportunities,
  getPolicies,
  getAlerts,
  getAnalyticsSummary,
  getCscSummary,
  getWelfareSummary,
  askAssistant,
} from '@/lib/blockE';
