// popup/language-detector-mock.js
// Simple mock for the LanguageDetector API usable in browser and Node.

function createMockLanguageDetectorAPI() {
    async function create({ monitor } = {}) {
        // simulate download progress if monitor provided
        if (monitor && typeof monitor === 'function') {
            const m = {
                addEventListener: (name, cb) => {
                    if (name === 'downloadprogress') {
                        (async () => {
                            for (let i = 1; i <= 8; i++) {
                                await new Promise(r => setTimeout(r, 40));
                                cb({ loaded: i / 8 });
                            }
                        })();
                    }
                }
            };
            monitor(m);
        }

        const detector = {
            async detect(text) {
                // Very small heuristic: look for common words
                const t = String(text).toLowerCase();
                const scores = [];
                if (/\b(the|and|is|this|that)\b/.test(t)) scores.push({ detectedLanguage: 'en', confidence: 0.9 });
                if (/\b(le|la|et|est|ce)\b/.test(t)) scores.push({ detectedLanguage: 'fr', confidence: 0.85 });
                if (/\b(hola|que|el|la|es)\b/.test(t)) scores.push({ detectedLanguage: 'es', confidence: 0.85 });
                if (/\b(hallo|und|das|ist)\b/.test(t)) scores.push({ detectedLanguage: 'de', confidence: 0.85 });
                if (scores.length === 0) {
                    // fallback: return unknown with low confidence
                    return [{ detectedLanguage: 'und', confidence: 0.2 }];
                }
                return scores;
            }
        };

        return new Promise(resolve => setTimeout(() => resolve(detector), 120));
    }

    return { create };
}

if (typeof window !== 'undefined') {
    window.LanguageDetectorMock = createMockLanguageDetectorAPI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockLanguageDetectorAPI };
}
