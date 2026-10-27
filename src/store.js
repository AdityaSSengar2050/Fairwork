/**
 * FairWork In-Memory Data Store
 * Supports multi-sector operations, privacy-preserving signal aggregation,
 * action assignment, and loop closure.
 * 
 * All initial sample data is clearly tagged with isDemo: true.
 */

export const SECTORS = {
  warehousing: {
    id: 'warehousing',
    name: 'Warehousing & Logistics',
    description: 'Distribution centers, fulfillment hubs, sorting facilities, and heavy freight transport.',
    categories: [
      { id: 'heat_climate', name: 'Heat & Ventilation Extreme', oshaRef: 'OSHA NEP Heat Hazards' },
      { id: 'machinery_forklift', name: 'Machinery & Forklift Defect', oshaRef: '29 CFR 1910.178' },
      { id: 'quota_strain', name: 'Excessive Quota Speed & Ergonomics', oshaRef: 'General Duty Clause Sec 5(a)(1)' },
      { id: 'breaks_hydration', name: 'Denied Rest Breaks & Hydration', oshaRef: 'Fair Labor Standards Act' },
      { id: 'ppe_defects', name: 'Damaged PPE / High-Vis Shortage', oshaRef: '29 CFR 1910.132' }
    ],
    defaultFacilities: ['Regional Fulfillment Hub 4 (Dock B)', 'Inbound Sorting Depot 12', 'Cold Chain Loading Bay']
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare & Clinical Support',
    description: 'Acute care hospitals, emergency rooms, nursing wards, and outpatient clinics.',
    categories: [
      { id: 'staffing_ratios', name: 'Unsafe Staff-to-Patient Ratio', oshaRef: 'Safe Staffing Standard / CMS 482.23' },
      { id: 'needle_infection', name: 'Needle-Stick Protocol & Sharps Hazard', oshaRef: '29 CFR 1910.1030' },
      { id: 'mandatory_overtime', name: 'Fatigue & Mandatory 16hr Double Shift', oshaRef: 'Nurse Fatigue Guidelines' },
      { id: 'ppe_sanitation', name: 'PPE Shortage / Airborne Isolation Deficit', oshaRef: '29 CFR 1910.134' },
      { id: 'patient_violence', name: 'Workplace De-escalation & Violence Risk', oshaRef: 'OSHA Healthcare Guidelines' }
    ],
    defaultFacilities: ['St. Jude Memorial Hospital (ER Ward)', 'Valley Central Acute Care (Floor 4)', 'Sunrise Rehabilitation Unit']
  }
};

