// TensorFlow.js Waste Image Scanner Model
/**
 * @fileoverview ReGenX BioScanner Engine
 * Real-time MobileNet AI-powered bio-waste contamination detection and scanning.
 * Phase 2 Upgrade: Optimized MobileNet inference scoring and visual boundary indicator overlays.
 * @author GSSoC Contributor
 */

window.BioScanner = (function () {

  // ── LOCAL API OBJECT (assigned to window.BioScanner at end) ─────────────────
  const api = {};

  // ── CONFIG ──────────────────────────────────────────────────────────────────

  // MobileNet classes that map to ORGANIC / biogas-acceptable waste
  const ORGANIC_KEYWORDS = [
    'banana', 'apple', 'orange', 'lemon', 'mango', 'strawberry', 'grape',
    'pear', 'watermelon', 'pineapple', 'peach', 'fig', 'pomegranate',
    'broccoli', 'cauliflower', 'carrot', 'cabbage', 'spinach', 'lettuce',
    'mushroom', 'potato', 'onion', 'pepper', 'cucumber', 'zucchini', 'squash',
    'eggplant', 'artichoke', 'leek', 'celery', 'asparagus', 'corn', 'pumpkin',
    'tomato', 'radish', 'turnip', 'beet', 'yam', 'sweet potato',
    'bread', 'bagel', 'pretzel', 'dough', 'bun', 'roll', 'naan',
    'rice', 'pasta', 'noodle', 'dumpling', 'waffle', 'pancake',
    'food', 'meal', 'dish', 'plate', 'bowl', 'salad', 'soup',
    'meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'cheese',
    'cake', 'cookie', 'muffin', 'brownie', 'donut', 'pastry',
    'leaf', 'leaves', 'grass', 'plant', 'flower', 'herb',
    'compost', 'organic', 'vegetable', 'fruit', 'garden'
  ];

  // MobileNet classes that are INORGANIC / NOT suitable for biogas
  const INORGANIC_KEYWORDS = [
    'bottle', 'plastic', 'bag', 'wrapper', 'container', 'cup', 'straw',
    'can', 'tin', 'foil', 'metal', 'steel', 'iron', 'aluminum',
    'glass', 'jar', 'window', 'mirror',
    'paper', 'cardboard', 'carton', 'book', 'magazine', 'newspaper',
    'box', 'package', 'packaging',
    'rubber', 'tire', 'hose', 'pipe', 'tube',
    'electronic', 'phone', 'laptop', 'computer', 'keyboard', 'mouse',
    'battery', 'cable', 'wire', 'circuit',
    'fabric', 'cloth', 'shirt', 'shoe', 'boot', 'sock',
    'wood', 'furniture', 'chair', 'table', 'shelf',
    'rock', 'stone', 'concrete', 'brick',
    'paint', 'tool', 'screw', 'nail', 'bolt',
    'medicine', 'pill', 'syringe', 'chemical',
    'person', 'face', 'hand', 'people', 'car', 'vehicle', 'building',
    'sky', 'water', 'road', 'wall', 'floor', 'ceiling'
  ];

  // ── STATE ────────────────────────────────────────────────────────────────────
  let _opts = {};
  let _stream = null;
  let _model = null;
  let _modelPromise = null;
  let _scanHistory = [];
  let _currentResult = null;

  // ── MODEL LOADING ─────────────────────────────────────────────────────────────
  async function loadModel() {
    if (_model) return _model;
    if (_modelPromise) {
      return _modelPromise;
    }

    _modelPromise = window.mobilenet.load()
      .then((model) => {
        _model = model;
        return model;
      })
      .catch((error) => {
        _model = null;
        throw error;
      })
      .finally(() => {
        _modelPromise = null;
      });

    return _modelPromise;
  }

  // ── CLASSIFICATION ENGINE ─────────────────────────────────────────────────────
  function classifyResult(predictions) {
    let organicScore = 0;
    let inorganicScore = 0;
    let topLabel = predictions[0]?.className?.toLowerCase() || '';
    let topConfidence = predictions[0]?.probability || 0;

    for (const pred of predictions) {
      const label = (pred.className || '').toLowerCase();
      const prob = pred.probability || 0;

      for (const kw of ORGANIC_KEYWORDS) {
        if (label.includes(kw)) { organicScore += prob * 100; break; }
      }
      for (const kw of INORGANIC_KEYWORDS) {
        if (label.includes(kw)) { inorganicScore += prob * 100; break; }
      }
    }

    const totalSignal = organicScore + inorganicScore;
    const organicPercent = totalSignal > 0 ? Math.round((organicScore / totalSignal) * 100) : 50;

    // Decision logic
    let accepted = false;
    let confidence = Math.round(topConfidence * 100);
    let reason = '';
    let wasteCategory = 'Unknown Waste Type';
    let recommendation = '';

    if (organicScore > inorganicScore && organicScore > 5) {
      accepted = true;
      confidence = Math.min(95, Math.round(organicScore * 1.8));
      wasteCategory = detectWasteCategory(topLabel);
      reason = 'Organic matter detected. Suitable for anaerobic digestion and biogas generation.';
      recommendation = 'Proceed with standard intake protocol. Estimate biogas yield: ' + estimateBiogas(confidence) + ' m³/tonne.';
    } else if (inorganicScore > organicScore && inorganicScore > 5) {
      accepted = false;
      confidence = Math.min(95, Math.round(inorganicScore * 1.8));
      wasteCategory = detectInorganicType(topLabel);
      reason = 'Non-biodegradable material identified. This waste stream cannot be processed in the biogas digester.';
      recommendation = 'Route to dry waste facility. Do not mix with organic feed stock.';
    } else {
      // Low confidence / ambiguous — mark invalid to be safe
      accepted = false;
      confidence = Math.round(topConfidence * 50);
      wasteCategory = 'Unclassified / Mixed Waste';
      reason = 'Unable to confidently identify organic content. Mixed or contaminated waste detected.';
      recommendation = 'Manual inspection required before acceptance. Do not process without verification.';
    }

    return {
      accepted,
      confidence,
      organicPercent,
      wasteCategory,
      reason,
      recommendation,
      topLabel: predictions[0]?.className || 'N/A',
      allPredictions: predictions.slice(0, 3)
    };
  }

  function detectWasteCategory(label) {
    if (/fruit|apple|banana|mango|orange|berry|grape|melon|peach|pear/.test(label)) return 'Fruit Waste';
    if (/vegetable|broccoli|carrot|cabbage|lettuce|spinach|onion|potato|pepper/.test(label)) return 'Vegetable Scraps';
    if (/bread|rice|pasta|noodle|dough|cereal|grain|flour/.test(label)) return 'Cooked / Grain Waste';
    if (/meat|chicken|beef|pork|fish|egg/.test(label)) return 'Protein / Kitchen Waste';
    if (/leaf|leaves|grass|plant|flower|herb|garden/.test(label)) return 'Garden / Green Waste';
    if (/food|meal|dish|plate|bowl|salad|soup/.test(label)) return 'Mixed Kitchen Waste';
    return 'Organic Biomass';
  }

  function detectInorganicType(label) {
    if (/plastic|bottle|bag|wrapper|container/.test(label)) return 'Plastic Waste';
    if (/metal|can|tin|steel|iron|aluminum|foil/.test(label)) return 'Metal / Non-Ferrous';
    if (/glass|jar|bottle/.test(label)) return 'Glass Waste';
    if (/paper|cardboard|carton|box/.test(label)) return 'Paper / Cardboard';
    if (/electronic|phone|laptop|battery|cable/.test(label)) return 'E-Waste';
    if (/fabric|cloth|shirt|shoe/.test(label)) return 'Textile Waste';
    if (/wood|furniture/.test(label)) return 'Wood / Inert Material';
    return 'Non-Biodegradable Waste';
  }

  function estimateBiogas(confidence) {
    const base = 180 + Math.round((confidence / 100) * 120);
    return base + '–' + (base + 60);
  }

  // ── CAMERA ───────────────────────────────────────────────────────────────────
  async function startCamera() {
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const video = document.getElementById('bio-video');
      if (video) { video.srcObject = _stream; video.play(); }
      return true;
    } catch (e) {
      return false;
    }
  }

  function stopCamera() {
    if (_stream) {
      _stream.getTracks().forEach(t => t.stop());
      _stream = null;
    }
  }

  // ── SCAN ─────────────────────────────────────────────────────────────────────
  async function performScan(imageSource) {
    setUiState('scanning');

    try {
      const model = await loadModel();
      if (!model) throw new Error('Model unavailable');

      const preds = await model.classify(imageSource);
      const result = classifyResult(preds);
      _currentResult = result;

      // Save to history
      const record = {
        id: Date.now().toString(36),
        ts: Date.now(),
        userId: _opts.userId,
        userOrg: _opts.userOrg,
        result
      };
      _scanHistory.unshift(record);

      if (_opts.onScanSaved) _opts.onScanSaved(record);

      renderResult(result);
    } catch (err) {
      renderError('Scan failed: ' + err.message);
    }
  }

  // ── UI STATES ─────────────────────────────────────────────────────────────────
  function setUiState(state) {
    const container = document.getElementById('bio-scanner-container');
    if (!container) return;

    ['bs-idle', 'bs-scanning', 'bs-result'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const target = document.getElementById('bs-' + state);
    if (target) target.style.display = 'flex';
  }

  function renderResult(result) {
    const resultDiv = document.getElementById('bs-result');
    if (!resultDiv) return;

    const accepted = result.accepted;
    const color = accepted ? '#10b981' : '#ef4444';
    const bgColor = accepted ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
    const icon = accepted ? '✅' : '❌';
    const statusText = accepted ? 'ACCEPTED FOR BIOGAS PROCESSING' : 'REJECTED — INVALID WASTE TYPE';

    resultDiv.style.display = 'flex';
    resultDiv.innerHTML = `
      <div class="bs-result-inner" style="width:100%; display:flex; flex-direction:column; gap:16px;">

        <!-- Status Banner -->
        <div style="
          background:${bgColor};
          border:2px solid ${color};
          border-radius:16px;
          padding:20px;
          text-align:center;
          position:relative;
          overflow:hidden;
        ">
          <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,${color}22,transparent 60%);pointer-events:none;"></div>
          <div style="font-size:36px; margin-bottom:8px; animation: bs-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);">${icon}</div>
          <div style="font-size:13px; font-weight:800; letter-spacing:2px; color:${color}; text-transform:uppercase; margin-bottom:4px;">${statusText}</div>
          <div style="font-size:22px; font-weight:700; margin-bottom:2px;">${result.wasteCategory}</div>
          <div style="font-size:12px; color:var(--text-muted);">AI Confidence: <strong style="color:${color}">${result.confidence}%</strong> &nbsp;·&nbsp; Organic Content: <strong>${result.organicPercent}%</strong></div>
        </div>

        <!-- Organic Bar -->
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Organic Content Meter</div>
            <div style="font-size:13px; font-weight:700; color:${color}">${result.organicPercent}%</div>
          </div>
          <div style="width:100%; height:10px; background:var(--border); border-radius:999px; overflow:hidden;">
            <div style="
              height:100%;
              width:${result.organicPercent}%;
              background:linear-gradient(90deg, ${accepted ? '#10b981' : '#f59e0b'}, ${accepted ? '#34d399' : '#ef4444'});
              border-radius:999px;
              transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1);
            "></div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:10px; color:var(--text-muted);">
            <span>0% — Inorganic</span><span style="color:#f59e0b;">50% — Borderline</span><span>100% — Pure Organic</span>
          </div>
        </div>

        <!-- Analysis Details -->
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:2px;">AI Analysis</div>
          <div style="font-size:13px; line-height:1.6;"><strong>Assessment:</strong> ${result.reason}</div>
          <div style="
            background:${bgColor};
            border:1px solid ${color}44;
            border-radius:8px;
            padding:12px;
            font-size:13px;
            line-height:1.6;
          "><strong>Recommendation:</strong> ${result.recommendation}</div>
        </div>

        <!-- Raw Predictions -->
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">Top Model Predictions</div>
          ${result.allPredictions.map((p, i) => `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:${i < 2 ? '8px' : '0'};">
              <div style="font-size:12px; min-width:20px; color:var(--text-muted);">#${i+1}</div>
              <div style="font-size:12px; flex:1; font-weight:500;">${p.className?.split(',')[0] || '—'}</div>
              <div style="font-size:12px; font-weight:700; color:var(--text-muted);">${Math.round((p.probability||0)*100)}%</div>
              <div style="width:60px; height:5px; background:var(--border); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${Math.round((p.probability||0)*100)}%; background:var(--green); border-radius:3px;"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${accepted ? `
            <button class="btn btn-primary" style="flex:1;" onclick="BioScanner._applyResult()">
              Apply to Dispatch Form →
            </button>
          ` : ''}
          <button class="btn btn-ghost" style="flex:${accepted ? '0' : '1'}; min-width:120px;" onclick="BioScanner._rescan()">
            🔄 Scan Again
          </button>
          <button class="btn btn-ghost" style="min-width:80px;" onclick="BioScanner._back()">
            ← Back
          </button>
        </div>
      </div>
    `;
  }

  function renderError(msg) {
    const resultDiv = document.getElementById('bs-result');
    if (!resultDiv) return;
    resultDiv.style.display = 'flex';
    resultDiv.innerHTML = `
      <div style="text-align:center; padding:32px;">
        <div style="font-size:40px; margin-bottom:12px;">⚠️</div>
        <div style="font-size:16px; font-weight:700; margin-bottom:8px; color:var(--red)">Scan Error</div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:24px;">${msg}</div>
        <button class="btn btn-primary" onclick="BioScanner._rescan()">Try Again</button>
      </div>
    `;
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────────
  function renderScanner() {
    const container = document.getElementById(_opts.containerId);
    if (!container) return;

    container.innerHTML = `
      <style>
        @keyframes bs-pop { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
        @keyframes bs-pulse-ring { 0% { transform:scale(1); opacity:1; } 100% { transform:scale(1.5); opacity:0; } }
        @keyframes bs-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes bs-scan-line {
          0% { top: 0%; opacity:1; }
          90% { top: 90%; opacity:1; }
          100% { top: 90%; opacity:0; }
        }
        #bio-scanner-container * { box-sizing:border-box; }
        #bio-scanner-container .bs-btn {
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:12px 20px; border-radius:10px; font-weight:700;
          cursor:pointer; border:none; font-size:14px; transition:all 0.2s;
        }
        #bio-scanner-container .bs-btn:active { transform:scale(0.97); }
        .bs-scan-overlay {
          position:absolute; inset:0; border-radius:12px; pointer-events:none; overflow:hidden;
        }
        .bs-scan-line {
          position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg, transparent, #10b981, #34d399, #10b981, transparent);
          box-shadow:0 0 12px #10b981, 0 0 24px #10b981;
          animation:bs-scan-line 2.5s ease-in-out infinite;
        }
        .bs-corner {
          position:absolute; width:20px; height:20px;
          border-color:#10b981; border-style:solid; border-width:0;
        }
        .bs-corner.tl { top:8px; left:8px; border-top-width:3px; border-left-width:3px; border-top-left-radius:4px; }
        .bs-corner.tr { top:8px; right:8px; border-top-width:3px; border-right-width:3px; border-top-right-radius:4px; }
        .bs-corner.bl { bottom:8px; left:8px; border-bottom-width:3px; border-left-width:3px; border-bottom-left-radius:4px; }
        .bs-corner.br { bottom:8px; right:8px; border-bottom-width:3px; border-right-width:3px; border-bottom-right-radius:4px; }
      </style>

      <div id="bio-scanner-container" style="
        width:100%; display:flex; flex-direction:column;
        gap:0; font-family:var(--font-body,'Inter',sans-serif);
        min-height:400px;
      ">
        <!-- Header -->
        <div style="
          display:flex; align-items:center; gap:12px;
          padding:16px 20px; border-bottom:1px solid var(--border);
        ">
          <button onclick="BioScanner._back()" style="
            background:var(--surface); border:1px solid var(--border); border-radius:8px;
            padding:6px 12px; cursor:pointer; font-size:14px; font-weight:600; color:var(--text);
          ">← Back</button>
          <div>
            <div style="font-weight:700; font-size:16px;">🔬 BioScan AI</div>
            <div style="font-size:11px; color:var(--text-muted);">Organic waste verification engine</div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
            <div style="width:8px; height:8px; background:#10b981; border-radius:50%; animation:bs-pulse-ring 1.5s infinite;"></div>
            <div style="font-size:11px; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:1px;">Live</div>
          </div>
        </div>

        <!-- Idle State: Camera + Upload -->
        <div id="bs-idle" style="
          display:flex; flex-direction:column; align-items:center; gap:20px;
          padding:24px 20px;
        ">
          <!-- Video Preview -->
          <div style="position:relative; width:100%; max-width:480px; border-radius:16px; overflow:hidden; background:#000;">
            <video id="bio-video" autoplay muted playsinline
              style="width:100%; height:240px; object-fit:cover; display:block; border-radius:16px;"
            ></video>
            <!-- Scan overlay while idle -->
            <div class="bs-scan-overlay">
              <div class="bs-scan-line"></div>
              <div class="bs-corner tl"></div>
              <div class="bs-corner tr"></div>
              <div class="bs-corner bl"></div>
              <div class="bs-corner br"></div>
            </div>
            <!-- Camera init overlay -->
            <div id="bs-cam-init" style="
              position:absolute; inset:0; display:flex; flex-direction:column;
              align-items:center; justify-content:center; background:rgba(0,0,0,0.75);
              border-radius:16px; gap:10px;
            ">
              <div style="font-size:32px;">📷</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.8); text-align:center; padding:0 20px;">
                Camera initializing...<br>Allow access when prompted.
              </div>
            </div>
          </div>

          <!-- Capture Button -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; max-width:480px;">
            <button id="bs-capture-btn" class="bs-btn" onclick="BioScanner._captureFromCamera()" style="
              width:100%; padding:16px; background:linear-gradient(135deg,#0d9488,#10b981);
              color:white; border-radius:14px; font-size:16px; font-weight:800;
              box-shadow:0 8px 24px rgba(13,148,136,0.35);
              letter-spacing:0.5px;
            ">
              🔬 Scan Waste Now
            </button>

            <div style="display:flex; align-items:center; gap:12px; width:100%;">
              <div style="flex:1; height:1px; background:var(--border);"></div>
              <span style="font-size:12px; color:var(--text-muted); font-weight:600;">OR</span>
              <div style="flex:1; height:1px; background:var(--border);"></div>
            </div>

            <button class="bs-btn" onclick="document.getElementById('file-input').click()" style="
              width:100%; background:var(--surface); border:2px dashed var(--border);
              color:var(--text); border-radius:14px; font-size:14px;
            ">
              📁 Upload Waste Image
            </button>
          </div>

          <!-- Info chips -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; max-width:480px;">
            <div style="padding:5px 10px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:20px; font-size:11px; font-weight:600; color:#10b981;">✓ Fruit & Vegetables</div>
            <div style="padding:5px 10px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:20px; font-size:11px; font-weight:600; color:#10b981;">✓ Kitchen Scraps</div>
            <div style="padding:5px 10px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:20px; font-size:11px; font-weight:600; color:#10b981;">✓ Garden Waste</div>
            <div style="padding:5px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:20px; font-size:11px; font-weight:600; color:#ef4444;">✗ Plastic / Metal</div>
            <div style="padding:5px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:20px; font-size:11px; font-weight:600; color:#ef4444;">✗ E-Waste</div>
            <div style="padding:5px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:20px; font-size:11px; font-weight:600; color:#ef4444;">✗ Glass / Cloth</div>
          </div>
        </div>

        <!-- Scanning State -->
        <div id="bs-scanning" style="
          display:none; flex-direction:column; align-items:center; justify-content:center;
          padding:60px 24px; gap:24px; min-height:340px;
        ">
          <div style="position:relative; width:80px; height:80px;">
            <div style="
              position:absolute; inset:0;
              border-radius:50%; border:3px solid var(--border);
            "></div>
            <div style="
              position:absolute; inset:0;
              border-radius:50%; border:3px solid transparent;
              border-top-color:#10b981; border-right-color:#10b981;
              animation:bs-spin 1s linear infinite;
            "></div>
            <div style="
              position:absolute; inset:12px;
              border-radius:50%; border:2px solid transparent;
              border-top-color:#0d9488;
              animation:bs-spin 0.7s linear infinite reverse;
            "></div>
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:20px;">🔬</div>
          </div>

          <div style="text-align:center;">
            <div style="font-size:16px; font-weight:700; margin-bottom:6px;">Analyzing Waste Composition...</div>
            <div style="font-size:13px; color:var(--text-muted);" id="bs-scan-status">Loading AI model...</div>
          </div>

          <div style="width:100%; max-width:320px; height:4px; background:var(--border); border-radius:2px; overflow:hidden;">
            <div id="bs-progress-bar" style="
              height:100%; width:0%; border-radius:2px;
              background:linear-gradient(90deg,#0d9488,#10b981);
              transition:width 0.4s;
            "></div>
          </div>

          <div style="
            display:flex; gap:20px; font-size:12px; color:var(--text-muted);
          ">
            <div id="bs-step-1" style="display:flex; align-items:center; gap:4px; opacity:0.4;">
              <span>📷</span><span>Capture</span>
            </div>
            <div id="bs-step-2" style="display:flex; align-items:center; gap:4px; opacity:0.4;">
              <span>🧠</span><span>Classify</span>
            </div>
            <div id="bs-step-3" style="display:flex; align-items:center; gap:4px; opacity:0.4;">
              <span>⚗️</span><span>Assess</span>
            </div>
          </div>
        </div>

        <!-- Result State (filled by JS) -->
        <div id="bs-result" style="
          display:none; flex-direction:column;
          padding:20px; gap:16px; overflow-y:auto; max-height:70vh;
        ">
        </div>

      </div>
    `;

    // Start camera automatically
    startCamera().then(ok => {
      const overlay = document.getElementById('bs-cam-init');
      if (overlay && ok) overlay.style.display = 'none';
    });

    // Pre-load AI model silently
    loadModel().catch(() => null);
  }

  // ── CAPTURE FROM CAMERA ───────────────────────────────────────────────────────
  api._captureFromCamera = async function () {
    const video = document.getElementById('bio-video');
    if (!video || !video.srcObject) {
      // Fallback to file upload if no camera
      document.getElementById('file-input').click();
      return;
    }

    setUiState('scanning');
    animateScanProgress();

    // Draw video frame to canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    await performScan(canvas);
  };

  // ── FILE UPLOAD HANDLER ───────────────────────────────────────────────────────
  api.handleFileUpload = async function (event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    setUiState('scanning');
    animateScanProgress();

    const img = new Image();
    img.onload = () => performScan(img);
    img.src = URL.createObjectURL(file);
  };

  // ── PROGRESS ANIMATION ────────────────────────────────────────────────────────
  function animateScanProgress() {
    const bar = document.getElementById('bs-progress-bar');
    const status = document.getElementById('bs-scan-status');
    const steps = ['bs-step-1', 'bs-step-2', 'bs-step-3'];
    const msgs = ['Preprocessing image...', 'Running neural inference...', 'Assessing biogas compatibility...'];

    steps.forEach(s => { const el = document.getElementById(s); if (el) el.style.opacity = '0.4'; });

    let prog = 0;
    const phases = [
      { pct: 30, msg: msgs[0], step: 0, delay: 0 },
      { pct: 65, msg: msgs[1], step: 1, delay: 600 },
      { pct: 90, msg: msgs[2], step: 2, delay: 1300 },
    ];

    phases.forEach(p => {
      setTimeout(() => {
        if (bar) bar.style.width = p.pct + '%';
        if (status) status.textContent = p.msg;
        const s = document.getElementById(steps[p.step]);
        if (s) s.style.opacity = '1';
      }, p.delay);
    });
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────────
  api._applyResult = function () {
    if (_currentResult && _opts.onApply) {
      _opts.onApply(_currentResult.confidence, _currentResult.organicPercent);
    }
  };

  api._rescan = function () {
    _currentResult = null;
    setUiState('idle');
    // Restart camera if needed
    if (!_stream) startCamera().then(ok => {
      const overlay = document.getElementById('bs-cam-init');
      if (overlay && ok) overlay.style.display = 'none';
    });
  };

  api._back = function () {
    stopCamera();
    if (_opts.onBack) _opts.onBack();
  };

  // ── PUBLIC OPEN ───────────────────────────────────────────────────────────────
  api.open = function (opts) {
    _opts = opts || {};
    _currentResult = null;
    renderScanner();
    setUiState('idle');
  };

  api.stop = function () {
    stopCamera();
  };

  return api;

})();

// Phase 2 Task 9: MobileNet video canvas overlay bounding frames active
