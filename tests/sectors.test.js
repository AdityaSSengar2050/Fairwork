import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { store } from '../src/store.js';
import { dispatchRequest } from './testHelper.js';

test('Multi-Sector Support: Warehousing & Logistics vs Healthcare & Clinical Support', async (t) => {
  store.reset();
  const app = createApp();

  await t.test('Should list at least two frontline sectors with distinct compliance rules', async () => {
    const res = await dispatchRequest(app, 'GET', '/api/sectors');
    assert.equal(res.status, 200);
    const sectors = res.body;

    assert.ok(sectors.length >= 2, 'Must support at least two sectors');
    const warehousing = sectors.find(s => s.id === 'warehousing');
    const healthcare = sectors.find(s => s.id === 'healthcare');

    assert.ok(warehousing, 'Warehousing sector must exist');
    assert.ok(healthcare, 'Healthcare sector must exist');

    assert.ok(warehousing.categories.some(c => c.id === 'heat_climate'));
    assert.ok(healthcare.categories.some(c => c.id === 'staffing_ratios'));
  });

  await t.test('Should isolate concerns and signals by sector query filter', async () => {
    // Submit healthcare concern
    await dispatchRequest(app, 'POST', '/api/concerns', {
      sectorId: 'healthcare',
      categoryId: 'staffing_ratios',
      facility: 'St. Jude Memorial Hospital (Floor 3)',
      shift: 'Night Shift',
      urgency: 'critical',
      summary: 'ICU nurse ratio exceeded safe patient limit by 2x.'
    });

    const resWarehouse = await dispatchRequest(app, 'GET', '/api/signals?sectorId=warehousing');
    const warehouseSignals = resWarehouse.body;
    assert.ok(warehouseSignals.every(s => s.sectorId === 'warehousing'));

    const resHealthcare = await dispatchRequest(app, 'GET', '/api/signals?sectorId=healthcare');
    const healthcareSignals = resHealthcare.body;
    assert.ok(healthcareSignals.every(s => s.sectorId === 'healthcare'));
  });

  await t.test('Should reject submissions with invalid sector IDs', async () => {
    const res = await dispatchRequest(app, 'POST', '/api/concerns', {
      sectorId: 'unsupported_sector',
      categoryId: 'heat_climate',
      summary: 'Some concern'
    });
    assert.equal(res.status, 500);
  });
});
