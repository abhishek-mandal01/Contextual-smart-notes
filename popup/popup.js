// popup/popup.js
document.addEventListener('DOMContentLoaded', () => {
    // --- UI Element References ---
    const sourceTextarea = document.getElementById('source-text');
    const outputArea = document.getElementById('output-area');
    const summarizeBtn = document.getElementById('summarize-btn');
    const rewriteBtn = document.getElementById('rewrite-btn');
    const rewriteStreamBtn = document.getElementById('rewrite-stream-btn');
    const translateBtn = document.getElementById('translate-btn');
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    const summType = document.getElementById('summ-type');
    const summFormat = document.getElementById('summ-format');
    const summLength = document.getElementById('summ-length');
    const showRendered = document.getElementById('show-rendered');
    const mockModeCheckbox = document.getElementById('mock-mode');
    const renderedOutput = document.getElementById('rendered-output');
    // Prompt (LanguageModel) UI
    const promptTextarea = document.getElementById('prompt-text');
    const promptTemp = document.getElementById('prompt-temp');
    const promptTopK = document.getElementById('prompt-topk');
    const promptRunBtn = document.getElementById('prompt-run-btn');
    const promptStreamBtn = document.getElementById('prompt-stream-btn');
    // Session control elements
    const sessionCreateBtn = document.getElementById('session-create-btn');
    const sessionCloneBtn = document.getElementById('session-clone-btn');
    const sessionAbortBtn = document.getElementById('session-abort-btn');
    const sessionDestroyBtn = document.getElementById('session-destroy-btn');
    const sessionStatus = document.getElementById('session-status');
    // Proofreader UI
    const proofLang = document.getElementById('proof-lang');
    const proofreadBtn = document.getElementById('proofread-btn');
    const proofResults = document.getElementById('proof-results');
    const correctionsList = document.getElementById('corrections-list');
    const correctedTextDiv = document.getElementById('corrected-text');
    // Writer UI elements
    const writerTone = document.getElementById('writer-tone');
    const writerFormat = document.getElementById('writer-format');
    const writerLength = document.getElementById('writer-length');
    const writerRunBtn = document.getElementById('writer-run-btn');
    const writerStreamBtn = document.getElementById('writer-stream-btn');
    // Toast element (create one if missing)
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    // --- Utility Functions ---

    /**
     * Toggles the UI state based on whether an AI operation is running.
     * @param {boolean} isLoading 
     */
    function setUILoading(isLoading) {
        // Disable action buttons while processing
        const hasText = sourceTextarea.value.length > 0;
        summarizeBtn.disabled = isLoading || !hasText;
        rewriteBtn.disabled = isLoading || !hasText;
    if (translateBtn) translateBtn.disabled = isLoading || !hasText;
    if (proofreadBtn) proofreadBtn.disabled = isLoading || !hasText;
        
        // Show/hide the spinning indicator
        loadingIndicator.classList.toggle('hidden', !isLoading);
        
        // Clear output only when starting a new operation
        if (isLoading) {
             outputArea.value = "";
            if (loadingText) loadingText.textContent = 'Processing...';
        }
    }

    // Toast helper
    function showToast(message, type = 'default', ms = 2200) {
        try {
            toast.textContent = message;
            toast.className = `toast show ${type}`;
            setTimeout(() => {
                toast.className = 'toast';
            }, ms);
        } catch (e) { console.warn('toast error', e); }
    }

    /**
     * Resets output area and disables save button when input changes or on load.
     */
    function resetOutputState() {
        outputArea.value = "";
        outputArea.placeholder = "AI generated content will appear here...";
        saveNoteBtn.disabled = true;
        if (renderedOutput) { renderedOutput.innerHTML = ''; renderedOutput.classList.add('hidden'); }
    }

    // --- Core AI Function: Summarizer API (MVP - Phase 1) ---

    async function handleSummarize() {
        const sourceText = sourceTextarea.value.trim();
        if (!sourceText) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = "Summarizing content using Summarizer API...";
        try {
            try { console.log('popup: starting summarization for text length', sourceText.length); } catch (e) { }

            // Feature detection: prefer the platform Summarizer API, fallback to mock
            const summarizerAPI = (typeof Summarizer !== 'undefined') ? Summarizer : (typeof window !== 'undefined' && window.Summarizer) ? window.Summarizer : (typeof window !== 'undefined' && window.SummarizerMock) ? window.SummarizerMock : null;
            if (!summarizerAPI) {
                // No summarizer API available; fall back to local mock behavior
                try { console.log('popup: Summarizer API not found, using simple fallback'); } catch (e) {}
                await new Promise(resolve => setTimeout(resolve, 800));
                const mockSummary = `[Mock Summary] ${sourceText.slice(0, 240)}${sourceText.length > 240 ? '...' : ''}`;
                outputArea.value = mockSummary;
                showToast('Summarization (mock) complete', 'success');
                saveNoteBtn.disabled = false;
                return;
            }

            // Check and cache availability
            let cacheKey = 'default';
            let availability = summarizerAvailabilityCache.get(cacheKey);
            if (!availability) {
                availability = await summarizerAPI.availability();
                summarizerAvailabilityCache.set(cacheKey, availability);
                await saveSummarizerAvailCache();
            } else {
                try { console.log('popup: using cached summarizer availability', availability); } catch (e) {}
            }

            if (availability === 'unavailable') {
                showToast('Summarizer API unavailable on this device.', 'error');
                return;
            }

            // Build options for creation (from UI selections)
            const options = {
                sharedContext: '',
                type: summType ? summType.value : 'key-points',
                format: summFormat ? summFormat.value : 'plain-text',
                length: summLength ? summLength.value : 'medium',
                monitor(m) {
                    m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                        const pct = Math.round((e.loaded || 0) * 100);
                        try { console.log('popup: summarizer download progress', pct); } catch (e) {}
                        loadingIndicator.classList.remove('hidden');
                        if (loadingText) loadingText.textContent = `Downloading summarizer model... ${pct}%`;
                    });
                }
            };

            const summarizer = await summarizerAPI.create(options);

            // Determine output language (use UI selection if present) to ensure API quality/safety
            const outLang = (typeof targetLangSelect !== 'undefined' && targetLangSelect && targetLangSelect.value) ? targetLangSelect.value : 'en';

            // Run batch summarize first
            if (typeof summarizer.summarize === 'function') {
                try { console.log('popup: calling summarizer.summarize (outputLanguage=' + outLang + ')'); } catch (e) {}
                const result = await summarizer.summarize(sourceText, { context: '', outputLanguage: outLang });
                const textResult = String(result || '');
                // If format is markdown and showRendered, render markdown
                const fmt = summFormat ? summFormat.value : 'plain-text';
                if (fmt === 'markdown' && showRendered && showRendered.checked && renderedOutput) {
                    renderedOutput.innerHTML = renderMarkdown(textResult);
                    renderedOutput.classList.remove('hidden');
                    outputArea.classList.add('hidden');
                } else {
                    if (renderedOutput) { renderedOutput.classList.add('hidden'); }
                    outputArea.classList.remove('hidden');
                    outputArea.value = textResult;
                }
                showToast('Summarization complete', 'success');
            } else if (typeof summarizer.summarizeStreaming === 'function') {
                try { console.log('popup: calling summarizer.summarizeStreaming (outputLanguage=' + outLang + ')'); } catch (e) {}
                const stream = summarizer.summarizeStreaming(sourceText, { context: '', outputLanguage: outLang });
                let streamed = '';
                for await (const chunk of stream) {
                    streamed += chunk;
                    const fmt = summFormat ? summFormat.value : 'plain-text';
                    if (fmt === 'markdown' && showRendered && showRendered.checked && renderedOutput) {
                        renderedOutput.innerHTML = renderMarkdown(streamed);
                        renderedOutput.classList.remove('hidden');
                        outputArea.classList.add('hidden');
                    } else {
                        if (renderedOutput) { renderedOutput.classList.add('hidden'); }
                        outputArea.classList.remove('hidden');
                        outputArea.value = streamed;
                    }
                }
                showToast('Summarization complete', 'success');
            } else {
                showToast('Summarizer has no usable summarize method.', 'error');
            }

            saveNoteBtn.disabled = false;

        } catch (error) {
            console.error('Summarizer API Error:', error);
            showToast(`Summarization error: ${error.message || error}`, 'error', 4000);
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    // --- Action Button Handlers ---

    // --- Rewriter integration ---
    const REWRITER_AVAIL_KEY = 'rewriterAvail_v1';
    const rewriterAvailabilityCache = new Map();
    let currentRewriterInstance = null;

    async function handleRewriterRun() {
        const original = sourceTextarea.value.trim();
        if (!original) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Rewriting content...';

        try {
            const rewriterAPI = (typeof Rewriter !== 'undefined') ? Rewriter : (typeof window !== 'undefined' && window.Rewriter) ? window.Rewriter : (typeof window !== 'undefined' && window.RewriterMock) ? window.RewriterMock : null;
            if (!rewriterAPI) {
                outputArea.value = 'Rewriter API not available in this environment.';
                showToast('Rewriter API not available', 'error');
                return;
            }

            // availability check
            let availability = rewriterAvailabilityCache.get('default');
            if (!availability) {
                if (typeof rewriterAPI.availability === 'function') {
                    availability = await rewriterAPI.availability();
                    rewriterAvailabilityCache.set('default', availability);
                    try { await storageSet({ [REWRITER_AVAIL_KEY]: availability }); } catch (e) {}
                } else {
                    availability = 'available';
                }
            }

            if (availability === 'unavailable') {
                showToast('Rewriter API unavailable on this device.', 'error');
                return;
            }

            // Build options from writer UI so user controls tone/format/length
            const opts = {
                sharedContext: '',
                tone: writerTone ? writerTone.value : 'professional',
                format: writerFormat ? writerFormat.value : 'plain-text',
                length: writerLength ? writerLength.value : 'medium',
                expectedInputLanguages: ['en'],
                outputLanguage: 'en'
            };

            // create rewriter instance
            let rewriter;
            if (availability === 'available') {
                rewriter = await rewriterAPI.create(opts);
            } else {
                rewriter = await rewriterAPI.create({ ...opts,
                    monitor(m) {
                        m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                            const pct = Math.round((e.loaded || 0) * 100);
                            if (loadingText) loadingText.textContent = `Downloading rewriter model... ${pct}%`;
                            loadingIndicator.classList.remove('hidden');
                        });
                    }
                });
            }

            currentRewriterInstance = rewriter;

            // prefer batch rewrite, fallback to streaming
            if (typeof rewriter.rewrite === 'function') {
                const result = await rewriter.rewrite(original, { context: '' });
                outputArea.value = String(result || '');
                showToast('Rewrite complete', 'success');
            } else if (typeof rewriter.rewriteStreaming === 'function') {
                const stream = rewriter.rewriteStreaming(original, { context: '' });
                let streamed = '';
                for await (const chunk of stream) {
                    streamed += chunk;
                    outputArea.value = streamed;
                }
                showToast('Rewrite complete', 'success');
            } else {
                showToast('Rewriter has no usable rewrite method.', 'error');
            }

            saveNoteBtn.disabled = false;

        } catch (err) {
            console.error('popup: rewriter error', err);
            outputArea.value = `Rewriter error: ${err.message || err}`;
            showToast('Rewriter error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
            // destroy instance to free resources
            try { if (currentRewriterInstance && typeof currentRewriterInstance.destroy === 'function') currentRewriterInstance.destroy(); } catch (e) {}
            currentRewriterInstance = null;
        }
    }

    // Wire the existing rewrite button to the Rewriter implementation
    if (rewriteBtn) rewriteBtn.addEventListener('click', handleRewriterRun);
    // Dedicated streaming rewrite button
    async function handleRewriterStream() {
        const original = sourceTextarea.value.trim();
        if (!original) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Rewriting (streaming)...';

        try {
            const rewriterAPI = (typeof Rewriter !== 'undefined') ? Rewriter : (typeof window !== 'undefined' && window.Rewriter) ? window.Rewriter : (typeof window !== 'undefined' && window.RewriterMock) ? window.RewriterMock : null;
            if (!rewriterAPI) {
                outputArea.value = 'Rewriter API not available in this environment.';
                showToast('Rewriter API not available', 'error');
                return;
            }

            const opts = {
                sharedContext: '',
                tone: writerTone ? writerTone.value : 'professional',
                format: writerFormat ? writerFormat.value : 'plain-text',
                length: writerLength ? writerLength.value : 'medium'
            };

            const rewriter = await rewriterAPI.create(opts);

            if (typeof rewriter.rewriteStreaming === 'function') {
                const stream = rewriter.rewriteStreaming(original, { context: '' });
                let streamed = '';
                for await (const chunk of stream) {
                    streamed += chunk;
                    outputArea.value = streamed;
                }
                showToast('Rewrite (stream) complete', 'success');
            } else if (typeof rewriter.rewrite === 'function') {
                // fallback to batch
                const result = await rewriter.rewrite(original, { context: '' });
                outputArea.value = String(result || '');
                showToast('Rewrite complete', 'success');
            } else {
                showToast('Rewriter has no usable rewrite method.', 'error');
            }

            if (rewriter && typeof rewriter.destroy === 'function') rewriter.destroy();
            saveNoteBtn.disabled = false;

        } catch (err) {
            console.error('popup: rewriter stream error', err);
            outputArea.value = `Rewriter stream error: ${err.message || err}`;
            showToast('Rewriter stream error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    if (rewriteStreamBtn) rewriteStreamBtn.addEventListener('click', handleRewriterStream);

    // Save Note Handler (Functionality depends on storage.js)
    saveNoteBtn.addEventListener('click', async () => {
        const noteContent = outputArea.value;
        if (!noteContent) return;

        // Assumes saveNote function is defined in storage.js
        if (typeof saveNote === 'function') {
            try {
                console.log('popup: saving note, source length', sourceTextarea.value.length);
                await saveNote(sourceTextarea.value, noteContent);
                saveNoteBtn.textContent = "Note Saved!";
                console.log('popup: saveNote succeeded');
            } catch (e) {
                console.error('popup: saveNote error', e);
                outputArea.value = `Error saving note: ${e.message}`;
            }

            setTimeout(() => {
                saveNoteBtn.textContent = "Save Note";
                saveNoteBtn.disabled = true;
                resetOutputState(); // Clear output area after saving
            }, 1000);
        } else {
            outputArea.value = "Error: Storage initialization failed. Cannot save note.";
            console.error('popup: saveNote function not found on window');
        }
    });


    // --- Event Listeners and Initial Setup ---

    // Function to handle incoming text (or object) and update the UI
    const processIncomingText = (textOrObj) => {
        // Support either a raw string or an object { type, data }
        let text = '';
        if (!textOrObj) {
            text = '';
        } else if (typeof textOrObj === 'string') {
            text = textOrObj;
        } else if (typeof textOrObj === 'object' && textOrObj.data) {
            text = textOrObj.data;
        } else {
            text = String(textOrObj);
        }

        try { console.log('popup: processIncomingText:', { text }); } catch (e) { }

        sourceTextarea.value = text;
        const hasText = text.trim().length > 0;
        summarizeBtn.disabled = !hasText;
        rewriteBtn.disabled = !hasText;
    if (proofreadBtn) proofreadBtn.disabled = !hasText;
        if (translateBtn) translateBtn.disabled = !hasText;
    if (rewriteStreamBtn) rewriteStreamBtn.disabled = !hasText;
    if (writerRunBtn) writerRunBtn.disabled = !hasText;
    if (writerStreamBtn) writerStreamBtn.disabled = !hasText;
        // Auto-detect language when source selector is set to auto.
        try {
            if (hasText && sourceLangSelect && sourceLangSelect.value === 'auto') {
                // debounce slightly to avoid excessive calls for continuous typing
                if (window._detectLangTimeout) clearTimeout(window._detectLangTimeout);
                window._detectLangTimeout = setTimeout(() => detectLanguage(text), 250);
            }
        } catch (e) { }
        resetOutputState();
    };

    // Listener to receive selected text from content.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try { console.log('popup: runtime.onMessage received:', request); } catch (e) { }
        if (request.action === "textSelected" && request.data) {
            // Pass the data to the processing function
            processIncomingText(request.data);
            return true;
        }
    });

    // We can also try getting the selection directly when the popup opens,
    // which is often a more robust pattern for popups.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: "getSelection" }, (response) => {
            try { console.log('popup: getSelection response:', response); } catch (e) { }
            if (response && response.data) {
                processIncomingText(response.data);
            }
        });
    });

    // Button Click Listener
    summarizeBtn.addEventListener('click', handleSummarize);

    // Translator integration
    // Availability cache (per session). Persisted to sessionStorage to avoid repeated checks.
    const translatorAvailabilityCache = new Map();
    const AVAIL_CACHE_KEY = 'translatorAvailCache_v1';
    // Summarizer availability cache key
    const SUMMARIZER_AVAIL_KEY = 'summarizerAvail_v1';
    const summarizerAvailabilityCache = new Map();

    // Language Detector cache key (marks that model was created for this session)
    const DETECTOR_CACHE_KEY = 'languageDetectorReady_v1';
    let languageDetector = null;
    let detectorReady = false;

    // Load cached availability from sessionStorage if present
    // Storage helpers: prefer chrome.storage.local when available, fallback to sessionStorage
    function storageGet(keys) {
        return new Promise((resolve) => {
            try {
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(keys, (items) => resolve(items || {}));
                } else {
                    const out = {};
                    keys.forEach(k => {
                        try {
                            const raw = sessionStorage.getItem(k);
                            out[k] = raw ? JSON.parse(raw) : undefined;
                        } catch (e) {
                            out[k] = undefined;
                        }
                    });
                    resolve(out);
                }
            } catch (e) { resolve({}); }
        });
    }

    function storageSet(obj) {
        return new Promise((resolve) => {
            try {
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set(obj, () => resolve());
                } else {
                    Object.keys(obj).forEach(k => {
                        try { sessionStorage.setItem(k, JSON.stringify(obj[k])); } catch (e) { }
                    });
                    resolve();
                }
            } catch (e) { resolve(); }
        });
    }

    // Load caches asynchronously (availability caches and detector-ready flag)
    (async function loadAvailCache() {
        try {
            const items = await storageGet([AVAIL_CACHE_KEY, SUMMARIZER_AVAIL_KEY, DETECTOR_CACHE_KEY]);
            const rawTranslator = items[AVAIL_CACHE_KEY];
            if (rawTranslator) {
                Object.keys(rawTranslator).forEach(k => translatorAvailabilityCache.set(k, rawTranslator[k]));
            }
            const rawSumm = items[SUMMARIZER_AVAIL_KEY];
            if (rawSumm) {
                Object.keys(rawSumm).forEach(k => summarizerAvailabilityCache.set(k, rawSumm[k]));
            }
            // Load detector ready flag
            if (items[DETECTOR_CACHE_KEY]) {
                detectorReady = true;
            }
            // If there is a saved prompt text, populate prompt textarea
            if (items['lastPrompt']) {
                try { if (promptTextarea) promptTextarea.value = items['lastPrompt']; } catch (e) {}
            }
        } catch (e) { /* ignore */ }
    })();

    async function saveTranslatorAvailCache() {
        try {
            const obj = Object.fromEntries(translatorAvailabilityCache);
            await storageSet({ [AVAIL_CACHE_KEY]: obj });
        } catch (e) { /* ignore */ }
    }

    async function saveSummarizerAvailCache() {
        try {
            const obj = Object.fromEntries(summarizerAvailabilityCache);
            await storageSet({ [SUMMARIZER_AVAIL_KEY]: obj });
        } catch (e) { /* ignore */ }
    }

    // Save last prompt helper
    async function saveLastPrompt(text) {
        try { await storageSet({ lastPrompt: text }); } catch (e) {}
    }

    // Helper: detect language for given text. If source select is 'auto', we'll call this.
    async function detectLanguage(text) {
        if (!text || text.trim().length < 3) return;

        setUILoading(true);
        if (loadingText) loadingText.textContent = 'Detecting language...';
        showToast('Detecting language...', 'default', 1200);

        try {
            const detectorAPI = (typeof LanguageDetector !== 'undefined') ? LanguageDetector : (typeof window !== 'undefined' && window.LanguageDetector) ? window.LanguageDetector : (typeof window !== 'undefined' && window.LanguageDetectorMock) ? window.LanguageDetectorMock : null;
            if (!detectorAPI) {
                showToast('Language Detector API not available in this browser.', 'error');
                return;
            }

            // create detector if not already instantiated
            if (!languageDetector) {
                try { console.log('popup: creating language detector...'); } catch (e) {}
                languageDetector = await detectorAPI.create({
                    monitor(m) {
                        m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                            const pct = Math.round((e.loaded || 0) * 100);
                            try { console.log('popup: language detector download progress', pct); } catch (e) {}
                            if (loadingText) loadingText.textContent = `Downloading detector model... ${pct}%`;
                        });
                    }
                });
                detectorReady = true;
                try { await storageSet({ [DETECTOR_CACHE_KEY]: true }); } catch (e) { }
            } else {
                try { console.log('popup: using existing language detector instance'); } catch (e) {}
            }

            // Run detection
            const results = await languageDetector.detect(text);
            if (Array.isArray(results) && results.length > 0) {
                const top = results[0].detectedLanguage || results[0].language || ''; 
                try { console.log('popup: language detect top', top, results[0].confidence); } catch (e) {}
                // If source select is auto, set it to detected language
                if (sourceLangSelect && sourceLangSelect.value === 'auto' && top) {
                    // ensure option exists
                    let opt = Array.from(sourceLangSelect.options).find(o => o.value === top);
                    if (!opt) {
                        opt = document.createElement('option');
                        opt.value = top;
                        opt.textContent = top;
                        sourceLangSelect.appendChild(opt);
                    }
                    sourceLangSelect.value = top;
                    showToast(`Detected language: ${top}`, 'success', 1800);
                }
            } else {
                showToast('Could not detect language.', 'error');
            }

        } catch (err) {
            console.error('popup: language detection error', err);
            showToast(`Language detection error: ${err.message || err}`, 'error', 3000);
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    async function handleTranslate() {
        const sourceText = sourceTextarea.value.trim();
        if (!sourceText) return;

        // Decide languages
        const sourceLang = sourceLangSelect ? sourceLangSelect.value : 'auto';
        const targetLang = targetLangSelect ? targetLangSelect.value : 'fr';

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = `Translating ${sourceLang} → ${targetLang}...`;

        try {
            // Feature detection
            const translatorAPI = (typeof Translator !== 'undefined') ? Translator : (typeof window !== 'undefined' && window.Translator) ? window.Translator : null;
            if (!translatorAPI) {
                outputArea.value = 'Translator API not available in this browser/extension environment.';
                console.warn('popup: Translator API not found');
                return;
            }

            try { console.log('popup: checking translator availability', { sourceLang, targetLang }); } catch (e) {}

            const cacheKey = `${sourceLang}:${targetLang}`;
            let availability = translatorAvailabilityCache.get(cacheKey);
            if (!availability) {
                availability = await translatorAPI.availability({ sourceLanguage: sourceLang, targetLanguage: targetLang });
                translatorAvailabilityCache.set(cacheKey, availability);
                saveAvailCache();
            } else {
                try { console.log('popup: using cached availability for', cacheKey, availability); } catch (e) {}
            }
            try { console.log('popup: translator availability', availability); } catch (e) {}

            if (availability !== 'available' && availability !== 'downloadable') {
                showToast(`Translation not supported for ${sourceLang} → ${targetLang}.`, 'error');
                return;
            }

            // Create translator and monitor download progress
            const translator = await translatorAPI.create({
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
                monitor(m) {
                    m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                        const pct = Math.round((e.loaded || 0) * 100);
                        try { console.log('popup: translator download progress', pct); } catch (e) {}
                        // show small progress in loading indicator
                        loadingIndicator.classList.remove('hidden');
                        if (loadingText) loadingText.textContent = `Downloading translator model... ${pct}%`;
                    });
                }
            });

            // Prefer simple translate API; if streaming API exists, use it for long text
            if (typeof translator.translate === 'function') {
                try { console.log('popup: calling translator.translate'); } catch (e) {}
                const result = await translator.translate(sourceText);
                outputArea.value = String(result || '');
                showToast('Translation complete', 'success');
            } else if (typeof translator.translateStreaming === 'function') {
                try { console.log('popup: calling translator.translateStreaming'); } catch (e) {}
                const stream = translator.translateStreaming(sourceText);
                let streamed = '';
                for await (const chunk of stream) {
                    streamed += chunk;
                    // append progressively to output area for user feedback
                    outputArea.value = streamed;
                }
                showToast('Translation complete', 'success');
            } else {
                showToast('Translator has no usable translate method.', 'error');
            }

            saveNoteBtn.disabled = false;

        } catch (err) {
            console.error('popup: translate error', err);
            outputArea.value = `Translation error: ${err.message || err}`;
        } finally {
            // restore loading indicator text
            loadingIndicator.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    if (translateBtn) translateBtn.addEventListener('click', handleTranslate);

    // --- Writer integration ---
    const WRITER_AVAIL_KEY = 'writerAvail_v1';
    const writerAvailabilityCache = new Map();

    async function handleWriterRun() {
        const prompt = sourceTextarea.value.trim();
        if (!prompt) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Running Writer (batch)...';

        try {
            const writerAPI = (typeof Writer !== 'undefined') ? Writer : (typeof window !== 'undefined' && window.Writer) ? window.Writer : (typeof window !== 'undefined' && window.WriterMock) ? window.WriterMock : null;
            if (!writerAPI) {
                outputArea.value = 'Writer API not available in this environment.';
                showToast('Writer API not available', 'error');
                return;
            }

            // Check availability and cache
            let availability = writerAvailabilityCache.get('default');
            if (!availability) {
                if (typeof writerAPI.availability === 'function') {
                    availability = await writerAPI.availability();
                    writerAvailabilityCache.set('default', availability);
                    try { await storageSet({ [WRITER_AVAIL_KEY]: availability }); } catch (e) {}
                } else {
                    availability = 'available';
                }
            }

            if (availability === 'unavailable') {
                showToast('Writer API unavailable on this device.', 'error');
                return;
            }

            // Build options from UI
            const opts = {
                sharedContext: '',
                tone: writerTone ? writerTone.value : 'professional',
                format: writerFormat ? writerFormat.value : 'plain-text',
                length: writerLength ? writerLength.value : 'medium',
                expectedInputLanguages: ['en'],
                outputLanguage: 'en'
            };

            // Create writer (monitor progress if downloadable)
            let writer;
            if (availability === 'available') {
                writer = await writerAPI.create(opts);
            } else {
                writer = await writerAPI.create({ ...opts,
                    monitor(m) {
                        m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                            const pct = Math.round((e.loaded || 0) * 100);
                            if (loadingText) loadingText.textContent = `Downloading writer model... ${pct}%`;
                            loadingIndicator.classList.remove('hidden');
                        });
                    }
                });
            }

            try {
                if (typeof writer.write === 'function') {
                    const result = await writer.write(prompt, { context: '' });
                    outputArea.value = String(result || '');
                    showToast('Writer (batch) complete', 'success');
                } else if (typeof writer.writeStreaming === 'function') {
                    // fallback to streaming if only available
                    const stream = writer.writeStreaming(prompt, { context: '' });
                    let accumulated = '';
                    for await (const ch of stream) {
                        accumulated += ch;
                        outputArea.value = accumulated;
                    }
                    showToast('Writer (stream) complete', 'success');
                } else {
                    showToast('Writer has no usable write method.', 'error');
                }
            } finally {
                if (writer && typeof writer.destroy === 'function') {
                    try { writer.destroy(); } catch (e) { }
                }
            }

            saveNoteBtn.disabled = false;

        } catch (err) {
            console.error('popup: writer error', err);
            outputArea.value = `Writer error: ${err.message || err}`;
            showToast('Writer error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    async function handleWriterStream() {
        const prompt = sourceTextarea.value.trim();
        if (!prompt) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Running Writer (streaming)...';

        try {
            const writerAPI = (typeof Writer !== 'undefined') ? Writer : (typeof window !== 'undefined' && window.Writer) ? window.Writer : (typeof window !== 'undefined' && window.WriterMock) ? window.WriterMock : null;
            if (!writerAPI) {
                outputArea.value = 'Writer API not available in this environment.';
                showToast('Writer API not available', 'error');
                return;
            }

            // Create writer quickly without waiting for explicit availability
            const opts = {
                sharedContext: '',
                tone: writerTone ? writerTone.value : 'professional',
                format: writerFormat ? writerFormat.value : 'plain-text',
                length: writerLength ? writerLength.value : 'medium'
            };
            const writer = await writerAPI.create(opts);

            if (typeof writer.writeStreaming === 'function') {
                const stream = writer.writeStreaming(prompt, { context: '' });
                let streamed = '';
                for await (const chunk of stream) {
                    streamed += chunk;
                    outputArea.value = streamed;
                }
                showToast('Writer streaming complete', 'success');
            } else if (typeof writer.write === 'function') {
                // fallback to batch
                const result = await writer.write(prompt, { context: '' });
                outputArea.value = String(result || '');
                showToast('Writer (batch) complete', 'success');
            } else {
                showToast('Writer has no usable write method.', 'error');
            }

            if (writer && typeof writer.destroy === 'function') writer.destroy();
            saveNoteBtn.disabled = false;

        } catch (err) {
            console.error('popup: writer stream error', err);
            outputArea.value = `Writer stream error: ${err.message || err}`;
            showToast('Writer stream error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    if (writerRunBtn) writerRunBtn.addEventListener('click', handleWriterRun);
    if (writerStreamBtn) writerStreamBtn.addEventListener('click', handleWriterStream);

    // --- Prompt / LanguageModel integration ---
    const PROMPT_AVAIL_KEY = 'promptAvail_v1';
    const promptAvailabilityCache = new Map();

    // Session state for LanguageModel
    let currentSession = null;
    let currentSessionController = null;

    function updateSessionUI() {
        const hasSession = !!currentSession;
        if (sessionStatus) sessionStatus.textContent = hasSession ? 'Session active' : 'No session';
        if (sessionCloneBtn) sessionCloneBtn.disabled = !hasSession;
        if (sessionAbortBtn) sessionAbortBtn.disabled = !hasSession || !currentSessionController;
        if (sessionDestroyBtn) sessionDestroyBtn.disabled = !hasSession;
    }

    async function createSessionExplicit() {
        const api = detectLanguageModelAPI();
        if (!api) { showToast('LanguageModel API not available', 'error'); return; }
        let params = { defaultTemperature: 1, defaultTopK: 3 };
        if (typeof api.params === 'function') {
            try { params = await api.params(); } catch (e) { /* ignore */ }
        }

        const controller = new AbortController();
        const opts = {
            temperature: promptTemp ? Number(promptTemp.value) : params.defaultTemperature,
            topK: promptTopK ? Number(promptTopK.value) : params.defaultTopK,
            initialPrompts: [{ role: 'system', content: 'You are a helpful and friendly assistant.' }],
            monitor(m) {
                m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                    const pct = Math.round((e.loaded || 0) * 100);
                    if (loadingText) loadingText.textContent = `Downloading model... ${pct}%`;
                    loadingIndicator.classList.remove('hidden');
                });
            },
            signal: controller.signal
        };

        try {
            const session = await (typeof api.create === 'function' ? api.create(opts) : api.createSession(opts));
            currentSession = session;
            currentSessionController = controller;
            showToast('Session created', 'success');
            updateSessionUI();
        } catch (err) {
            console.error('createSession error', err);
            showToast(`Session creation error: ${err.message || err}`, 'error');
        }
    }

    async function cloneSessionExplicit() {
        if (!currentSession || typeof currentSession.clone !== 'function') { showToast('No session to clone', 'error'); return; }
        try {
            const cloned = await currentSession.clone();
            // optionally use cloned session for a one-off run; here we just destroy it immediately
            if (cloned && typeof cloned.destroy === 'function') cloned.destroy();
            showToast('Session cloned', 'success');
        } catch (err) {
            console.error('cloneSession error', err);
            showToast('Clone failed', 'error');
        }
    }

    function abortSessionExplicit() {
        try {
            if (currentSessionController) {
                currentSessionController.abort();
                showToast('Session aborted', 'default', 1000);
            }
        } catch (e) { console.error('abort error', e); }
        updateSessionUI();
    }

    function destroySessionExplicit() {
        try {
            if (currentSession && typeof currentSession.destroy === 'function') {
                currentSession.destroy();
            }
        } catch (e) { console.error('destroy session error', e); }
        currentSession = null;
        currentSessionController = null;
        showToast('Session destroyed', 'default', 1000);
        updateSessionUI();
    }

    // Simple content detection and rendering helpers
    function looksLikeHTML(s) {
        return /^\s*<([a-zA-Z]+)(\s|>|\/)/.test(s);
    }

    function looksLikeMarkdown(s) {
        return /(^#\s)|(^-{3,}$)|\*\*|\*\w|\[.+\]\(.+\)/m.test(s);
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderMarkdown(md) {
        // very small markdown -> HTML renderer (headings, bold, italics, links, paragraphs)
        if (!md) return '';
        let out = escapeHtml(md);
        // headings
        out = out.replace(/^######\s*(.*)$/gm, '<h6>$1</h6>');
        out = out.replace(/^#####\s*(.*)$/gm, '<h5>$1</h5>');
        out = out.replace(/^####\s*(.*)$/gm, '<h4>$1</h4>');
        out = out.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
        out = out.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
        out = out.replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');
        // bold **text**
        out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // italics *text*
        out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // links [text](url)
        out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        // line breaks -> paragraphs
        out = out.split(/\n\n+/).map(p => '<p>' + p.replace(/\n/g, '<br/>') + '</p>').join('');
        return out;
    }

    function detectLanguageModelAPI() {
        // Prefer LanguageModel, fall back to self.ai.prompt presence
        if (typeof LanguageModel !== 'undefined') return LanguageModel;
        if (typeof window !== 'undefined' && window.LanguageModel) return window.LanguageModel;
        // if `ai.prompt` exists, we can adapt, but for now prefer LanguageModel
        if (typeof window !== 'undefined' && window.ai && window.ai.prompt) return window.ai;
        if (typeof window !== 'undefined' && window.LanguageModelMock) return window.LanguageModelMock;
        return null;
    }

    async function handlePromptRun() {
        const promptText = (promptTextarea && promptTextarea.value.trim()) || sourceTextarea.value.trim();
        if (!promptText) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Running prompt...';

        try {
            const api = detectLanguageModelAPI();
            if (!api) {
                outputArea.value = 'Prompt API (LanguageModel) not available in this environment.';
                showToast('Prompt API not available', 'error');
                return;
            }

            // availability
            let availability = promptAvailabilityCache.get('default');
            if (!availability && typeof api.availability === 'function') {
                availability = await api.availability();
                promptAvailabilityCache.set('default', availability);
                try { await storageSet({ [PROMPT_AVAIL_KEY]: availability }); } catch (e) {}
            }

            if (availability === 'unavailable') {
                showToast('LanguageModel unavailable on this device.', 'error');
                return;
            }

            // get params if available
            let params = { defaultTemperature: 1, defaultTopK: 3 };
            if (typeof api.params === 'function') {
                try { params = await api.params(); } catch (e) { /* ignore */ }
            }

            // Session create options
            const createOpts = {
                temperature: promptTemp ? Number(promptTemp.value) : params.defaultTemperature,
                topK: promptTopK ? Number(promptTopK.value) : params.defaultTopK,
                initialPrompts: [{ role: 'system', content: 'You are a helpful and friendly assistant.' }],
                monitor(m) {
                    m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                        const pct = Math.round((e.loaded || 0) * 100);
                        if (loadingText) loadingText.textContent = `Downloading model... ${pct}%`;
                        loadingIndicator.classList.remove('hidden');
                    });
                }
            };

            // Use existing session if present, otherwise create a temporary one
            let session = currentSession;
            let ephemeral = false;
            if (!session) {
                session = await (typeof api.create === 'function' ? api.create(createOpts) : api.createSession(createOpts));
                ephemeral = true;
            }
            // Run non-streaming prompt
            if (typeof session.prompt === 'function') {
                const result = String(await session.prompt(promptText) || '');
                // attempt to parse JSON responses
                let displayed = result;
                try {
                    const parsed = JSON.parse(result);
                    displayed = JSON.stringify(parsed, null, 2);
                    outputArea.value = displayed;
                } catch (e) {
                    // Not JSON: consider rendering if HTML/Markdown and showRendered is checked
                    if (showRendered && showRendered.checked && renderedOutput) {
                        if (looksLikeHTML(result)) {
                            // sanitize script tags
                            const sanitized = String(result).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
                            renderedOutput.innerHTML = sanitized;
                            renderedOutput.classList.remove('hidden');
                            outputArea.classList.add('hidden');
                        } else if (looksLikeMarkdown(result)) {
                            renderedOutput.innerHTML = renderMarkdown(result);
                            renderedOutput.classList.remove('hidden');
                            outputArea.classList.add('hidden');
                        } else {
                            outputArea.value = displayed;
                            if (renderedOutput) renderedOutput.classList.add('hidden');
                            outputArea.classList.remove('hidden');
                        }
                    } else {
                        outputArea.value = displayed;
                        if (renderedOutput) renderedOutput.classList.add('hidden');
                        outputArea.classList.remove('hidden');
                    }
                }
                showToast('Prompt complete', 'success');
            } else {
                outputArea.value = 'Session object has no prompt() method.';
                showToast('Prompt not supported by session', 'error');
            }

            // destroy ephemeral session if we created one for this call
            if (ephemeral) {
                try { if (session && typeof session.destroy === 'function') session.destroy(); } catch (e) {}
            }

            saveNoteBtn.disabled = false;
            await saveLastPrompt(promptText);

        } catch (err) {
            console.error('popup: prompt run error', err);
            outputArea.value = `Prompt error: ${err.message || err}`;
            showToast('Prompt error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    async function handlePromptStream() {
        const promptText = (promptTextarea && promptTextarea.value.trim()) || sourceTextarea.value.trim();
        if (!promptText) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Running prompt (streaming)...';

        try {
            const api = detectLanguageModelAPI();
            if (!api) {
                outputArea.value = 'Prompt API (LanguageModel) not available in this environment.';
                showToast('Prompt API not available', 'error');
                return;
            }

            const createOpts = {
                temperature: promptTemp ? Number(promptTemp.value) : 1,
                topK: promptTopK ? Number(promptTopK.value) : 3,
                initialPrompts: [{ role: 'system', content: 'You are a helpful and friendly assistant.' }]
            };

            // Use currentSession if present
            let session = currentSession;
            let ephemeral = false;
            if (!session) {
                session = await (typeof api.create === 'function' ? api.create(createOpts) : api.createSession(createOpts));
                ephemeral = true;
            }

            if (typeof session.promptStreaming === 'function') {
                const stream = session.promptStreaming(promptText);
                let streamed = '';
                for await (const chunk of stream) {
                    streamed += chunk;
                    // render progressively; if markdown and showRendered, render transformed markdown
                    if (showRendered && showRendered.checked && renderedOutput) {
                        if (looksLikeMarkdown(streamed)) {
                            renderedOutput.innerHTML = renderMarkdown(streamed);
                            renderedOutput.classList.remove('hidden');
                            outputArea.classList.add('hidden');
                        } else if (looksLikeHTML(streamed)) {
                            const sanitized = String(streamed).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
                            renderedOutput.innerHTML = sanitized;
                            renderedOutput.classList.remove('hidden');
                            outputArea.classList.add('hidden');
                        } else {
                            outputArea.value = streamed;
                            if (renderedOutput) renderedOutput.classList.add('hidden');
                            outputArea.classList.remove('hidden');
                        }
                    } else {
                        outputArea.value = streamed;
                    }
                }
                showToast('Prompt stream complete', 'success');
            } else if (typeof session.prompt === 'function') {
                const res = await session.prompt(promptText);
                const text = String(res || '');
                if (showRendered && showRendered.checked && renderedOutput && (looksLikeHTML(text) || looksLikeMarkdown(text))) {
                    if (looksLikeHTML(text)) {
                        const sanitized = String(text).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
                        renderedOutput.innerHTML = sanitized;
                    } else {
                        renderedOutput.innerHTML = renderMarkdown(text);
                    }
                    renderedOutput.classList.remove('hidden');
                    outputArea.classList.add('hidden');
                } else {
                    outputArea.value = text;
                    if (renderedOutput) renderedOutput.classList.add('hidden');
                    outputArea.classList.remove('hidden');
                }
                showToast('Prompt complete', 'success');
            } else {
                showToast('Session has no prompt methods', 'error');
            }
            if (ephemeral) {
                try { if (session && typeof session.destroy === 'function') session.destroy(); } catch (e) {}
            }
            saveNoteBtn.disabled = false;
            await saveLastPrompt(promptText);

        } catch (err) {
            console.error('popup: prompt stream error', err);
            outputArea.value = `Prompt stream error: ${err.message || err}`;
            showToast('Prompt stream error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    if (promptRunBtn) promptRunBtn.addEventListener('click', handlePromptRun);
    if (promptStreamBtn) promptStreamBtn.addEventListener('click', handlePromptStream);

    // --- Proofreader integration ---
    const PROOF_AVAIL_KEY = 'proofreaderAvail_v1';
    const proofAvailabilityCache = new Map();

    async function handleProofread() {
        const text = sourceTextarea.value.trim();
        if (!text) return;

        resetOutputState();
        setUILoading(true);
        outputArea.placeholder = 'Proofreading...';

        try {
            const lang = proofLang ? proofLang.value : 'en';
            const proofAPI = (typeof Proofreader !== 'undefined') ? Proofreader : (typeof window !== 'undefined' && window.Proofreader) ? window.Proofreader : (typeof window !== 'undefined' && window.ProofreaderMock) ? window.ProofreaderMock : null;
            if (!proofAPI) {
                outputArea.value = 'Proofreader API not available in this environment.';
                showToast('Proofreader API not available', 'error');
                return;
            }

            let availability = proofAvailabilityCache.get('default');
            if (!availability && typeof proofAPI.availability === 'function') {
                try { availability = await proofAPI.availability({ expectedInputLanguages: [lang] }); } catch (e) { availability = 'available'; }
                proofAvailabilityCache.set('default', availability);
                try { await storageSet({ [PROOF_AVAIL_KEY]: availability }); } catch (e) {}
            }

            if (availability === 'unavailable') {
                showToast('Proofreader unavailable on this device.', 'error');
                return;
            }

            // create proofreader
            const pr = await proofAPI.create({ expectedInputLanguages: [lang], monitor(m) { m.addEventListener && m.addEventListener('downloadprogress', (e) => {
                        const pct = Math.round((e.loaded || 0) * 100);
                        if (loadingText) loadingText.textContent = `Downloading proofreader model... ${pct}%`;
                        loadingIndicator.classList.remove('hidden');
                    }); } });

            // run proofread
            if (typeof pr.proofread === 'function') {
                const res = await pr.proofread(text);
                // expected shape: { corrected: string, corrections: [{ startIndex, endIndex, type, explanation, suggestions }] }
                const corrected = res && res.corrected ? String(res.corrected) : '';
                const corrections = Array.isArray(res && res.corrections) ? res.corrections : [];

                // render corrections
                if (proofResults && correctionsList && correctedTextDiv) {
                    correctionsList.innerHTML = '';
                    corrections.forEach((c, i) => {
                        const div = document.createElement('div');
                        div.className = 'correction';
                        const errText = text.substring(c.startIndex, c.endIndex);
                        div.innerHTML = `<div class="err">Error #${i+1}: "${escapeHtml(errText)}"</div>` +
                            `<div class="explain">${escapeHtml(c.explanation || '')}</div>` +
                            `<div class="suggest">Suggestions: ${(c.suggestions || []).map(s => escapeHtml(s)).join(', ')}</div>`;
                        correctionsList.appendChild(div);
                    });
                    correctedTextDiv.innerText = corrected;
                    proofResults.classList.remove('hidden');
                }

                showToast('Proofread complete', 'success');
                saveNoteBtn.disabled = false;
            } else {
                showToast('Proofreader has no proofread method', 'error');
            }

            try { if (pr && typeof pr.destroy === 'function') pr.destroy(); } catch (e) {}

        } catch (err) {
            console.error('popup: proofread error', err);
            outputArea.value = `Proofread error: ${err.message || err}`;
            showToast('Proofread error', 'error');
        } finally {
            if (loadingText) loadingText.textContent = 'Processing...';
            setUILoading(false);
        }
    }

    if (proofreadBtn) proofreadBtn.addEventListener('click', handleProofread);

    // --- Mock mode handling: load mocks when enabled ---
    const MOCK_MODE_KEY = 'mockMode_v1';

    async function loadMockScripts() {
        try {
            const files = ['popup/translator-mock.js','popup/language-detector-mock.js','popup/summarizer-mock.js','popup/writer-mock.js','popup/rewriter-mock.js','popup/prompt-mock.js'];
            for (const f of files) {
                try {
                    const text = await fetch(chrome.runtime.getURL(f)).then(r => r.text());
                    // eslint-disable-next-line no-eval
                    eval(text);
                } catch (e) { console.warn('Failed to load mock', f, e); }
            }
            // attach mocks to global names expected by popup
            try { if (window.TranslatorMock) window.Translator = window.TranslatorMock; } catch (e) {}
            try { if (window.LanguageDetectorMock) window.LanguageDetector = window.LanguageDetectorMock; } catch (e) {}
            try { if (window.SummarizerMock) window.Summarizer = window.SummarizerMock; } catch (e) {}
            try { if (window.WriterMock) window.Writer = window.WriterMock; } catch (e) {}
            try { if (window.LanguageModelMock) window.LanguageModel = window.LanguageModelMock; } catch (e) {}
            try { if (window.ProofreaderMock) window.Proofreader = window.ProofreaderMock; } catch (e) {}
            showToast('Mock mode enabled', 'success', 1200);
        } catch (e) { console.error('loadMockScripts error', e); }
    }

    // Initialize mock mode checkbox from storage
    (async function initMockMode() {
        try {
            const items = await storageGet([MOCK_MODE_KEY]);
            const m = items[MOCK_MODE_KEY];
            if (m && mockModeCheckbox) {
                mockModeCheckbox.checked = true;
                await loadMockScripts();
            }
        } catch (e) { /* ignore */ }
    })();

    if (mockModeCheckbox) {
        mockModeCheckbox.addEventListener('change', async (e) => {
            const enabled = !!e.target.checked;
            await storageSet({ [MOCK_MODE_KEY]: enabled });
            if (enabled) await loadMockScripts();
            showToast(`Mock mode ${enabled ? 'enabled' : 'disabled'}`, 'default', 1200);
        });
    }

    // Initial load of saved notes history (defined in storage.js)
    if (typeof loadAllNotes === 'function') {
        loadAllNotes();
    }
    // Wire session control buttons
    if (sessionCreateBtn) sessionCreateBtn.addEventListener('click', createSessionExplicit);
    if (sessionCloneBtn) sessionCloneBtn.addEventListener('click', cloneSessionExplicit);
    if (sessionAbortBtn) sessionAbortBtn.addEventListener('click', abortSessionExplicit);
    if (sessionDestroyBtn) sessionDestroyBtn.addEventListener('click', destroySessionExplicit);

    // Initialize session UI
    updateSessionUI();
});
