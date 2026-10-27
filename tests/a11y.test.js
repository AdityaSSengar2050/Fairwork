import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { store } from '../src/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Accessibility & Demo Data Labeling Verification', async (t) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  await t.test('Includes a visible keyboard skip-to-content link', () => {
    assert.match(html, /<a href="#main-content" class="skip-link">Skip to main content<\/a>/i);
    assert.match(html, /id="main-content"/i);
  });

  await t.test('Includes aria-live region for dynamic screen-reader announcements', () => {
    assert.match(html, /aria-live="polite"/i);
    assert.match(html, /id="live-announcer"/i);
  });

  await t.test('All form inputs have explicit corresponding labels', () => {
    assert.match(html, /<label for="concern-category"/i);
    assert.match(html, /<label for="concern-urgency"/i);
    assert.match(html, /<label for="concern-facility"/i);
    assert.match(html, /<label for="concern-summary"/i);
    assert.match(html, /<label for="assignee-name"/i);
    assert.match(html, /<label for="target-date"/i);
    assert.match(html, /<label for="action-plan"/i);
  });

  await t.test('Demo data is explicitly labeled and distinguishable from real submissions', () => {
    store.reset();
    const demoConcerns = store.getConcerns().filter(c => c.isDemo);
    assert.ok(demoConcerns.length > 0, 'Seed demo concerns must exist');
    for (const c of demoConcerns) {
      assert.equal(c.isDemo, true);
      assert.match(c.demoTag, /\[DEMO DATA/);
    }

    const demoSignals = store.getSignals().filter(s => s.isDemo);
    assert.ok(demoSignals.length > 0, 'Seed demo signals must exist');
    for (const s of demoSignals) {
      assert.equal(s.isDemo, true);
      assert.match(s.demoTag, /\[DEMO DATA/);
    }

    // HTML contains banner for demo data
    assert.match(html, /DEMO DATA/i);
    assert.match(html, /reset-demo-btn/i);
  });
});