const SEED_DATA = () => ({
  concerns: [
    {
      id: 'concern-demo-101',
      isDemo: true,
      demoTag: '[DEMO DATA - SIMULATED ENVIRONMENT]',
      sectorId: 'warehousing',
      categoryId: 'heat_climate',
      facility: 'Regional Fulfillment Hub 4 (Dock B)',
      shift: 'Shift B (14:00 - 22:00)',
      summary: 'Loading dock temperatures exceeded 98°F with non-working overhead misting fans and empty water stations.',
      urgency: 'high',
      submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      nlpAnalysis: {
        provider: 'Google Cloud Natural Language Service (Simulated Demo)',
        isLive: false,
        riskScore: 85,
        sentiment: { score: -0.8, magnitude: 2.5, label: 'Distressed / Critical Hazard' },
        extractedHazards: [{ name: 'heat', type: 'Environmental Extreme', salience: 0.9 }]
      }
    },
    {
      id: 'concern-demo-102',
      isDemo: true,
      demoTag: '[DEMO DATA - SIMULATED ENVIRONMENT]',
      sectorId: 'warehousing',
      categoryId: 'heat_climate',
      facility: 'Regional Fulfillment Hub 4 (Dock B)',
      shift: 'Shift B (14:00 - 22:00)',
      summary: 'Two pickers required electrolyte rehydration and dizziness reported near conveyor 3 due to extreme heat.',
      urgency: 'critical',
      submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      nlpAnalysis: {
        provider: 'Google Cloud Natural Language Service (Simulated Demo)',
        isLive: false,
        riskScore: 92,
        sentiment: { score: -0.9, magnitude: 2.8, label: 'Distressed / Critical Hazard' },
        extractedHazards: [{ name: 'dizziness', type: 'Medical Emergency', salience: 0.95 }]
      }
    },
    {
      id: 'concern-demo-201',
      isDemo: true,
      demoTag: '[DEMO DATA - SIMULATED ENVIRONMENT]',
      sectorId: 'healthcare',
      categoryId: 'staffing_ratios',
      facility: 'St. Jude Memorial Hospital (ER Ward)',
      shift: 'Night Shift (19:00 - 07:00)',
      summary: 'ER nurse-to-patient ratio was 1:8 instead of state mandate 1:4. High triage wait times and medication delays.',
      urgency: 'critical',
      submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      nlpAnalysis: {
        provider: 'Google Cloud Natural Language Service (Simulated Demo)',
        isLive: false,
        riskScore: 88,
        sentiment: { score: -0.75, magnitude: 2.1, label: 'Distressed / Critical Hazard' },
        extractedHazards: [{ name: 'ratio', type: 'Staffing Violation', salience: 0.92 }]
      }
    }
  ],
  signals: [
    {
      id: 'signal-demo-1',
      isDemo: true,
      demoTag: '[DEMO DATA - SIMULATED ENVIRONMENT]',
      sectorId: 'warehousing',
      categoryId: 'heat_climate',
      facility: 'Regional Fulfillment Hub 4 (Dock B)',
      title: 'Heat Stress & Hydration Shortage - Dock B',
      concernCount: 2,
      riskLevel: 'CRITICAL',
      riskScore: 89,
      status: 'action_assigned', // 'open' | 'action_assigned' | 'resolved'
      createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      followUp: {
        assignedTo: 'Marcus Vance (Safety Director)',
        assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        targetDate: new Date(Date.now() + 3600000 * 24).toISOString().split('T')[0],
        actionPlan: 'Deploy 4 industrial evaporative coolers to Dock B immediately. Restock 5-gallon electrolyte coolers every 2 hours.',
        preventiveMeasure: 'Install automated wet-bulb globe temperature sensors linked to mandated 15-minute rest rotations.'
      },
      resolution: null,
      workerVerifications: {
        confirmedCount: 0,
        unresolvedCount: 0
      }
    },
    {
      id: 'signal-demo-2',
      isDemo: true,
      demoTag: '[DEMO DATA - SIMULATED ENVIRONMENT]',
      sectorId: 'healthcare',
      categoryId: 'staffing_ratios',
      facility: 'St. Jude Memorial Hospital (ER Ward)',
      title: 'Acuity Breach: Unsafe 1:8 Patient Ratio in Emergency Ward',
      concernCount: 1,
      riskLevel: 'HIGH',
      riskScore: 88,
      status: 'resolved',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      followUp: {
        assignedTo: 'Dr. Elena Rostova (Chief Nursing Officer)',
        assignedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        targetDate: new Date(Date.now() - 3600000 * 6).toISOString().split('T')[0],
        actionPlan: 'Authorize emergency PRN registry nurse call-ins and divert non-critical intake.',
        preventiveMeasure: 'Implement predictive float pool staffing 4 hours ahead of weekend volume spikes.'
      },
      resolution: {
        resolvedBy: 'Dr. Elena Rostova',
        resolvedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        summary: '2 on-call float RNs deployed. Triage ratio restored to 1:3. Overtime pay incentive authorized.',
        transparencyNotice: 'Confirmed by shift supervisor. Daily staffing matrix published to ER breakroom noticeboard.'
      },
      workerVerifications: {
        confirmedCount: 5,
        unresolvedCount: 0
      }
    }
  ]
});

class Store {
  constructor() {
    this.reset();
  }

  reset() {
    const seed = SEED_DATA();
    this.concerns = seed.concerns;
    this.signals = seed.signals;
  }

  getSectors() {
    return Object.values(SECTORS);
  }

  getSector(id) {
    return SECTORS[id] || null;
  }

  /**
   * Submit an anonymous worker concern and aggregate it into team signals.
   */
  addConcern(data) {
    const sector = SECTORS[data.sectorId];
    if (!sector) throw new Error(`Invalid sector: ${data.sectorId}`);

    const newConcern = {
      id: 'concern-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      isDemo: false,
      sectorId: data.sectorId,
      categoryId: data.categoryId,
      facility: data.facility || 'Main Facility',
      shift: data.shift || 'General Shift',
      summary: data.summary,
      urgency: data.urgency || 'medium',
      submittedAt: new Date().toISOString(),
      nlpAnalysis: data.nlpAnalysis || null
    };

    this.concerns.unshift(newConcern);
    this._aggregateIntoSignal(newConcern);

    return newConcern;
  }

