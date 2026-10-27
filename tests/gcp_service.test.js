import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleCloudLanguageService } from '../src/services/gcpLanguageService.js';

test('Google Cloud Natural Language API Service & Least-Privilege Handling', async (t) => {
  await t.test('Fallback NLP engine correctly evaluates frontline hazard keywords', async () => {
    const service = new GoogleCloudLanguageService();
    const result = await service.analyzeConcern('Forklift brake is broken and exhaust fumes causing faintness near bay 4');

    assert.ok(result);
    assert.ok(result.riskScore >= 60, 'Broken forklift and faintness should yield elevated risk score');
    assert.ok(result.sentiment.score < 0, 'Hazard concern must have negative sentiment score');
    assert.ok(result.extractedHazards.length >= 2, 'Should extract multiple safety hazard entities');
    assert.ok(result.extractedHazards.some(h => h.name === 'forklift' || h.name === 'broken'));
  });

  await t.test('Safely handles empty or non-string inputs without throwing', async () => {
    const service = new GoogleCloudLanguageService();
    const result = await service.analyzeConcern(null);

    assert.ok(result);
    assert.equal(typeof result.riskScore, 'number');
    assert.ok(Array.isArray(result.extractedHazards));
  });

  await t.test('Respects environment variables for least privilege without hardcoding secrets', async () => {
    const customService = new GoogleCloudLanguageService({
      apiKey: null,
      projectId: 'my-gcp-project'
    });

    assert.equal(customService.projectId, 'my-gcp-project');
    assert.equal(customService.isLive, false);
  });
});
