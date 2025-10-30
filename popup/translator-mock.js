// popup/translator-mock.js
// A small Translator API mock usable in browser tests and Node (CommonJS).
// It exports createMockTranslatorAPI() for Node tests (module.exports) and
// attaches a global `TranslatorMock` in browsers when loaded.

function createMockTranslatorAPI() {
    // Simple availability: return 'available' for common pairs, otherwise 'unavailable'
    async function availability({ sourceLanguage, targetLanguage }) {
        // treat 'auto' as available to many targets
        if (!sourceLanguage || sourceLanguage === 'auto') return 'available';
        const pair = `${sourceLanguage}-${targetLanguage}`.toLowerCase();
        const supported = new Set(['en-fr','en-es','en-de','fr-en','es-en']);
        return supported.has(pair) ? 'available' : 'unavailable';
    }

    async function create({ sourceLanguage, targetLanguage, monitor } = {}) {
        // Simulate asynchronous creation and optional download progress
        const translator = {
            async translate(text) {
                // Simple mock: prefix with target language code
                return `[${targetLanguage}] ${text}`;
            },
            async *translateStreaming(text) {
                // Split into sentence-like chunks
                const chunks = String(text).split(/([.!?]\s+)/).filter(Boolean);
                for (const c of chunks) {
                    // simulate delay
                    await new Promise(r => setTimeout(r, 50));
                    yield `[${targetLanguage}] ${c}`;
                }
            }
        };

        // simulate download progress events via monitor
        if (monitor && typeof monitor === 'function') {
            const m = {
                addEventListener: (name, cb) => {
                    if (name === 'downloadprogress') {
                        // fake progress
                        (async () => {
                            for (let i=1;i<=10;i++) {
                                await new Promise(r => setTimeout(r,40));
                                cb({ loaded: i/10 });
                            }
                        })();
                    }
                }
            };
            monitor(m);
        }

        return new Promise(resolve => setTimeout(() => resolve(translator), 120));
    }

    return { availability, create };
}

// Browser global
if (typeof window !== 'undefined') {
    try { window.TranslatorMock = createMockTranslatorAPI(); } catch (e) { }
}

// Node export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockTranslatorAPI };
}
