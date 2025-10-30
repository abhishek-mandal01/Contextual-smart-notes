// Simple Node-compatible test for the Translator mock
// Run with: node popup/tests/translator_mock_test.js
const { createMockTranslatorAPI } = require('../translator-mock');

(async function run() {
    const api = createMockTranslatorAPI();
    console.log('Testing availability en->fr...');
    const avail = await api.availability({ sourceLanguage: 'en', targetLanguage: 'fr' });
    console.log('Availability:', avail);

    console.log('Creating translator...');
    const translator = await api.create({ sourceLanguage: 'en', targetLanguage: 'fr', monitor(m) { m.addEventListener('downloadprogress', (e) => { console.log('progress', Math.round(e.loaded*100)+'%'); }); } });

    console.log('Translating short text...');
    const r = await translator.translate('Hello world');
    console.log('Result:', r);

    console.log('Streaming translation...');
    const stream = translator.translateStreaming('Hello world. This is a test!');
    let out = '';
    for await (const chunk of stream) {
        console.log('chunk:', chunk);
        out += chunk;
    }
    console.log('Full streamed:', out);
    console.log('Mock translator tests completed.');
})();
