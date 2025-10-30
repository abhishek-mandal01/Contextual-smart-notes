// popup/options.js
document.addEventListener('DOMContentLoaded', async () => {
  const MOCK_MODE_KEY = 'mockMode_v1';
  const AVAIL_CACHE_KEY = 'translatorAvailCache_v1';
  const SUMMARIZER_AVAIL_KEY = 'summarizerAvail_v1';
  const DETECTOR_CACHE_KEY = 'languageDetectorReady_v1';

  const mockCheckbox = document.getElementById('opt-mock');
  const clearBtn = document.getElementById('clear-caches');

  function storageGet(keys) {
    return new Promise((resolve) => {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, (items) => resolve(items || {}));
        } else {
          const out = {};
          keys.forEach(k => { try { out[k] = JSON.parse(sessionStorage.getItem(k)); } catch (e) { out[k]=undefined; } });
          resolve(out);
        }
      } catch (e) { resolve({}); }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(obj, () => resolve());
        } else {
          Object.keys(obj).forEach(k => { try { sessionStorage.setItem(k, JSON.stringify(obj[k])); } catch (e) {} });
          resolve();
        }
      } catch (e) { resolve(); }
    });
  }

  function storageRemove(keys) {
    return new Promise((resolve) => {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(keys, () => resolve());
        } else {
          keys.forEach(k => { try { sessionStorage.removeItem(k); } catch (e) {} });
          resolve();
        }
      } catch (e) { resolve(); }
    });
  }

  // initialize
  const items = await storageGet([MOCK_MODE_KEY]);
  if (items[MOCK_MODE_KEY]) mockCheckbox.checked = true;

  mockCheckbox.addEventListener('change', async (e) => {
    await storageSet({ [MOCK_MODE_KEY]: !!e.target.checked });
  });

  clearBtn.addEventListener('click', async () => {
    await storageRemove([AVAIL_CACHE_KEY, SUMMARIZER_AVAIL_KEY, DETECTOR_CACHE_KEY]);
    alert('Caches cleared.');
  });
});
