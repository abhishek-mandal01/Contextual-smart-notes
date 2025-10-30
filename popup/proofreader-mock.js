// popup/proofreader-mock.js
// Simple mock for the Proofreader API

function createMockProofreaderAPI() {
    async function availability(opts) {
        // accept options but always say available in mock
        return 'available';
    }

    async function create(options = {}) {
        // simulate download progress
        if (options && typeof options.monitor === 'function') {
            const m = { addEventListener: (name, cb) => {
                if (name === 'downloadprogress') {
                    (async () => {
                        for (let i = 1; i <= 6; i++) {
                            await new Promise(r => setTimeout(r, 50));
                            cb({ loaded: i / 6 });
                        }
                    })();
                }
            }};
            options.monitor(m);
        }

        const proofreader = {
            async proofread(text) {
                // naive corrections: common typos
                const corrections = [];
                let t = String(text);
                // example fixes
                const fixes = [
                    { from: /\bI seen\b/gi, to: "I saw", explain: "Verb tense", suggest: ["I saw"] },
                    { from: /\bloafs\b/gi, to: "loaves", explain: "Plural form", suggest: ["loaves"] },
                    { from: /\bcan't\b/gi, to: "couldn't", explain: "Tone suggestion", suggest: ["couldn't"] }
                ];
                let idxShift = 0;
                for (const f of fixes) {
                    const match = t.match(f.from);
                    if (match) {
                        // find first occurrence index
                        const m = f.from.exec(String(text));
                        const start = m ? m.index : -1;
                        if (start >= 0) {
                            const end = start + m[0].length;
                            corrections.push({ startIndex: start, endIndex: end, type: 'replacement', explanation: f.explain, suggestions: f.suggest, replacement: f.to });
                            // apply replacement on t (first occurrence only)
                            t = t.replace(f.from, f.to);
                        }
                    }
                }

                return { corrected: t, corrections };
            },
            destroy() { /* no-op */ }
        };

        return new Promise(resolve => setTimeout(() => resolve(proofreader), 120));
    }

    return { availability, create };
}

if (typeof window !== 'undefined') {
    window.ProofreaderMock = createMockProofreaderAPI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockProofreaderAPI };
}
