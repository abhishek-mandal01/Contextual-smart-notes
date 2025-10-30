// Simple Node-compatible test for the Summarizer mock
// Run with: node popup/tests/summarizer_mock_test.js
const { createMockSummarizerAPI } = require('../summarizer-mock');

(async function run() {
    const api = createMockSummarizerAPI();
    console.log('Checking summarizer availability...');
    const avail = await api.availability();
    console.log('Availability:', avail);

    console.log('Creating summarizer...');
    const summ = await api.create({ monitor(m) { m.addEventListener('downloadprogress', (e) => { console.log('progress', Math.round(e.loaded*100)+'%'); }); } });

    console.log('Running batch summarize...');
    const res = await summ.summarize('This is sentence one. This is sentence two. This is sentence three. This is sentence four.');
    console.log('Batch result:', res);

    console.log('Running streaming summarize...');
    const stream = summ.summarizeStreaming('This is sentence A. This is sentence B.');
    for await (const chunk of stream) {
        console.log('chunk:', chunk);
    }

    console.log('Summarizer mock tests completed.');
})();
