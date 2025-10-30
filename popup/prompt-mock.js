// popup/prompt-mock.js
// Simple mock for a LanguageModel / Prompt API (browser + Node friendly)

function createMockLanguageModelAPI() {
    async function availability() {
        return 'available';
    }

    async function params() {
        return { defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2 };
    }

    async function create(options = {}) {
        // simulate download progress
        if (options && typeof options.monitor === 'function') {
            const m = { addEventListener: (name, cb) => {
                if (name === 'downloadprogress') {
                    (async () => {
                        for (let i = 1; i <= 8; i++) {
                            await new Promise(r => setTimeout(r, 40));
                            cb({ loaded: i / 8 });
                        }
                    })();
                }
            }};
            options.monitor(m);
        }

        const session = {
            async prompt(text, opts) {
                // Very simple: answer with a reflected response
                await new Promise(r => setTimeout(r, 100));
                // If options asked for JSON schema maybe return JSON true/false
                if (opts && opts.responseConstraint && opts.responseConstraint.type === 'boolean') {
                    // crude heuristic
                    const t = String(text).toLowerCase();
                    const isPottery = /pottery|mug|bowl|ceramic/.test(t);
                    return JSON.stringify(Boolean(isPottery));
                }
                return `Mock response to: ${String(text).slice(0, 300)}${String(text).length>300?'...':''}`;
            },
            async *promptStreaming(text, opts) {
                const t = String(text);
                const chunkSize = 40;
                for (let i = 0; i < t.length; i += chunkSize) {
                    await new Promise(r => setTimeout(r, 60));
                    yield t.slice(i, i + chunkSize);
                }
            },
            async clone() {
                // return a lightweight copy with same methods
                return session;
            },
            destroy() { /* no-op */ }
        };

        return new Promise(resolve => setTimeout(() => resolve(session), 120));
    }

    return { availability, params, create };
}

if (typeof window !== 'undefined') {
    window.LanguageModelMock = createMockLanguageModelAPI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockLanguageModelAPI };
}
