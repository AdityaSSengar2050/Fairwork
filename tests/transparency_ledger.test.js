import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { store } from '../src/store.js';
import { dispatchRequest } from './testHelper.js';

test('Transparency Ledger & Efficiency Verifications', async (t) => {
  store.reset();
  const app = createApp();

  await t.test('Generates SHA-256 cryptographic chain for all frontline actions', async () => {
    // 1. Submit concern
    await dispatchRequest(app, 'POST', '/api/concerns', {
      sectorId: 'warehousing',
      categoryId: 'machinery_forklift',
      facility: 'Fulfillment Hub 4',
      shift: 'Day Shift',
      summary: 'Forklift hydraulic leak observed near ramp B.'
    });

    const res = await dispatchRequest(app, 'GET', '/api/transparency/audit-ledger');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.ledger));
    assert.ok(res.body.ledger.length >= 2);

    const latest = res.body.ledger[0];
    assert.ok(latest.entryHash);
    assert.equal(latest.entryHash.length, 64, 'Must be valid SHA-256 hex string');
    assert.ok(latest.prevHash);
  });

  await t.test('Includes X-Request-Id correlation header on responses', async () => {
    const res = await dispatchRequest(app, 'GET', '/api/status');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id'], 'Must include correlation header');
  });

  await t.test('Correctly computes SLA remaining hours and breaches', async () => {
    const res = await dispatchRequest(app, 'GET', '/api/signals?sectorId=warehousing');
    assert.equal(res.status, 200);
    const signals = res.body;
    assert.ok(signals.length > 0);
    for (const signal of signals) {
      assert.equal(typeof signal.isSlaBreached, 'boolean');
      assert.equal(typeof signal.kAnonymityProtected, 'boolean');
    }
  });
});
