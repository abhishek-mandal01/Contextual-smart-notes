// Simple Node-compatible test for the LanguageDetector mock
// Run with: node popup/tests/language_detector_mock_test.js
const { createMockLanguageDetectorAPI } = require('../language-detector-mock');

(async function run() {
    const api = createMockLanguageDetectorAPI();
    console.log('Creating detector...');
    const detector = await api.create({ monitor(m) { m.addEventListener('downloadprogress', (e) => { console.log('progress', Math.round(e.loaded*100)+'%'); }); } });

    console.log('Detecting German sample...');
    const results = await detector.detect('Hallo und herzlich willkommen!');
    console.log('Results:', results);

    console.log('Detecting English sample...');
    const results2 = await detector.detect('Hello world, this is a test.');
    console.log('Results:', results2);

    console.log('LanguageDetector mock tests completed.');
})();
