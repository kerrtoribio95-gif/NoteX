/* ==========================================================================
   DATA STORE: SAFE PERSISTENCE & TYPE SANITIZATION
   ========================================================================== */

/* ==========================================================================
   SUPABASE REALTIME CLOUD SYNC CONFIG
   ========================================================================== */
const SUPABASE_URL = 'https://abuvtbvpdukpjzqnglpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidXZ0YnZwZHVrcGp6cW5nbHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzMwNjYsImV4cCI6MjEwNDU0OTA2Nn0.54Vj24v-GEgDdYkPjVNqiM_KbQ3xoRoOcgS_Il4fC7M';
const SYNC_ROOM_ID = 'notex_vault_main';

const supabaseClient = (window.supabase && SUPABASE_ANON_KEY !== 'PASTE_YOUR_COPIED_ANON_KEY_HERE')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
const STORAGE_KEY = 'NoteX_StudySuite_Data_v3';
const THEME_KEY = 'NoteX_Theme_Mode';
const EXAM_PREFS_KEY = 'NoteX_Exam_Preferences';

let appData = {
    subjects: [],
    decks: [],
    cards: [],
    telemetry: {
        totalStudyTimeSec: 0,
        totalResponses: 0
    }
};

function sanitizeData(data) {
    if (!data || typeof data !== 'object') return null;
    data.subjects = Array.isArray(data.subjects) ? data.subjects : [];
    data.decks = Array.isArray(data.decks) ? data.decks : [];
    data.cards = Array.isArray(data.cards) ? data.cards : [];

    data.subjects.forEach(s => { s.id = String(s.id); });
    data.decks.forEach(d => {
        d.id = String(d.id);
        d.subjectId = String(d.subjectId);
    });
    data.cards.forEach(c => {
        c.id = String(c.id);
        c.deckId = String(c.deckId);
    });

    if (!data.telemetry) data.telemetry = { totalStudyTimeSec: 0, totalResponses: 0 };
    return data;
}

async function loadAppData() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    // 1. Offline fallback
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
        try {
            const parsed = JSON.parse(saved);
            const sanitized = sanitizeData(parsed);
            if (sanitized) appData = sanitized;
            else initDefaultData();
        } catch (e) {
            initDefaultData();
        }
    } else {
        initDefaultData();
    }

    // 2. Cloud pull (Strictly read-only)
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('app_sync')
                .select('data')
                .eq('id', SYNC_ROOM_ID)
                .maybeSingle();

            if (data && data.data) {
                const remoteSanitized = sanitizeData(data.data);
                if (remoteSanitized && remoteSanitized.subjects && remoteSanitized.subjects.length > 0) {
                    appData = remoteSanitized;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
                    renderNavigation();
                    if (currentActiveView === 'dashboard') renderDashboard();
                }
            }
        } catch (err) {
            console.warn('Cloud fetch bypassed:', err);
        }
    }
}

async function saveAppData() {
    // 1. HARD GUARD: Block pushing default or empty starter data to the cloud
    if (!appData || !appData.subjects || appData.subjects.length < 3) {
        console.warn('Sync Guard: Prevented blank/starter state from overwriting Supabase vault.');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        return;
    }

    // 2. Persist locally
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

    // 3. Persist to cloud
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('app_sync')
                .upsert({
                    id: SYNC_ROOM_ID,
                    data: appData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (err) {
            console.warn('Cloud sync error:', err);
        }
    }
}

function initDefaultData() {
    const sub1 = { id: generateId(), name: 'Data Communications', color: '#0D82FF' };
    const sub2 = { id: generateId(), name: 'Software Architecture', color: '#10B981' };


    const deck1 = { id: generateId(), subjectId: sub1.id, title: 'Transport Layer Protocols', period: 'Midterm', lastStudied: new Date().toISOString() };
    const deck2 = { id: generateId(), subjectId: sub2.id, title: 'Clean Architecture Principles', period: 'Prelim', lastStudied: new Date().toISOString() };

    const defaultCards = [
        { id: generateId(), deckId: deck1.id, type: 'identification', prompt: 'Resolves IP addresses to MAC hardware addresses on local networks.', answer: 'ARP', consecutiveCorrect: 3, totalAttempts: 4, misses: 1 },
        { id: generateId(), deckId: deck1.id, type: 'identification', prompt: 'Provides reliable, ordered, and error-checked delivery of a stream of octets.', answer: 'TCP', consecutiveCorrect: 4, totalAttempts: 4, misses: 0 },
        { id: generateId(), deckId: deck1.id, type: 'tf', prompt: 'UDP uses a three-way handshake before transmitting payload packets.', answer: 'False', consecutiveCorrect: 2, totalAttempts: 3, misses: 1 },
        { id: generateId(), deckId: deck1.id, type: 'enumeration', prompt: 'Standard TCP Handshake Steps', answer: 'SYN, SYN-ACK, ACK', consecutiveCorrect: 1, totalAttempts: 2, misses: 1 },
        { id: generateId(), deckId: deck2.id, type: 'identification', prompt: 'Software design pattern separating UI, logic, and persistence.', answer: 'MVC', consecutiveCorrect: 0, totalAttempts: 3, misses: 3 }
    ];

    appData = {
        subjects: [sub1, sub2],
        decks: [deck1, deck2],
        cards: defaultCards,
        telemetry: { totalStudyTimeSec: 420, totalResponses: 16 }
    };
    saveAppData();
}

const escapeHTML = str => (typeof str !== 'string' ? '' : str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)));
const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function timeAgo(dateString) {
    if (!dateString) return 'Never';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[a.length][b.length];
}

function showToast(msg, onUndo = null) {
    const shelf = document.getElementById('toast-shelf');
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xl border border-white/10 text-xs font-bold transition duration-300 opacity-0 translate-y-2';

    let undoBtn = '';
    if (onUndo) {
        undoBtn = `<button id="toast-undo-btn" class="text-blue-400 dark:text-blue-600 underline font-black hover:opacity-80">Undo</button>`;
    }

    toast.innerHTML = `<span>${escapeHTML(msg)}</span> ${undoBtn}`;
    shelf.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
    });

    if (onUndo) {
        toast.querySelector('#toast-undo-btn').onclick = () => {
            onUndo();
            dismiss();
        };
    }

    const timeout = setTimeout(dismiss, 7000);

    function dismiss() {
        clearTimeout(timeout);
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }
}

