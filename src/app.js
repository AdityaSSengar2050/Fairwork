import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { store, SECTORS } from './store.js';
import { gcpLanguageService } from './services/gcpLanguageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Security & Accessibility Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Serve static assets from public directory
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // --- API Endpoints ---

  // Health and GCP Service Status
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'FairWork Prototype',
      challenge: 'Make work fairer, safer, and more transparent for everyone',
      gcpService: {
        name: 'Google Cloud Natural Language API',
        isLive: gcpLanguageService.isLive,
        leastPrivilegeScope: 'roles/cloudnaturallanguage.serviceAgent',
        fallbackActive: !gcpLanguageService.isLive
      },
      supportedSectors: Object.keys(SECTORS)
    });
  });

  // List supported sectors with safety categories & regulatory references
  app.get('/api/sectors', (req, res) => {
    res.json(store.getSectors());
  });

  // List frontline concerns (anonymized)
  app.get('/api/concerns', (req, res) => {
    const { sectorId } = req.query;
    const concerns = store.getConcerns({ sectorId });
    res.json(concerns);
  });

  // Worker submits a team concern (Flow Step 1)
  app.post('/api/concerns', async (req, res) => {
    try {
      const { sectorId, categoryId, facility, shift, summary, urgency } = req.body;

      if (!sectorId || !categoryId || !summary) {
        return res.status(400).json({ error: 'sectorId, categoryId, and summary are required fields.' });
      }

      // Analyze hazard & sentiment via Google Cloud Natural Language API (with resilient fallback)
      const nlpAnalysis = await gcpLanguageService.analyzeConcern(summary);

      const concern = store.addConcern({
        sectorId,
        categoryId,
        facility,
        shift,
        summary,
        urgency,
        nlpAnalysis
      });

      res.status(201).json({
        success: true,
        message: 'Concern recorded anonymously and aggregated into team safety signal.',
        concern
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manager views aggregated signals (Flow Step 2)
  app.get('/api/signals', (req, res) => {
    const { sectorId, status } = req.query;
    const signals = store.getSignals({ sectorId, status });
    res.json(signals);
  });

  // Get single signal
  app.get('/api/signals/:id', (req, res) => {
    const signal = store.getSignalById(req.params.id);
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    res.json(signal);
  });

  // Manager assigns actionable follow-up (Flow Step 3)
  app.post('/api/signals/:id/follow-up', (req, res) => {
    try {
      const { assignedTo, targetDate, actionPlan, preventiveMeasure } = req.body;
      if (!actionPlan) {
        return res.status(400).json({ error: 'actionPlan is required to assign follow-up.' });
      }
      const updated = store.assignFollowUp(req.params.id, {
        assignedTo,
        targetDate,
        actionPlan,
        preventiveMeasure
      });
      res.json({
        success: true,
        message: 'Follow-up assigned. Transparency notification sent to frontline noticeboard.',
        signal: updated
      });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // Manager closes the loop (Flow Step 4)
  app.post('/api/signals/:id/close-loop', (req, res) => {
    try {
      const { resolvedBy, summary, transparencyNotice } = req.body;
      if (!summary) {
        return res.status(400).json({ error: 'summary of resolution is required to close loop.' });
      }
      const updated = store.closeLoop(req.params.id, {
        resolvedBy,
        summary,
        transparencyNotice
      });
      res.json({
        success: true,
        message: 'Loop closed. Resolution published for frontline verification.',
        signal: updated
      });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // Workers verify closed loop
  app.post('/api/signals/:id/verify', (req, res) => {
    try {
      const { confirmed } = req.body;
      const updated = store.verifyResolution(req.params.id, Boolean(confirmed));
      res.json({
        success: true,
        message: confirmed ? 'Verification noted: Hazard resolved.' : 'Verification noted: Issue still persists on shift.',
        signal: updated
      });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // Reset demo data
  app.post('/api/demo/reset', (req, res) => {
    store.reset();
    res.json({ success: true, message: 'Demo data reset to baseline simulation.' });
  });

  return app;
}
