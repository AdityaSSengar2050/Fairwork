import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { store, SECTORS } from './store.js';
import { gcpLanguageService } from './services/gcpLanguageService.js';
import { logger } from './utils/logger.js';
import { AppError, ValidationError, NotFoundError, sanitizeString } from './utils/errors.js';
import { correlationIdMiddleware, createRateLimiter, nativeCompressionMiddleware } from './middleware/efficiency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Efficiency & Observability Middlewares
  app.use(correlationIdMiddleware);
  app.use(createRateLimiter({ max: 300, windowMs: 60000 }));
  app.use(nativeCompressionMiddleware);

  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ extended: true, limit: '512kb' }));

  // Security & Accessibility Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Serve static assets with caching headers for low-end mobile performance
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
    etag: true
  }));

  // --- API Endpoints ---

  // Health and System Diagnostics
  app.get('/api/status', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const memory = process.memoryUsage();
    res.json({
      status: 'healthy',
      app: 'FairWork Prototype',
      version: '1.2.0',
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMb: Math.round(memory.rss / (1024 * 1024)),
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

  // List supported sectors with regulatory references
  app.get('/api/sectors', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 min
    res.json(store.getSectors());
  });

  // List frontline concerns (anonymized)
  app.get('/api/concerns', (req, res) => {
    const { sectorId, limit } = req.query;
    const concerns = store.getConcerns({ sectorId, limit });
    res.json(concerns);
  });

  // Worker submits a team concern (Flow Step 1)
  app.post('/api/concerns', async (req, res, next) => {
    try {
      const { sectorId, categoryId, facility, shift, summary, urgency } = req.body;

      if (!sectorId || !categoryId || !summary) {
        throw new ValidationError('sectorId, categoryId, and summary are required fields.');
      }

      if (!SECTORS[sectorId]) {
        throw new ValidationError(`Unsupported sector ID: ${sectorId}`);
      }

      const cleanSummary = sanitizeString(summary);
      if (cleanSummary.length < 5) {
        throw new ValidationError('Concern description must be at least 5 characters.');
      }

      // Analyze hazard & sentiment via Google Cloud Natural Language API
      const nlpAnalysis = await gcpLanguageService.analyzeConcern(cleanSummary);

      const concern = store.addConcern({
        sectorId,
        categoryId,
        facility: sanitizeString(facility) || 'Main Facility',
        shift: sanitizeString(shift) || 'General Shift',
        summary: cleanSummary,
        urgency: ['low', 'medium', 'high', 'critical'].includes(urgency) ? urgency : 'medium',
        nlpAnalysis
      });

      logger.info('Concern recorded', {
        id: concern.id,
        sectorId,
        urgency,
        nlpRiskScore: nlpAnalysis.riskScore
      });

      res.status(201).json({
        success: true,
        message: 'Concern recorded anonymously and aggregated into team safety signal.',
        concern
      });
    } catch (err) {
      next(err);
    }
  });

  // Manager views aggregated signals (Flow Step 2)
  app.get('/api/signals', (req, res) => {
    const { sectorId, status } = req.query;
    const signals = store.getSignals({ sectorId, status });
    res.json(signals);
  });

  // Get single signal
  app.get('/api/signals/:id', (req, res, next) => {
    const signal = store.getSignalById(req.params.id);
    if (!signal) return next(new NotFoundError('Signal'));
    res.json(signal);
  });

  // Manager assigns actionable follow-up (Flow Step 3)
  app.post('/api/signals/:id/follow-up', (req, res, next) => {
    try {
      const { assignedTo, targetDate, actionPlan, preventiveMeasure } = req.body;
      if (!actionPlan || typeof actionPlan !== 'string' || actionPlan.trim().length === 0) {
        throw new ValidationError('actionPlan is required to assign follow-up.');
      }

      const updated = store.assignFollowUp(req.params.id, {
        assignedTo: sanitizeString(assignedTo) || 'Operations Lead',
        targetDate: sanitizeString(targetDate),
        actionPlan: sanitizeString(actionPlan),
        preventiveMeasure: sanitizeString(preventiveMeasure)
      });

      res.json({
        success: true,
        message: 'Follow-up assigned. Transparency notification sent to frontline noticeboard.',
        signal: updated
      });
    } catch (err) {
      next(err);
    }
  });

  // Manager closes the loop (Flow Step 4)
  app.post('/api/signals/:id/close-loop', (req, res, next) => {
    try {
      const { resolvedBy, summary, transparencyNotice } = req.body;
      if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
        throw new ValidationError('summary of resolution is required to close loop.');
      }

      const updated = store.closeLoop(req.params.id, {
        resolvedBy: sanitizeString(resolvedBy) || 'Facility Lead',
        summary: sanitizeString(summary),
        transparencyNotice: sanitizeString(transparencyNotice)
      });

      res.json({
        success: true,
        message: 'Loop closed. Resolution published for frontline verification.',
        signal: updated
      });
    } catch (err) {
      next(err);
    }
  });

  // Workers verify closed loop
  app.post('/api/signals/:id/verify', (req, res, next) => {
    try {
      const { confirmed } = req.body;
      const updated = store.verifyResolution(req.params.id, Boolean(confirmed));
      res.json({
        success: true,
        message: confirmed ? 'Verification noted: Hazard resolved.' : 'Verification noted: Issue still persists on shift.',
        signal: updated
      });
    } catch (err) {
      next(err);
    }
  });

  // Cryptographic Transparency Audit Ledger (Flow Accountability)
  app.get('/api/transparency/audit-ledger', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 25;
    res.json({
      success: true,
      integrity: 'SHA-256 Hashed Immutable Chain',
      ledger: store.getAuditLedger(limit)
    });
  });

  // Reset demo data
  app.post('/api/demo/reset', (req, res) => {
    store.reset();
    res.json({ success: true, message: 'Demo data reset to baseline simulation.' });
  });

  // Centralized Error Handling Middleware
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
    const code = err.code || 'INTERNAL_ERROR';

    if (statusCode >= 500) {
      logger.error('Unhandled Server Error', { error: err.message, stack: err.stack, path: req.path });
    } else {
      logger.warn('Client Error', { code, error: err.message, path: req.path });
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message: err.message || 'An unexpected error occurred.',
        details: err.details || null
      }
    });
  });

  return app;
}
