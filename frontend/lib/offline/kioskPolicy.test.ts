import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  backoffMs,
  classifySyncFailure,
  isDue,
  isStaleSyncing,
  MAX_AUTO_RETRIES,
  rowState,
  STALE_SYNCING_MS,
} from './kioskPolicy.ts';

describe('kioskPolicy', () => {
  it('classifies network and 5xx as retryable', () => {
    assert.equal(classifySyncFailure(null, true), 'RETRYABLE');
    assert.equal(classifySyncFailure(408, false), 'RETRYABLE');
    assert.equal(classifySyncFailure(503, false), 'RETRYABLE');
    assert.equal(classifySyncFailure(500, false), 'RETRYABLE');
  });

  it('classifies auth and permanent failures', () => {
    assert.equal(classifySyncFailure(401, false), 'AUTH');
    assert.equal(classifySyncFailure(403, false), 'AUTH');
    assert.equal(classifySyncFailure(422, false), 'PERMANENT');
    assert.equal(classifySyncFailure(404, false), 'PERMANENT');
    assert.equal(classifySyncFailure(409, false), 'CONFLICT');
  });

  it('bounds backoff and due-time', () => {
    assert.equal(backoffMs(0), 1000);
    assert.ok(backoffMs(9) <= 120_000);
    assert.equal(isDue(null), true);
    assert.equal(isDue(new Date(Date.now() + 60_000).toISOString()), false);
    assert.equal(isDue(new Date(Date.now() - 1000).toISOString()), true);
  });

  it('reclaims stale SYNCING and ranks row state', () => {
    assert.equal(isStaleSyncing(new Date(Date.now() - STALE_SYNCING_MS - 1).toISOString()), true);
    assert.equal(isStaleSyncing(new Date().toISOString()), false);
    assert.equal(rowState(['SYNCED', 'QUEUED']), 'QUEUED');
    assert.equal(rowState(['SYNCED', 'FAILED']), 'FAILED');
    assert.equal(rowState(['SYNCED', 'CONFLICT']), 'CONFLICT');
    assert.equal(rowState(['SYNCED', 'SYNCED']), 'SYNCED');
    assert.ok(MAX_AUTO_RETRIES >= 1);
  });
});
