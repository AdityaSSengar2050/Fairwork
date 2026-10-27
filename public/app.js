/**
 * FairWork Frontline Application
 * 
 * Hackathon Challenge: "Make work fairer, safer, and more transparent for everyone."
 * Architecture:
 * - Multi-sector support (Warehousing & Logistics, Healthcare & Clinical)
 * - End-to-end closed loop flow:
 *     1. Worker anonymous concern submission
 *     2. Aggregated signal center + Google Cloud NLP evaluation
 *     3. Manager follow-up assignment
 *     4. Closed-loop public transparency & verification
 * - Accessible: WCAG AAA compliance, live screen reader announcements, keyboard navigation
 * - Ultra-lightweight for low-end mobile devices (<35KB total payload, zero external JS libraries)
 */

// Application State
const state = {
  sectors: [],
  currentSectorId: 'warehousing',
  concerns: [],
  signals: [],
  statusFilter: '',
  activeTab: 'panel-worker'
};

// DOM Elements
const elements = {
  sectorSelect: document.getElementById('sector-select'),
  sectorInfoBox: document.getElementById('sector-info-box'),
  currentSectorName: document.getElementById('current-sector-name'),
  currentSectorDesc: document.getElementById('current-sector-desc'),
  currentSectorOsha: document.getElementById('current-sector-osha'),
  concernCategory: document.getElementById('concern-category'),
  concernFacility: document.getElementById('concern-facility'),
  concernForm: document.getElementById('concern-form'),
  concernSummary: document.getElementById('concern-summary'),
  workerConcernsList: document.getElementById('worker-concerns-list'),
  signalsList: document.getElementById('signals-list'),
  signalStatusFilter: document.getElementById('signal-status-filter'),
  transparencyActiveList: document.getElementById('transparency-active-list'),
  transparencyResolvedList: document.getElementById('transparency-resolved-list'),
  activeActionsCount: document.getElementById('active-actions-count'),
  resolvedActionsCount: document.getElementById('resolved-actions-count'),
  liveAnnouncer: document.getElementById('live-announcer'),
  resetDemoBtn: document.getElementById('reset-demo-btn'),
  gcpStatusText: document.getElementById('gcp-status-text'),
  gcpBadge: document.getElementById('gcp-badge'),
  auditLedgerList: document.getElementById('audit-ledger-list'),
  refreshAuditBtn: document.getElementById('refresh-audit-btn'),
  // Modals
  actionModal: document.getElementById('action-modal'),
  followupForm: document.getElementById('followup-form'),
  modalSignalId: document.getElementById('modal-signal-id'),
  modalSignalMeta: document.getElementById('modal-signal-meta'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  cancelActionBtn: document.getElementById('cancel-action-btn'),
  closeLoopModal: document.getElementById('close-loop-modal'),
  closeLoopForm: document.getElementById('close-loop-form'),
  closeModalSignalId: document.getElementById('close-modal-signal-id'),
  closeModalSignalMeta: document.getElementById('close-modal-signal-meta'),
  closeModalCloseBtn: document.getElementById('close-modal-close-btn'),
  closeCancelBtn: document.getElementById('close-cancel-btn')
};

// Screen-reader announcer
function announce(message) {
  if (elements.liveAnnouncer) {
    elements.liveAnnouncer.textContent = message;
  }
}

// Format relative date
function formatRelativeTime(isoString) {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) {
      const minutes = Math.max(1, Math.floor(diff / 60000));
      return `${minutes}m ago`;
    }
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

// Initialize Application
async function init() {
  setupNavigation();
  setupQuickTemplates();
  setupModalDismissals();
  await checkHealthAndGcp();
  await loadSectors();
  await refreshData();

  // Listeners
  elements.sectorSelect.addEventListener('change', (e) => {
    state.currentSectorId = e.target.value;
    updateSectorView();
    refreshData();
    announce(`Switched sector view to ${elements.sectorSelect.selectedOptions[0].text}`);
  });

  elements.signalStatusFilter.addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    renderSignals();
  });

  elements.concernForm.addEventListener('submit', handleConcernSubmit);
  elements.followupForm.addEventListener('submit', handleFollowUpSubmit);
  elements.closeLoopForm.addEventListener('submit', handleCloseLoopSubmit);
  elements.resetDemoBtn.addEventListener('click', handleResetDemo);
  if (elements.refreshAuditBtn) {
    elements.refreshAuditBtn.addEventListener('click', renderAuditLedger);
  }

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Global Keyboard Shortcuts (Alt+1, Alt+2, Alt+3, Alt+4)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === '1') switchTab('panel-worker');
    if (e.altKey && e.key === '2') switchTab('panel-manager');
    if (e.altKey && e.key === '3') switchTab('panel-transparency');
    if (e.altKey && e.key === '4') switchTab('panel-audit');
  });
}