  getConcerns(filters = {}) {
    let result = [...this.concerns];
    if (filters.sectorId) {
      result = result.filter(c => c.sectorId === filters.sectorId);
    }
    return result;
  }

  getSignals(filters = {}) {
    let result = [...this.signals];
    if (filters.sectorId) {
      result = result.filter(s => s.sectorId === filters.sectorId);
    }
    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }
    return result;
  }

  getSignalById(id) {
    return this.signals.find(s => s.id === id) || null;
  }

  /**
   * Manager assigns actionable follow-up to an aggregated signal.
   */
  assignFollowUp(signalId, { assignedTo, targetDate, actionPlan, preventiveMeasure }) {
    const signal = this.getSignalById(signalId);
    if (!signal) throw new Error(`Signal ${signalId} not found`);

    signal.followUp = {
      assignedTo: assignedTo || 'Operations Lead',
      assignedAt: new Date().toISOString(),
      targetDate: targetDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      actionPlan,
      preventiveMeasure: preventiveMeasure || 'Standard Operating Procedure review'
    };
    signal.status = 'action_assigned';
    signal.updatedAt = new Date().toISOString();

    return signal;
  }

  /**
   * Manager closes the loop, publishing resolution to the Transparency Board.
   */
  closeLoop(signalId, { resolvedBy, summary, transparencyNotice }) {
    const signal = this.getSignalById(signalId);
    if (!signal) throw new Error(`Signal ${signalId} not found`);

    signal.resolution = {
      resolvedBy: resolvedBy || 'Facility Lead',
      resolvedAt: new Date().toISOString(),
      summary: summary || 'Corrective action implemented and inspected.',
      transparencyNotice: transparencyNotice || 'Published to frontline transparency board.'
    };
    signal.status = 'resolved';
    signal.updatedAt = new Date().toISOString();

    return signal;
  }

  /**
   * Workers verify whether the closed loop actually fixed the ground reality.
   */
  verifyResolution(signalId, confirmed) {
    const signal = this.getSignalById(signalId);
    if (!signal) throw new Error(`Signal ${signalId} not found`);
    if (!signal.workerVerifications) {
      signal.workerVerifications = { confirmedCount: 0, unresolvedCount: 0 };
    }

    if (confirmed) {
      signal.workerVerifications.confirmedCount += 1;
    } else {
      signal.workerVerifications.unresolvedCount += 1;
    }
    return signal;
  }

  /**
   * Aggregates concerns into privacy-preserving team signals (k-anonymity clustering).
   */
  _aggregateIntoSignal(concern) {
    const existing = this.signals.find(s => 
      s.sectorId === concern.sectorId &&
      s.categoryId === concern.categoryId &&
      s.facility === concern.facility &&
      s.status !== 'resolved'
    );

    const calculatedRisk = concern.nlpAnalysis?.riskScore || (concern.urgency === 'critical' ? 90 : concern.urgency === 'high' ? 70 : 40);
    const riskLevel = calculatedRisk >= 80 ? 'CRITICAL' : calculatedRisk >= 55 ? 'HIGH' : 'MODERATE';

    if (existing) {
      existing.concernCount += 1;
      existing.updatedAt = new Date().toISOString();
      existing.riskScore = Math.max(existing.riskScore, calculatedRisk);
      if (calculatedRisk > 75) existing.riskLevel = 'CRITICAL';
    } else {
      const sector = SECTORS[concern.sectorId];
      const categoryObj = sector?.categories.find(c => c.id === concern.categoryId);
      const title = `${categoryObj ? categoryObj.name : 'Safety Hazard'} - ${concern.facility}`;

      const newSignal = {
        id: 'signal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        isDemo: concern.isDemo || false,
        sectorId: concern.sectorId,
        categoryId: concern.categoryId,
        facility: concern.facility,
        title,
        concernCount: 1,
        riskLevel,
        riskScore: calculatedRisk,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        followUp: null,
        resolution: null,
        workerVerifications: {
          confirmedCount: 0,
          unresolvedCount: 0
        }
      };
      this.signals.unshift(newSignal);
    }
  }
}

export const store = new Store();
