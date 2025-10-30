// storage.js - Wrapper for IndexedDB (The replacement for localStorage/sessionStorage)

const DB_NAME = 'SmartNotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

let db;

// 1. Open the database
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = event => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(new Error('Database error'));
        };

        request.onsuccess = event => {
            db = event.target.result;
            try { console.log('storage.js: openDB success, db ready'); } catch (e) { }
            resolve(db);
        };

        request.onupgradeneeded = event => {
            db = event.target.result;
            try { console.log('storage.js: onupgradeneeded - creating object store if needed'); } catch (e) { }
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// 2. Save a new note
// Accepts both the source text (original selection) and the generated note content.
async function saveNote(source, content) {
    if (!db) await openDB();
    try { console.log('storage.js: saving note, source length:', (source || '').length); } catch (e) { }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const note = {
        source: source || '',
        content: content,
        timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        const request = store.add(note);
        request.onsuccess = async () => {
            try { console.log('storage.js: saveNote success id=', request.result); } catch (e) { }
            // Refresh the UI list after successful save (if popup is open)
            try { await loadAllNotes(); } catch (e) { /* ignore UI refresh errors */ }
            resolve(request.result);
        };
        request.onerror = () => {
            console.error('storage.js: saveNote error', request.error);
            reject(request.error);
        };
    });
}

// 3. Get all notes (data-only helper)
async function getAllNotes() {
    if (!db) await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            try { console.log('storage.js: getAllNotes retrieved', request.result.length); } catch (e) { }
            resolve(request.result.reverse()); // Reverse to show latest first
        };
        request.onerror = () => {
            console.error('storage.js: getAllNotes error', request.error);
            reject(request.error);
        };
    });
}

// 4. Delete a note
async function deleteNote(id) {
    if (!db) await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => {
            try { console.log('storage.js: deleteNote success id=', id); } catch (e) { }
            resolve();
        };
        request.onerror = () => {
            console.error('storage.js: deleteNote error', request.error);
            reject(request.error);
        };
    });
}

// 5. UI function to load and render notes (popup calls this on load)
async function loadAllNotes() {
    try {
        const notes = await getAllNotes();
        try { console.log('storage.js: loadAllNotes rendering', notes ? notes.length : 0); } catch (e) { }
        const listContainer = document.getElementById('saved-notes-list');
        if (!listContainer) return; // If popup not open, nothing to render
        listContainer.innerHTML = '';

        if (!notes || notes.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">No notes saved yet.</p>';
            return;
        }

        notes.forEach(note => {
            const date = new Date(note.timestamp).toLocaleString();
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            noteDiv.innerHTML = `
                <div class="note-content">
                    <strong>${date}</strong><br/>
                    <em>Source:</em> ${escapeHtml(note.source || '')}<br/>
                    <div>${escapeHtml(note.content)}</div>
                </div>
                <button class="note-delete" data-id="${note.id}">X</button>
            `;
            listContainer.appendChild(noteDiv);
        });

        // Add delete listeners
        listContainer.querySelectorAll('.note-delete').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                if (confirm('Are you sure you want to delete this note?')) {
                    await deleteNote(id);
                    await loadAllNotes();
                }
            });
        });

    } catch (e) {
        const container = document.getElementById('saved-notes-list');
        if (container) container.innerHTML = `<p style="color:red;">Error loading notes: ${e.message}</p>`;
    }
}

// small helper to avoid injecting raw HTML
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