// Google Cloud Natural Language status
async function checkHealthAndGcp() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.gcpService) {
      if (data.gcpService.isLive) {
        elements.gcpStatusText.textContent = 'Live Google Cloud Natural Language API (ADC / Least-Privilege Active)';
        elements.gcpBadge.textContent = 'GCP LIVE';
        elements.gcpBadge.className = 'badge badge-success';
      } else {
        elements.gcpStatusText.textContent = 'Google Cloud NLP integration active (Deterministic Local Fallback Mode)';
        elements.gcpBadge.textContent = 'Least-Privilege Standby';
        elements.gcpBadge.className = 'badge badge-gcp';
      }
    }
  } catch (err) {
    console.warn('Status check warning:', err);
  }
}

// Load supported sectors
async function loadSectors() {
  try {
    const res = await fetch('/api/sectors');
    state.sectors = await res.json();
    updateSectorView();
  } catch (err) {
    console.error('Failed to load sectors:', err);
  }
}

// Update sector UI
function updateSectorView() {
  const current = state.sectors.find(s => s.id === state.currentSectorId);
  if (!current) return;

  elements.currentSectorName.textContent = current.name;
  elements.currentSectorDesc.textContent = current.description;
  elements.currentSectorOsha.textContent = current.id === 'healthcare' 
    ? 'CMS 482.23 & Safe Staffing Protocols Aligned'
    : 'OSHA NEP Heat & Ergonomics Standards Aligned';

  // Populate categories
  elements.concernCategory.innerHTML = current.categories.map(cat => 
    `<option value="${cat.id}">${cat.name} (${cat.oshaRef})</option>`
  ).join('');

  // Default facility placeholder
  if (current.defaultFacilities && current.defaultFacilities.length > 0) {
    elements.concernFacility.value = current.defaultFacilities[0];
  }
}

// Fetch concerns and signals
async function refreshData() {
  try {
    const [concernsRes, signalsRes] = await Promise.all([
      fetch(`/api/concerns?sectorId=${state.currentSectorId}`),
      fetch(`/api/signals?sectorId=${state.currentSectorId}`)
    ]);

    state.concerns = await concernsRes.json();
    state.signals = await signalsRes.json();

    renderWorkerConcerns();
    renderSignals();
    renderTransparencyBoard();
    renderAuditLedger();
  } catch (err) {
    console.error('Error refreshing data:', err);
  }
}

