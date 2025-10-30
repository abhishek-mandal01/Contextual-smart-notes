// popup/summarizer-mock.js
// Simple mock for the Summarizer API (browser + Node friendly)

function createMockSummarizerAPI() {
    async function availability() {
        // For testing, report available
        return 'available';
    }

    async function create(options = {}) {
        // Simulate monitor progress
        if (options && typeof options.monitor === 'function') {
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
            options.monitor(m);
        }

        const summarizer = {
            async summarize(text, opts) {
                // Very simple summary: return first N sentences
                const t = String(text);
                const sentences = t.match(/[^.!?]+[.!?]*/g) || [t];
                const take = Math.min(3, sentences.length);
                return sentences.slice(0, take).join(' ').trim();
            },
            async *summarizeStreaming(text, opts) {
                const t = String(text);
                const sentences = t.match(/[^.!?]+[.!?]*/g) || [t];
                for (const s of sentences) {
                    await new Promise(r => setTimeout(r, 60));
                    yield s.trim();
                }
            }
        };

        return new Promise(resolve => setTimeout(() => resolve(summarizer), 120));
    }

    return { availability, create };
}

if (typeof window !== 'undefined') {
    window.SummarizerMock = createMockSummarizerAPI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockSummarizerAPI };
}
