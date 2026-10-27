import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { store } from '../src/store.js';
import { dispatchRequest } from './testHelper.js';

test('End-to-End Workflow: Worker Concern -> Aggregated Signal -> Action Assignment -> Loop Closure', async (t) => {
  store.reset();
  const app = createApp();

  await t.test('Step 1: Frontline worker submits a team concern', async () => {
    const concernPayload = {
      sectorId: 'warehousing',
      categoryId: 'heat_climate',
      facility: 'Distribution Center 9 (North Bay)',
      shift: 'Swing Shift (14:00 - 22:00)',
      urgency: 'critical',
      summary: 'Excessive heat index 102F in north picking bay. Water cooler broken and two pickers feeling dizzy.'
    };

    const res = await dispatchRequest(app, 'POST', '/api/concerns', concernPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.concern.id);
    assert.equal(res.body.concern.isDemo, false);
    assert.equal(res.body.concern.sectorId, 'warehousing');
    assert.ok(res.body.concern.nlpAnalysis);
    assert.ok(res.body.concern.nlpAnalysis.riskScore >= 70);
  });

  let createdSignalId;

  await t.test('Step 2: Manager sees the aggregated team signal with privacy clustering', async () => {
    const res = await dispatchRequest(app, 'GET', '/api/signals?sectorId=warehousing');
    assert.equal(res.status, 200);
    const signals = res.body;
    assert.ok(Array.isArray(signals));

    // Find the signal for Distribution Center 9
    const targetSignal = signals.find(s => s.facility === 'Distribution Center 9 (North Bay)');
    assert.ok(targetSignal, 'Aggregated signal must exist for the reported facility');
    assert.equal(targetSignal.status, 'open');
    assert.ok(targetSignal.riskScore >= 70);
    assert.equal(targetSignal.concernCount, 1);
    createdSignalId = targetSignal.id;
  });

  await t.test('Step 3: Manager assigns actionable follow-up to the signal', async () => {
    assert.ok(createdSignalId);

    const followUpPayload = {
      assignedTo: 'Carlos Gutierrez (Facility Safety Manager)',
      targetDate: '2026-10-30',
      actionPlan: 'Deploy 3 portable swamp coolers immediately and order replacement commercial ice machine.',
      preventiveMeasure: 'Mandate 15-minute shaded rest breaks every 2 hours when temperature exceeds 90F.'
    };

    const res = await dispatchRequest(app, 'POST', `/api/signals/${createdSignalId}/follow-up`, followUpPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.signal.status, 'action_assigned');
    assert.equal(res.body.signal.followUp.assignedTo, 'Carlos Gutierrez (Facility Safety Manager)');
    assert.equal(res.body.signal.followUp.actionPlan, followUpPayload.actionPlan);
  });

  await t.test('Step 4: Manager closes the loop and publishes proof of resolution', async () => {
    const closeLoopPayload = {
      resolvedBy: 'Carlos Gutierrez',
      summary: 'Industrial spot coolers installed and operational. Daily hydration supplies restocked.',
      transparencyNotice: 'Dock temperature monitored below 78F. Inspected and approved by shift steward.'
    };

    const res = await dispatchRequest(app, 'POST', `/api/signals/${createdSignalId}/close-loop`, closeLoopPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.signal.status, 'resolved');
    assert.ok(res.body.signal.resolution);
    assert.equal(res.body.signal.resolution.summary, closeLoopPayload.summary);
  });

  await t.test('Step 5: Frontline workers verify the closed loop fix', async () => {
    const res = await dispatchRequest(app, 'POST', `/api/signals/${createdSignalId}/verify`, { confirmed: true });

    assert.equal(res.status, 200);
    assert.equal(res.body.signal.workerVerifications.confirmedCount, 1);
  });
});