// Render Worker Concerns Feed
function renderWorkerConcerns() {
  if (state.concerns.length === 0) {
    elements.workerConcernsList.innerHTML = `
      <div class="card" style="text-align: center; color: var(--text-muted);">
        No recent concerns filed in this sector. Tap any hazard template above to file.
      </div>`;
    return;
  }

  elements.workerConcernsList.innerHTML = state.concerns.map(c => {
    const isDemoBadge = c.isDemo 
      ? `<span class="badge badge-demo" title="Mock record for testing">[DEMO DATA]</span>` 
      : `<span class="badge badge-info">VERIFIED FRONTLINE</span>`;
    
    const nlpInfo = c.nlpAnalysis ? `
      <div style="font-size: 0.8rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.4rem 0.6rem; border-radius: 4px; margin-top: 0.5rem;">
        <strong>NLP Evaluation:</strong> Risk Index: ${c.nlpAnalysis.riskScore}/100 &bull; Sentiment: ${c.nlpAnalysis.sentiment.label}
      </div>` : '';

    return `
      <article class="feed-item" role="article" aria-label="Concern report">
        <div class="feed-header">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            ${isDemoBadge}
            <span class="badge ${c.urgency === 'critical' ? 'badge-danger' : c.urgency === 'high' ? 'badge-warning' : 'badge-info'}">
              ${c.urgency.toUpperCase()} PRIORITY
            </span>
            <strong>${c.facility}</strong>
          </div>
          <span class="feed-time">${formatRelativeTime(c.submittedAt)}</span>
        </div>
        <p class="feed-summary">${escapeHtml(c.summary)}</p>
        ${nlpInfo}
        <div class="feed-footer">
          <span>Shift: ${escapeHtml(c.shift)}</span>
          <span style="color:#047857;">&check; Clustered into Team Safety Signal</span>
        </div>
      </article>
    `;
  }).join('');
}

