// popup/rewriter-mock.js
// Simple mock for the Rewriter API (browser + Node friendly)

function createMockRewriterAPI() {
    async function availability() {
        return 'available';
    }

    async function create(options = {}) {
        // simulate download progress if monitor provided
        if (options && typeof options.monitor === 'function') {
            const m = {
                addEventListener: (name, cb) => {
                    if (name === 'downloadprogress') {
                        (async () => {
                            for (let i = 1; i <= 6; i++) {
                                await new Promise(r => setTimeout(r, 50));
                                cb({ loaded: i / 6 });
                            }
                        })();
                    }
                }
            };
            options.monitor(m);
        }

        const rewriter = {
            async rewrite(text, opts) {
                await new Promise(r => setTimeout(r, 120));
                // naive polite rewrite: prefix and soften language
                const t = String(text).trim();
                const softened = t.replace(/\b(can't|cant)\b/gi, "couldn't").replace(/\b(It's not good enough)\b/gi, "It could be improved");
                return `Rewritten (tone=${options.tone||'as-is'}): ${softened.slice(0,200)}${softened.length>200?'...':''}`;
            },
            async *rewriteStreaming(text, opts) {
                const t = String(text).trim();
                const chunkSize = 40;
                for (let i = 0; i < t.length; i += chunkSize) {
                    await new Promise(r => setTimeout(r, 60));
                    yield t.slice(i, i + chunkSize).toUpperCase(); // mock transform
                }
            },
            destroy() {
                // no-op for mock
            }
        };

        return new Promise(resolve => setTimeout(() => resolve(rewriter), 120));
    }

    return { availability, create };
}

if (typeof window !== 'undefined') {
    window.RewriterMock = createMockRewriterAPI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockRewriterAPI };
}
