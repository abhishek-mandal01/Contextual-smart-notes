// content.js
// This script runs in the context of the active webpage.

// Global variable to hold the last selected text or image/audio source
let lastSelectedContent = {
    type: 'text',
    data: ''
};

// Listener for mouse selection events (text selection)
document.addEventListener('mouseup', () => {
    // 1. Check for selected text
    const selectedText = window.getSelection().toString().trim();

    if (selectedText.length > 0) {
        lastSelectedContent = {
            type: 'text',
            data: selectedText
        };

        // Debug: log selection and dispatched message
        try {
            console.log('content.js: mouseup selection detected:', selectedText);
        } catch (e) { /* ignore logging errors in some pages */ }

        // Send the selected content to the popup. Send the full object so we can
        // extend to images/audio later. Popup will accept either a string or an object.
        chrome.runtime.sendMessage({
            action: "textSelected",
            data: lastSelectedContent
        }, (resp) => {
            // Optional callback to detect any sendMessage errors in some contexts
            try { console.log('content.js: sendMessage callback', resp); } catch (e) { }
        });
    }
});

// Listener for dragging or clicking on images/audio to capture their source
function handleMediaSelect(el) {
    try {
        if (!el) return;
        if (el.tagName === 'IMG') {
            lastSelectedContent = { type: 'image', data: el.src || '' };
        } else if (el.tagName === 'AUDIO' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE') {
            // prefer src attribute on element, fallback to currentSrc
            const src = el.src || el.currentSrc || (el.querySelector && (el.querySelector('source') || {}).src) || '';
            lastSelectedContent = { type: 'audio', data: src };
        } else {
            return;
        }

        try { console.log('content.js: media selected', lastSelectedContent); } catch (e) {}

        chrome.runtime.sendMessage({ action: 'textSelected', data: lastSelectedContent }, (resp) => {
            try { console.log('content.js: media sendMessage callback', resp); } catch (e) {}
        });
    } catch (e) { /* ignore */ }
}

// capture dragstart on media elements (images, audio, video)
document.addEventListener('dragstart', (ev) => {
    try {
        const el = ev.target;
        if (!el) return;
        if (el.tagName === 'IMG' || el.tagName === 'AUDIO' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE') {
            handleMediaSelect(el);
        }
    } catch (e) { }
}, true);

// capture clicks on media elements as a lightweight selection mechanism
document.addEventListener('click', (ev) => {
    try {
        const el = ev.target;
        if (!el) return;
        if (el.tagName === 'IMG' || el.tagName === 'AUDIO' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE') {
            handleMediaSelect(el);
        }
    } catch (e) { }
}, true);

// Listener to respond to explicit requests from the popup for the current selection
// The popup uses this method when it opens to ensure it doesn't miss the selection.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSelection") {
        try { console.log('content.js: getSelection request received, returning selection.'); } catch (e) { }
        // Send the last stored selection back to the popup immediately
        sendResponse({ data: lastSelectedContent.data });
        return true; // Keep for compatibility with async handlers
    }
    // Handle any other messages here if necessary
});

// Note: In later phases (Phase 3), we will enhance this script to detect image/audio drag events.
