// popup/writer-mock.js
// Simple mock for the Writer API (browser + Node friendly)

function createMockWriterAPI() {
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

        const writer = {
            async write(prompt, opts) {
                // Very naive: echo with "Written:" prefix and modest transformation
                await new Promise(r => setTimeout(r, 120));
                return `Written (tone=${options.tone||'default'};len=${options.length||'med'}): ${String(prompt).trim().slice(0,100)}${String(prompt).length>100? '...':''}`;
            },
            async *writeStreaming(prompt, opts) {
                const t = String(prompt).trim();
                const chunkSize = 40;
                for (let i = 0; i < t.length; i += chunkSize) {
                    await new Promise(r => setTimeout(r, 60));
                    yield t.slice(i, i + chunkSize);
                }
            },
            destroy() {
                // no-op for mock
            }
        };

        return new Promise(resolve => setTimeout(() => resolve(writer), 120));
    }

    return { availability, create };
}

if (typeof window !== 'undefined') {
    window.WriterMock = createMockWriterAPI();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMockWriterAPI };
}
