import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STALE_SYNCING_MS } from './kioskPolicy.ts';
import {
  applicantState,
  buildQueuedApplicant,
  normalizeApplicant,
} from './kioskModel.ts';

describe('kioskModel normalize', () => {
  it('builds one stable requestId per scheme op', () => {
    const row = buildQueuedApplicant({
      name: 'Step6 Tester',
      maskedId: 'XXXX-XXXX-1234',
      age: 28,
      income: 100000,
      schemeIds: ['scheme-a', 'scheme-b'],
    });
    assert.equal(row.operation, 'application_create');
    assert.equal(row.ops.length, 2);
    assert.equal(row.ops[0]?.state, 'QUEUED');
    assert.notEqual(row.ops[0]?.requestId, row.ops[1]?.requestId);
    assert.match(row.ops[0]?.requestId ?? '', /^req-/);
  });

  it('reclaims stale SYNCING to RETRY_REQUIRED without changing requestId', () => {
    const stale = new Date(Date.now() - STALE_SYNCING_MS - 5_000).toISOString();
    const requestId = 'req-stable-replay-1';
    const parsed = normalizeApplicant({
      id: 'vle-1',
      name: 'A',
      maskedId: 'XXXX-XXXX-9999',
      age: 30,
      income: 1,
      createdAt: stale,
      schemeIds: ['scheme-a'],
      ops: [
        {
          schemeId: 'scheme-a',
          requestId,
          state: 'SYNCING',
          retryCount: 1,
          lastError: null,
          nextRetryAt: null,
          syncedAt: null,
          updatedAt: stale,
          serverApplicationId: null,
        },
      ],
    });
    assert.ok(parsed);
    assert.equal(parsed?.ops[0]?.state, 'RETRY_REQUIRED');
    assert.equal(parsed?.ops[0]?.requestId, requestId);
    assert.equal(applicantState(parsed!), 'RETRY_REQUIRED');
  });

  it('skips malformed records and keeps valid ones parseable', () => {
    assert.equal(normalizeApplicant(null), null);
    assert.equal(normalizeApplicant({ name: 'no-id' }), null);
    const ok = normalizeApplicant({
      id: 'vle-ok',
      schemeIds: ['s1'],
      createdAt: new Date().toISOString(),
    });
    assert.ok(ok);
    assert.equal(ok?.ops[0]?.schemeId, 's1');
    assert.equal(ok?.ops[0]?.state, 'QUEUED');
  });
});
