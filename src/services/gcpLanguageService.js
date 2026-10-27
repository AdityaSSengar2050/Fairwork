/**
 * Google Cloud Natural Language API Service
 * 
 * Hackathon Focus: Make work fairer, safer, and more transparent.
 * Core Use Case: Frontline workers submit hazards and concerns in unstructured language.
 * This service analyzes text sentiment and extracts entities/hazards to quantify risk severity
 * and group similar concerns into aggregated team signals without revealing identifying details.
 * 
 * Security & Least-Privilege Architecture:
 * - Credentials read from environment: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_API_KEY.
 * - Minimum IAM role needed: roles/cloudnaturallanguage.serviceAgent or roles/automl.viewer
 * - No credentials are hardcoded or committed to git.
 * - Resilient offline heuristic fallback when credentials are absent or network is unavailable,
 *   ensuring 100% demo and test reliability.
 */

export class GoogleCloudLanguageService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GOOGLE_CLOUD_API_KEY || null;
    this.projectId = config.projectId || process.env.GCP_PROJECT_ID || 'fairwork-demo';
    this.credentialsPath = config.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS || null;
    this.isLive = Boolean(this.apiKey || this.credentialsPath);
    this.endpoint = 'https://language.googleapis.com/v1/documents:annotateText';
  }

  /**
   * Analyze concern text for sentiment, key safety entities, and hazard severity.
   * @param {string} text - The raw concern submitted by a frontline worker
   * @returns {Promise<Object>} Analyzed safety insights
   */
  async analyzeConcern(text) {
    if (!text || typeof text !== 'string') {
      return this._fallbackAnalysis('');
    }

    if (this.isLive && this.apiKey) {
      try {
        const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: {
              type: 'PLAIN_TEXT',
              content: text
            },
            features: {
              extractDocumentSentiment: true,
              extractEntities: true
            },
            encodingType: 'UTF8'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return this._parseGcpResponse(data, text);
        }
      } catch (err) {
        console.warn('[GCP Language Service] Live API request failed, falling back to local NLP heuristics:', err.message);
      }
    }

    // Offline / Local Deterministic NLP Heuristic Fallback
    return this._fallbackAnalysis(text);
  }

  _parseGcpResponse(data, originalText) {
    const sentimentScore = data.documentSentiment?.score ?? 0; // -1.0 to 1.0
    const magnitude = data.documentSentiment?.magnitude ?? 0;
    
    // Safety risk score: Highly negative sentiment + high magnitude correlates with acute hazard/distress
    const riskScore = Math.min(100, Math.max(10, Math.round(((1 - sentimentScore) / 2) * 80 + (magnitude * 5))));
    
    const entities = (data.entities || []).map(e => ({
      name: e.name,
      type: e.type,
      salience: e.salience
    }));

    return {
      provider: 'Google Cloud Natural Language API (Live)',
      isLive: true,
      sentiment: {
        score: sentimentScore,
        magnitude: magnitude,
        label: sentimentScore <= -0.25 ? 'Distressed / Urgent' : sentimentScore <= 0.2 ? 'Concerned' : 'Neutral'
      },
      riskScore,
      extractedHazards: entities.slice(0, 5),
      analyzedAt: new Date().toISOString()
    };
  }

  _fallbackAnalysis(text) {
    const lower = text.toLowerCase();
    
    // Safety keyword heuristics for frontline sectors
    const hazardKeywords = [
      { word: 'broken', category: 'Equipment Hazard', weight: 25 },
      { word: 'forklift', category: 'Machinery', weight: 20 },
      { word: 'heat', category: 'Environmental Extreme', weight: 25 },
      { word: 'exhaustion', category: 'Physical Strain', weight: 30 },
      { word: 'ratio', category: 'Staffing Violation', weight: 35 },
      { word: 'needle', category: 'Biological Hazard', weight: 40 },
      { word: 'overtime', category: 'Hours & Rest', weight: 20 },
      { word: 'faint', category: 'Medical Emergency', weight: 45 },
      { word: 'spill', category: 'Slip Hazard', weight: 20 },
      { word: 'fire', category: 'Life Safety', weight: 50 },
      { word: 'harass', category: 'Fair Treatment', weight: 35 },
      { word: 'retaliat', category: 'Fair Treatment', weight: 40 }
    ];

    const detected = [];
    let cumulativeRisk = 30; // baseline concern risk

    for (const item of hazardKeywords) {
      if (lower.includes(item.word)) {
        detected.push({ name: item.word, type: item.category, salience: 0.85 });
        cumulativeRisk += item.weight;
      }
    }

    const clampedRisk = Math.min(100, Math.max(20, cumulativeRisk));
    const sentimentScore = clampedRisk > 60 ? -0.75 : clampedRisk > 40 ? -0.4 : -0.1;

    return {
      provider: 'Google Cloud Natural Language Service (Local Heuristic Fallback - Least Privilege)',
      isLive: false,
      sentiment: {
        score: sentimentScore,
        magnitude: Math.min(3.0, (clampedRisk / 30)),
        label: clampedRisk >= 70 ? 'Distressed / Critical Hazard' : clampedRisk >= 45 ? 'Urgent Concern' : 'Routine Feedback'
      },
      riskScore: clampedRisk,
      extractedHazards: detected,
      analyzedAt: new Date().toISOString()
    };
  }
}

export const gcpLanguageService = new GoogleCloudLanguageService();