// Render Aggregated Signals (Manager Flow Step 2 & 3)
function renderSignals() {
  let list = [...state.signals];
  if (state.statusFilter) {
    list = list.filter(s => s.status === state.statusFilter);
  }

  if (list.length === 0) {
    elements.signalsList.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">
        No aggregated signals matching the filter.
      </div>`;
    return;
  }

  elements.signalsList.innerHTML = list.map(signal => {
    const riskClass = signal.riskScore >= 80 ? 'critical' : signal.riskScore >= 55 ? 'high' : 'moderate';
    const isDemoBadge = signal.isDemo 
      ? `<span class="badge badge-demo">[DEMO DATA]</span>` 
      : '';
    
    let statusBadge = '';
    let actionArea = '';

    if (signal.status === 'open') {
      statusBadge = '<span class="badge badge-warning">Action Needed</span>';
      actionArea = `
        <div class="signal-actions">
          <button type="button" class="btn btn-primary assign-btn" data-id="${signal.id}" aria-label="Assign follow-up to ${escapeHtml(signal.title)}">
            Assign Follow-Up
          </button>
        </div>`;
    } else if (signal.status === 'action_assigned') {
      statusBadge = '<span class="badge badge-info">Action In Progress</span>';
      actionArea = `
        <div class="signal-action-box">
          <h4>&bull; Active Follow-Up: ${escapeHtml(signal.followUp.assignedTo)}</h4>
          <p><strong>Remediation:</strong> ${escapeHtml(signal.followUp.actionPlan)}</p>
          <p><strong>Target ETA:</strong> ${signal.followUp.targetDate}</p>
        </div>
        <div class="signal-actions" style="margin-top: 0.5rem;">
          <button type="button" class="btn btn-success close-loop-btn" data-id="${signal.id}" aria-label="Close safety loop for ${escapeHtml(signal.title)}">
            Close the Loop &amp; Publish Proof
          </button>
        </div>`;
    } else if (signal.status === 'resolved') {
      statusBadge = '<span class="badge badge-success">&check; Loop Closed</span>';
      actionArea = `
        <div class="signal-action-box" style="background:#f0fdf4; border-color:#86efac;">
          <h4>&check; Resolved by ${escapeHtml(signal.resolution.resolvedBy)}</h4>
          <p>${escapeHtml(signal.resolution.summary)}</p>
          <div style="font-size:0.8rem; color:#166534; margin-top:0.35rem;">
            Frontline Verifications: ${signal.workerVerifications?.confirmedCount || 0} Confirmed Fixed
          </div>
        </div>`;
    }

    return `
      <article class="signal-card ${riskClass}" role="article" aria-label="Signal: ${escapeHtml(signal.title)}">
        <div>
          <div class="signal-meta-row">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem;">
                ${isDemoBadge}
                ${statusBadge}
                ${signal.isSlaBreached ? '<span class="badge badge-danger">⚠️ SLA BREACHED - ESCALATED</span>' : (signal.status === 'open' ? `<span class="badge badge-info">⏳ SLA: ${signal.slaHoursRemaining}h remaining</span>` : '')}
                <span class="badge ${riskClass === 'critical' ? 'badge-danger' : riskClass === 'high' ? 'badge-warning' : 'badge-info'}">
                  Risk ${signal.riskScore}/100
                </span>
              </div>
              <h4 class="signal-title">${escapeHtml(signal.title)}</h4>
              <p class="signal-facility">${escapeHtml(signal.facility)}</p>
            </div>
          </div>

          <div class="signal-stats" style="margin: 0.75rem 0;">
            <div class="stat-item">
              <strong>${signal.concernCount}</strong> worker concerns clustered
            </div>
            <div class="stat-item" style="color: #047857;">
              🛡️ Identities Masked
            </div>
          </div>
        </div>

        <div>
          ${actionArea}
        </div>
      </article>
    `;
  }).join('');

  // Attach button events
  document.querySelectorAll('.assign-btn').forEach(btn => {
    btn.addEventListener('click', () => openAssignModal(btn.dataset.id));
  });
  document.querySelectorAll('.close-loop-btn').forEach(btn => {
    btn.addEventListener('click', () => openCloseLoopModal(btn.dataset.id));
  });
}

// Render Public Transparency & Verification Board (Step 4 & Verification)
function renderTransparencyBoard() {
  const activeSignals = state.signals.filter(s => s.status === 'action_assigned');
  const resolvedSignals = state.signals.filter(s => s.status === 'resolved');

  elements.activeActionsCount.textContent = activeSignals.length;
  elements.resolvedActionsCount.textContent = resolvedSignals.length;

  if (activeSignals.length === 0) {
    elements.transparencyActiveList.innerHTML = `
      <div class="feed-item" style="text-align: center; color: var(--text-muted);">
        No pending follow-ups currently in progress.
      </div>`;
  } else {
    elements.transparencyActiveList.innerHTML = activeSignals.map(s => `
      <div class="feed-item" role="article" aria-label="Active follow up">
        <div class="feed-header">
          <strong>${escapeHtml(s.title)}</strong>
          <span class="badge badge-info">ETA: ${s.followUp.targetDate}</span>
        </div>
        <p class="feed-summary"><strong>Committed Action:</strong> ${escapeHtml(s.followUp.actionPlan)}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          <strong>Accountable Lead:</strong> ${escapeHtml(s.followUp.assignedTo)}
        </p>
        <div class="feed-footer">
          <span>Clustered from ${s.concernCount} anonymous frontline report(s)</span>
          <span style="color: #2563eb;">&bull; Action underway</span>
        </div>
      </div>
    `).join('');
  }

  if (resolvedSignals.length === 0) {
    elements.transparencyResolvedList.innerHTML = `
      <div class="feed-item" style="text-align: center; color: var(--text-muted);">
        No closed loops recorded yet.
      </div>`;
  } else {
    elements.transparencyResolvedList.innerHTML = resolvedSignals.map(s => `
      <div class="feed-item" role="article" aria-label="Closed loop item">
        <div class="feed-header">
          <strong>${escapeHtml(s.title)}</strong>
          <span class="badge badge-success">&check; Loop Closed</span>
        </div>
        <p class="feed-summary">${escapeHtml(s.resolution.summary)}</p>
        <p style="font-size: 0.85rem; color: #166534; background: #f0fdf4; padding: 0.35rem 0.5rem; border-radius: 4px;">
          <strong>Frontline Transparency Notice:</strong> ${escapeHtml(s.resolution.transparencyNotice)}
        </p>
        <div class="feed-footer" style="margin-top: 0.75rem;">
          <div>
            <strong>Did this fix the problem on your shift?</strong>
            <div style="display:flex; gap:0.5rem; margin-top:0.35rem;">
              <button type="button" class="btn btn-secondary verify-btn" data-id="${s.id}" data-val="true" style="min-height:36px; padding:0.25rem 0.65rem; font-size:0.85rem;" aria-label="Confirm fix for ${escapeHtml(s.title)}">
                &check; Yes (${s.workerVerifications?.confirmedCount || 0})
              </button>
              <button type="button" class="btn btn-secondary verify-btn" data-id="${s.id}" data-val="false" style="min-height:36px; padding:0.25rem 0.65rem; font-size:0.85rem;" aria-label="Report issue persists for ${escapeHtml(s.title)}">
                &times; Still Unsafe (${s.workerVerifications?.unresolvedCount || 0})
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Verification vote buttons
    document.querySelectorAll('.verify-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const signalId = btn.dataset.id;
        const confirmed = btn.dataset.val === 'true';
        try {
          await fetch(`/api/signals/${signalId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmed })
          });
          announce(confirmed ? 'Thank you. Verification recorded.' : 'Thank you. Persistent hazard noted for re-opening.');
          await refreshData();
        } catch (err) {
          console.error('Verification error:', err);
        }
      });
    });
  }
}

// Render Cryptographic SHA-256 Audit Ledger
async function renderAuditLedger() {
  if (!elements.auditLedgerList) return;
  try {
    const res = await fetch('/api/transparency/audit-ledger');
    const data = await res.json();
    if (!data.ledger || data.ledger.length === 0) {
      elements.auditLedgerList.innerHTML = `<div class="feed-item" style="text-align:center;">No audit records found.</div>`;
      return;
    }

    elements.auditLedgerList.innerHTML = data.ledger.map(entry => `
      <article class="feed-item" style="border-left: 4px solid var(--primary);">
        <div class="feed-header">
          <div>
            <span class="badge badge-info">BLOCK #${entry.index}</span>
            <strong style="margin-left: 0.5rem;">${escapeHtml(entry.action)}</strong>
          </div>
          <span class="feed-time">${formatRelativeTime(entry.timestamp)}</span>
        </div>
        <p class="feed-summary">${escapeHtml(entry.summary)}</p>
        <div style="font-family: monospace; font-size: 0.75rem; background: #f8fafc; padding: 0.4rem; border-radius: 4px; word-break: break-all; color: #475569;">
          <strong>SHA-256:</strong> ${entry.entryHash}<br>
          <strong>Prev Hash:</strong> ${entry.prevHash.slice(0, 32)}...
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error('Failed to load audit ledger:', err);
  }
}

// Concern Submission Handler
async function handleConcernSubmit(e) {
  e.preventDefault();
  const summary = elements.concernSummary.value.trim();
  if (!summary) {
    alert('Please describe the situation or choose a quick frontline tap.');
    return;
  }

  const payload = {
    sectorId: state.currentSectorId,
    categoryId: elements.concernCategory.value,
    facility: elements.concernFacility.value.trim() || 'Main Facility',
    shift: document.getElementById('concern-shift').value,
    urgency: document.getElementById('concern-urgency').value,
    summary
  };

  const submitBtn = document.getElementById('submit-concern-btn');
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text-label').textContent = 'Analyzing & Submitting...';

  try {
    const res = await fetch('/api/concerns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      elements.concernSummary.value = '';
      announce('Your team concern was recorded anonymously and clustered into the safety signals.');
      await refreshData();
      // Auto open Manager Signals tab or show feedback
      alert('Concern submitted anonymously!\nYour report has been aggregated into the manager safety signals using Google Cloud NLP risk analysis.');
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'Failed to submit'));
    }
  } catch (err) {
    alert('Network error submitting concern.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text-label').textContent = 'Submit Anonymously';
  }
}

// Modal Handlers
function openAssignModal(signalId) {
  const signal = state.signals.find(s => s.id === signalId);
  if (!signal) return;

  elements.modalSignalId.value = signal.id;
  elements.modalSignalMeta.innerHTML = `
    <strong>Signal:</strong> ${escapeHtml(signal.title)}<br>
    <strong>Risk Index:</strong> ${signal.riskScore}/100 &bull; Clustered Reports: ${signal.concernCount}
  `;
  document.getElementById('target-date').value = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
  elements.actionModal.hidden = false;
  document.getElementById('assignee-name').focus();
}

function openCloseLoopModal(signalId) {
  const signal = state.signals.find(s => s.id === signalId);
  if (!signal) return;

  elements.closeModalSignalId.value = signal.id;
  elements.closeModalSignalMeta.innerHTML = `
    <strong>Signal:</strong> ${escapeHtml(signal.title)}<br>
    <strong>Assigned Action:</strong> ${escapeHtml(signal.followUp?.actionPlan || 'Safety correction')}
  `;
  elements.closeLoopModal.hidden = false;
  document.getElementById('resolver-name').focus();
}

function closeModals() {
  elements.actionModal.hidden = true;
  elements.closeLoopModal.hidden = true;
}

async function handleFollowUpSubmit(e) {
  e.preventDefault();
  const signalId = elements.modalSignalId.value;
  const payload = {
    assignedTo: document.getElementById('assignee-name').value.trim(),
    targetDate: document.getElementById('target-date').value,
    actionPlan: document.getElementById('action-plan').value.trim(),
    preventiveMeasure: document.getElementById('preventive-measure').value.trim()
  };

  try {
    const res = await fetch(`/api/signals/${signalId}/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeModals();
      announce('Action assigned. Frontline transparency board updated.');
      await refreshData();
    }
  } catch (err) {
    console.error('Follow-up assignment error:', err);
  }
}

async function handleCloseLoopSubmit(e) {
  e.preventDefault();
  const signalId = elements.closeModalSignalId.value;
  const payload = {
    resolvedBy: document.getElementById('resolver-name').value.trim(),
    summary: document.getElementById('resolution-summary').value.trim(),
    transparencyNotice: document.getElementById('transparency-notice').value.trim()
  };

  try {
    const res = await fetch(`/api/signals/${signalId}/close-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeModals();
      announce('Safety loop closed. Verification opened to frontline workers.');
      await refreshData();
      switchTab('panel-transparency');
    }
  } catch (err) {
    console.error('Close loop error:', err);
  }
}

// Reset Demo Data
async function handleResetDemo() {
  if (!confirm('Reset all demo data and simulated hazards to initial baseline?')) return;
  try {
    await fetch('/api/demo/reset', { method: 'POST' });
    announce('Demo environment data reset.');
    await refreshData();
  } catch (err) {
    console.error('Reset error:', err);
  }
}

// Navigation & Tab Switching
function setupNavigation() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('aria-controls'));
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const tabList = Array.from(tabs);
        const currentIndex = tabList.indexOf(tab);
        const nextIndex = e.key === 'ArrowRight' 
          ? (currentIndex + 1) % tabList.length
          : (currentIndex - 1 + tabList.length) % tabList.length;
        tabList[nextIndex].focus();
        switchTab(tabList[nextIndex].getAttribute('aria-controls'));
      }
    });
  });
}

