/**
 * @fileoverview ReGenX Smart Accessibility & Ease-of-Use Manager
 * Dynamically injects a floating glassmorphic accessibility panel.
 * Provides Text-to-Speech (TTS), font zooming, WCAG high contrast, dyslexic font, and motion reduction.
 * @author GSSoC Contributor
 */

export const AccessibilityManager = {
    // Current state configuration
    state: {
        ttsEnabled: false,
        fontScale: 1.0,
        highContrast: false,
        dyslexicFont: false,
        reduceMotion: false
    },

    // Speech synthesis reference
    utterance: null,

    /**
     * Initializes the Accessibility Manager. Injects UI and loads settings from localStorage.
     */
    init: () => {
        AccessibilityManager.loadSettings();
        AccessibilityManager.injectUI();
        AccessibilityManager.applyAllSettings();
        AccessibilityManager.setupTTSListeners();
    },

    /**
     * Loads saved accessibility settings from localStorage.
     */
    loadSettings: () => {
        try {
            const saved = window.localStorage.getItem('regenx-accessibility');
            if (saved) {
                const parsed = JSON.parse(saved);
                const validated = {};
                if (parsed && typeof parsed === 'object') {
                    if (typeof parsed.ttsEnabled === 'boolean') validated.ttsEnabled = parsed.ttsEnabled;
                    if (typeof parsed.highContrast === 'boolean') validated.highContrast = parsed.highContrast;
                    if (typeof parsed.dyslexicFont === 'boolean') validated.dyslexicFont = parsed.dyslexicFont;
                    if (typeof parsed.reduceMotion === 'boolean') validated.reduceMotion = parsed.reduceMotion;
                    if (typeof parsed.fontScale === 'number' && !isNaN(parsed.fontScale)) {
                        validated.fontScale = Math.max(0.8, Math.min(1.5, parsed.fontScale));
                    }
                }
                AccessibilityManager.state = { ...AccessibilityManager.state, ...validated };
            }
        } catch (e) {
            console.error('Failed to load accessibility settings:', e);
        }
    },

    /**
     * Persists current settings in localStorage.
     */
    saveSettings: () => {
        try {
            window.localStorage.setItem('regenx-accessibility', JSON.stringify(AccessibilityManager.state));
        } catch (e) {
            // Ignore write errors
        }
    },

    /**
     * Injects the accessibility trigger button and control panel markup into the document body.
     * @returns {void}
     */
    injectUI: () => {
        // Accessibility Trigger Button
        const trigger = document.createElement('button');
        trigger.id = 'acc-trigger-btn';
        trigger.className = 'accessibility-trigger';
        trigger.setAttribute('aria-label', 'Accessibility Controls');
        trigger.setAttribute('title', 'Accessibility Controls');
        trigger.innerHTML = '♿';
        trigger.onclick = AccessibilityManager.togglePanel;
        document.body.appendChild(trigger);

        // Control Panel Modal Container
        const panel = document.createElement('div');
        panel.id = 'acc-control-panel';
        panel.className = 'accessibility-panel glass-card';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="acc-panel-header">
                <div class="acc-panel-title">♿ Accessibility Controls</div>
                <button class="acc-close-btn" onclick="window.AccessibilityManager.togglePanel()">×</button>
            </div>
            <div class="acc-panel-body">
                <!-- Text To Speech Toggle -->
                <div class="acc-control-row">
                    <div class="acc-control-info">
                        <div class="acc-control-label">🔊 Text-to-Speech Reader</div>
                        <div class="acc-control-desc">Speak text on hover/focus</div>
                    </div>
                    <label class="acc-switch">
                        <input type="checkbox" id="acc-toggle-tts" onchange="window.AccessibilityManager.toggleTTS(this.checked)">
                        <span class="acc-slider"></span>
                    </label>
                </div>

                <!-- Dyslexic Friendly Font Toggle -->
                <div class="acc-control-row">
                    <div class="acc-control-info">
                        <div class="acc-control-label">📖 Dyslexic Friendly Font</div>
                        <div class="acc-control-desc">Use readable weighted type</div>
                    </div>
                    <label class="acc-switch">
                        <input type="checkbox" id="acc-toggle-dyslexic" onchange="window.AccessibilityManager.toggleDyslexic(this.checked)">
                        <span class="acc-slider"></span>
                    </label>
                </div>

                <!-- High Contrast Toggle -->
                <div class="acc-control-row">
                    <div class="acc-control-info">
                        <div class="acc-control-label">🌗 WCAG High Contrast</div>
                        <div class="acc-control-desc">Maximum contrast elements</div>
                    </div>
                    <label class="acc-switch">
                        <input type="checkbox" id="acc-toggle-contrast" onchange="window.AccessibilityManager.toggleContrast(this.checked)">
                        <span class="acc-slider"></span>
                    </label>
                </div>

                <!-- Reduce Motion Toggle -->
                <div class="acc-control-row">
                    <div class="acc-control-info">
                        <div class="acc-control-label">🚫 Reduce Motion</div>
                        <div class="acc-control-desc">Disable layout transitions</div>
                    </div>
                    <label class="acc-switch">
                        <input type="checkbox" id="acc-toggle-motion" onchange="window.AccessibilityManager.toggleMotion(this.checked)">
                        <span class="acc-slider"></span>
                    </label>
                </div>

                <!-- Font Zoom Control -->
                <div class="acc-control-zoom">
                    <div class="acc-control-label">🔍 Font Zoom Scaling</div>
                    <div class="acc-zoom-actions">
                        <button class="acc-zoom-btn" onclick="window.AccessibilityManager.changeFontScale(-0.1)">A-</button>
                        <span class="acc-zoom-indicator" id="acc-zoom-val">100%</span>
                        <button class="acc-zoom-btn" onclick="window.AccessibilityManager.changeFontScale(0.1)">A+</button>
                        <button class="acc-zoom-btn reset" onclick="window.AccessibilityManager.resetFontScale()">Reset</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    },

    /**
     * Toggles the visibility of the control panel with a smooth entry.
     */
    togglePanel: () => {
        const panel = document.getElementById('acc-control-panel');
        if (!panel) return;
        
        const isHidden = panel.style.display === 'none';
        if (isHidden) {
            panel.style.display = 'flex';
            // Sync checkbox values to current state
            document.getElementById('acc-toggle-tts').checked = AccessibilityManager.state.ttsEnabled;
            document.getElementById('acc-toggle-dyslexic').checked = AccessibilityManager.state.dyslexicFont;
            document.getElementById('acc-toggle-contrast').checked = AccessibilityManager.state.highContrast;
            document.getElementById('acc-toggle-motion').checked = AccessibilityManager.state.reduceMotion;
            document.getElementById('acc-zoom-val').textContent = Math.round(AccessibilityManager.state.fontScale * 100) + '%';
            
            if (window.gsap && !AccessibilityManager.state.reduceMotion) {
                gsap.fromTo(panel, { opacity: 0, scale: 0.9, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' });
            }
        } else {
            if (window.gsap && !AccessibilityManager.state.reduceMotion) {
                gsap.to(panel, { opacity: 0, scale: 0.9, y: 20, duration: 0.25, onComplete: () => { panel.style.display = 'none'; } });
            } else {
                panel.style.display = 'none';
            }
        }
    },

    /**
     * Applies all settings from the state variables to the DOM.
     */
    applyAllSettings: () => {
        AccessibilityManager.toggleTTS(AccessibilityManager.state.ttsEnabled, false);
        AccessibilityManager.toggleDyslexic(AccessibilityManager.state.dyslexicFont, false);
        AccessibilityManager.toggleContrast(AccessibilityManager.state.highContrast, false);
        AccessibilityManager.toggleMotion(AccessibilityManager.state.reduceMotion, false);
        AccessibilityManager.applyFontScale();
    },

    /**
     * Toggles the Text-to-Speech (TTS) feature.
     * @param {boolean} enabled - Whether TTS is enabled.
     * @param {boolean} [save=true] - Whether to save settings to localStorage.
     */
    toggleTTS: (enabled, save = true) => {
        AccessibilityManager.state.ttsEnabled = enabled;
        if (save) {
            AccessibilityManager.saveSettings();
            if (enabled) {
                AccessibilityManager.speak('Text to Speech active. Hover over elements to hear them.');
            } else {
                AccessibilityManager.stopSpeaking();
            }
        }
    },

    /**
     * Toggles the Dyslexic friendly font.
     * @param {boolean} enabled - Whether Dyslexic font is active.
     * @param {boolean} [save=true] - Whether to save settings to localStorage.
     */
    toggleDyslexic: (enabled, save = true) => {
        AccessibilityManager.state.dyslexicFont = enabled;
        document.documentElement.classList.toggle('font-dyslexic', enabled);
        if (save) AccessibilityManager.saveSettings();
    },

    /**
     * Toggles the High Contrast theme.
     * @param {boolean} enabled - Whether High Contrast theme is active.
     * @param {boolean} [save=true] - Whether to save settings to localStorage.
     */
    toggleContrast: (enabled, save = true) => {
        AccessibilityManager.state.highContrast = enabled;
        document.documentElement.classList.toggle('high-contrast-mode', enabled);
        if (save) AccessibilityManager.saveSettings();
    },

    /**
     * Toggles layout motion reduction.
     * @param {boolean} enabled - Whether motion reduction is active.
     * @param {boolean} [save=true] - Whether to save settings to localStorage.
     */
    toggleMotion: (enabled, save = true) => {
        AccessibilityManager.state.reduceMotion = enabled;
        document.documentElement.classList.toggle('reduce-motion', enabled);
        if (save) AccessibilityManager.saveSettings();
    },

    /**
     * Scales the font size.
     * @param {number} delta - Scale change (+0.1 or -0.1).
     */
    /**
     * Adjusts the global font scale by the given delta value.
     * The resulting scale is clamped to the valid range [0.8, 1.5].
     * @param {number} delta - Amount to add to the current scale (e.g. 0.1 to increase, -0.1 to decrease).
     * @returns {void}
     */
    changeFontScale: (delta) => {
        const next = Math.max(0.8, Math.min(1.5, AccessibilityManager.state.fontScale + delta));
        AccessibilityManager.state.fontScale = parseFloat(next.toFixed(1));
        AccessibilityManager.applyFontScale();
        AccessibilityManager.saveSettings();
    },

    /**
     * Resets the font size scaling to 100%.
     */
    resetFontScale: () => {
        AccessibilityManager.state.fontScale = 1.0;
        AccessibilityManager.applyFontScale();
        AccessibilityManager.saveSettings();
    },

    /**
     * Applies the font scaling factor as a CSS variable on html.
     */
    applyFontScale: () => {
        const safeScale = Math.max(0.8, Math.min(1.5, AccessibilityManager.state.fontScale || 1.0));
        document.documentElement.style.setProperty('--font-scale', safeScale);
        const indicator = document.getElementById('acc-zoom-val');
        if (indicator) {
            indicator.textContent = Math.round(safeScale * 100) + '%';
        }
    },

    /**
     * Speaks the given text using the speech synthesis API.
     * @param {string} text - The text to read out.
     * @param {number} [rate=1.0] - The speech rate scaling factor.
     */
    /**
     * Speaks the given text aloud using the Web Speech API.
     * Silently no-ops when TTS is disabled or the browser lacks SpeechSynthesis support.
     * @param {string} text - The text string to synthesise.
     * @param {number} [rate=1.0] - Speech rate multiplier (0.1 to 10, default 1.0).
     * @returns {void}
     */
    speak: (text, rate = 1.0) => {
        if (!window.speechSynthesis) return;
        AccessibilityManager.stopSpeaking();

        AccessibilityManager.utterance = new SpeechSynthesisUtterance(text);
        AccessibilityManager.utterance.rate = rate;
        window.speechSynthesis.speak(AccessibilityManager.utterance);
    },

    /**
     * Stops any currently active speech synthesis.
     */
    stopSpeaking: () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    },

    /**
     * Registers hover and focus event listeners to read elements.
     */
    setupTTSListeners: () => {
        const handleSpeakEvent = (e) => {
            if (!AccessibilityManager.state.ttsEnabled) return;
            const target = e.target;
            
            // Check if element has readable significance
            const isClickable = target.closest('button') || target.closest('a') || target.closest('.nav-item');
            const isTextHolder = target.closest('h1') || target.closest('h2') || target.closest('h3') || target.closest('.metric-title') || target.closest('.metric-hero-value') || target.closest('.compliance-title') || target.closest('.toast') || target.closest('.ticker-content');
            
            if (isClickable || isTextHolder) {
                const element = isClickable || isTextHolder;
                // Exclude reading parent containers repeatedly
                if (e.target !== element && !isTextHolder) return;

                const textToRead = element.innerText || element.getAttribute('aria-label') || element.getAttribute('title');
                if (textToRead && textToRead.trim().length > 0) {
                    // Prevent repeated speaking of the same string on rapid events
                    if (AccessibilityManager._lastSpoken === textToRead) return;
                    AccessibilityManager._lastSpoken = textToRead;
                    
                    AccessibilityManager.speak(textToRead);
                    
                    // Clear duplicate preventer after a short timeout
                    setTimeout(() => {
                        AccessibilityManager._lastSpoken = null;
                    }, 1000);
                }
            }
        };

        // Listen for mouse hover and focus events
        document.addEventListener('mouseover', handleSpeakEvent);
        document.addEventListener('focusin', handleSpeakEvent);
    }
};

window.AccessibilityManager = AccessibilityManager;