function switchTab(panelId) {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.workflow-panel');

  tabs.forEach(tab => {
    const isTarget = tab.getAttribute('aria-controls') === panelId;
    tab.classList.toggle('active', isTarget);
    tab.setAttribute('aria-selected', isTarget);
    tab.setAttribute('tabindex', isTarget ? '0' : '-1');
  });

  panels.forEach(panel => {
    panel.hidden = panel.id !== panelId;
    panel.classList.toggle('active', panel.id === panelId);
  });

  state.activeTab = panelId;
  announce(`Switched to tab: ${document.querySelector(`[aria-controls="${panelId}"]`).textContent.trim()}`);
}

function setupQuickTemplates() {
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.concernSummary.value = btn.dataset.template;
      elements.concernSummary.focus();
    });
  });
}

function setupModalDismissals() {
  elements.modalCloseBtn.addEventListener('click', closeModals);
  elements.cancelActionBtn.addEventListener('click', closeModals);
  document.getElementById('modal-backdrop').addEventListener('click', closeModals);

  elements.closeModalCloseBtn.addEventListener('click', closeModals);
  elements.closeCancelBtn.addEventListener('click', closeModals);
  document.getElementById('close-modal-backdrop').addEventListener('click', closeModals);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start
window.addEventListener('DOMContentLoaded', init);
