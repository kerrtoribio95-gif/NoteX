
/* ==========================================================================
   ID GENERATOR
   ========================================================================== */
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'idx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/* ==========================================================================
   PWA DYNAMIC MANIFEST & SERVICE WORKER
   ========================================================================== */
function initPWA() {
    const iconUrl = './logo.png';

    const manifestData = {
        name: "NoteX Study Suite",
        short_name: "NoteX",
        description: "Liquid Glass Flashcards and Active Recall Suite",
        start_url: "./index.html",
        display: "standalone",
        background_color: "#0B0F17",
        theme_color: "#0D82FF",
        icons: [
            {
                src: iconUrl,
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ]
    };

    const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
    document.getElementById('manifest-link').href = URL.createObjectURL(manifestBlob);

    // Favicon & Apple Touch Icon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = iconUrl;

    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = iconUrl;
    document.head.appendChild(appleIcon);

    // Register service worker safely
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        fetch('./sw.js', { method: 'HEAD' })
            .then((res) => {
                const contentType = res.headers.get('content-type') || '';
                if (res.ok && contentType.includes('javascript')) {
                    return navigator.serviceWorker.register('./sw.js');
                }
            })
            .catch(() => { });
    }
}

/* ==========================================================================
   MODULE 1: WEBGL PEARL FLUID MESH (LIGHT & DARK MODE READY)
   ========================================================================== */
const pearlCanvas = document.getElementById('webgl-pearl-canvas');
let gl = pearlCanvas.getContext('webgl');
let shaderProgram = null;
let uDarkLoc, uTimeLoc, uResLoc;
let animationFrameId = null;

const vsSource = `
      attribute vec2 a_pos;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

const fsSource = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_dark;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= u_res.x / u_res.y;

        // Fluid displacement
        float t = u_time * 0.35;
        for (float i = 1.0; i < 4.0; i++) {
          uv.x += 0.35 / i * sin(i * 2.5 * uv.y + t + i * 1.5);
          uv.y += 0.35 / i * cos(i * 2.5 * uv.x + t * 0.8 + i * 2.0);
        }

        // Light Theme Palette: Alabaster & Iridescent Pearl
        vec3 lShadow = vec3(0.580, 0.639, 0.722); // Soft Slate Crease
        vec3 lBase   = vec3(0.886, 0.910, 0.941); // Muted Mist
        vec3 lPearl  = vec3(0.973, 0.980, 0.988); // Pure Alabaster
        vec3 lGlow   = vec3(0.992, 0.910, 0.914); // Rose Quartz Sheen

        // Dark Theme Palette: Deep Obsidian & Onyx Pearl
        vec3 dShadow = vec3(0.024, 0.035, 0.060); // Deepest Void
        vec3 dBase   = vec3(0.043, 0.060, 0.095); // Dark Slate Base
        vec3 dPearl  = vec3(0.080, 0.110, 0.170); // Elevated Slate
        vec3 dGlow   = vec3(0.080, 0.050, 0.140); // Deep Violet Sheen

        float wave  = sin(uv.x * 2.0 + uv.y * 3.0) * 0.5 + 0.5;
        float wave2 = cos(uv.x * 1.5 - uv.y * 2.0) * 0.5 + 0.5;

        // Blend Light Layer
        vec3 colLight = mix(lBase, lShadow, wave * 0.65);
        colLight = mix(colLight, lPearl, wave2 * 0.85);
        colLight = mix(colLight, lGlow, smoothstep(0.68, 0.96, wave * wave2));

        // Blend Dark Layer
        vec3 colDark = mix(dBase, dShadow, wave * 0.65);
        colDark = mix(colDark, dPearl, wave2 * 0.85);
        colDark = mix(colDark, dGlow, smoothstep(0.68, 0.96, wave * wave2));

        // Transition smoothly between Light & Dark modes
        vec3 finalColor = mix(colLight, colDark, u_dark);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

function initWebGL() {
    if (!gl) return;
    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vs);
    gl.attachShader(shaderProgram, fs);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(shaderProgram, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uResLoc = gl.getUniformLocation(shaderProgram, 'u_res');
    uTimeLoc = gl.getUniformLocation(shaderProgram, 'u_time');
    uDarkLoc = gl.getUniformLocation(shaderProgram, 'u_dark');
    resizeWebGL();
}

function resizeWebGL() {
    pearlCanvas.width = window.innerWidth;
    pearlCanvas.height = window.innerHeight;
    if (gl) {
        gl.viewport(0, 0, pearlCanvas.width, pearlCanvas.height);
        gl.uniform2f(uResLoc, pearlCanvas.width, pearlCanvas.height);
    }
}
window.addEventListener('resize', resizeWebGL);

function renderWebGL(time) {
    if (!gl || !shaderProgram) return;
    const isDark = document.body.classList.contains('dark') ? 1.0 : 0.0;
    gl.uniform2f(uResLoc, pearlCanvas.width, pearlCanvas.height);
    gl.uniform1f(uTimeLoc, time * 0.001);
    gl.uniform1f(uDarkLoc, isDark);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationFrameId = requestAnimationFrame(renderWebGL);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
        animationFrameId = requestAnimationFrame(renderWebGL);
    }
});

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

/* ==========================================================================
   ROBUST MODAL & DIALOG SUBSYSTEM
   ========================================================================== */
let currentDialogResolver = null;

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    const focusable = modal.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

function dismissAppDialog() {
    if (currentDialogResolver) {
        const resolve = currentDialogResolver;
        currentDialogResolver = null;
        resolve(null);
    }
    closeModal('modal-app-dialog');
}

function appAlert(title, message) {
    if (currentDialogResolver) { currentDialogResolver(null); currentDialogResolver = null; }
    return new Promise(resolve => {
        currentDialogResolver = resolve;
        const dialog = document.getElementById('modal-app-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = message;
        document.getElementById('dialog-input-wrapper').classList.add('hidden');

        const btns = document.getElementById('dialog-action-buttons');
        btns.innerHTML = `
          <button id="dialog-ok-btn" class="btn-action-pill px-5 py-2 rounded-xl text-xs font-black bg-[#0D82FF] text-white">OK</button>
        `;

        openModal('modal-app-dialog');
        document.getElementById('dialog-ok-btn').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve();
        };
    });
}

function appConfirm(title, message) {
    if (currentDialogResolver) { currentDialogResolver(null); currentDialogResolver = null; }
    return new Promise(resolve => {
        currentDialogResolver = (val) => resolve(!!val);
        const dialog = document.getElementById('modal-app-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = message;
        document.getElementById('dialog-input-wrapper').classList.add('hidden');

        const btns = document.getElementById('dialog-action-buttons');
        btns.innerHTML = `
          <button id="dialog-cancel-btn" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">Cancel</button>
          <button id="dialog-confirm-btn" class="btn-action-pill px-5 py-2 rounded-xl text-xs font-black bg-rose-500 text-white">Confirm</button>
        `;

        openModal('modal-app-dialog');
        document.getElementById('dialog-cancel-btn').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(false);
        };
        document.getElementById('dialog-confirm-btn').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(true);
        };
    });
}

function appPrompt(title, placeholder = '') {
    if (currentDialogResolver) { currentDialogResolver(null); currentDialogResolver = null; }
    return new Promise(resolve => {
        currentDialogResolver = resolve;
        const dialog = document.getElementById('modal-app-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = '';
        const inputWrap = document.getElementById('dialog-input-wrapper');
        const input = document.getElementById('dialog-prompt-input');
        inputWrap.classList.remove('hidden');
        input.value = '';
        input.placeholder = placeholder;

        const btns = document.getElementById('dialog-action-buttons');
        btns.innerHTML = `
          <button id="dialog-prompt-cancel" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">Cancel</button>
          <button id="dialog-prompt-save" class="btn-action-pill px-5 py-2 rounded-xl text-xs font-black bg-[#0D82FF] text-white">Save</button>
        `;

        openModal('modal-app-dialog');
        setTimeout(() => input.focus(), 50);

        const handleSave = () => {
            const val = input.value.trim();
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(val || null);
        };

        input.onkeydown = e => { if (e.key === 'Enter') handleSave(); };
        document.getElementById('dialog-prompt-save').onclick = handleSave;
        document.getElementById('dialog-prompt-cancel').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(null);
        };
    });
}

// Modal Backdrop Click & Escape Trapping
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            if (backdrop.id === 'modal-app-dialog') {
                dismissAppDialog();
            } else {
                closeModal(backdrop.id);
            }
        }
    });
});

window.addEventListener('keydown', e => {
    const openModals = Array.from(document.querySelectorAll('.modal-backdrop:not(.hidden)'));
    if (!openModals.length) return;
    const topModal = openModals[openModals.length - 1];

    if (e.key === 'Escape') {
        e.preventDefault();
        if (topModal.id === 'modal-app-dialog') {
            dismissAppDialog();
        } else {
            closeModal(topModal.id);
        }
        return;
    }

    if (e.key === 'Tab') {
        const focusable = topModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
});

/* ==========================================================================
   ROUTING & HISTORY STATE
   ========================================================================== */
let currentActiveView = 'dashboard';

function enterActivityView(viewName) {
    if (currentActiveView === 'dashboard') {
        history.pushState({ view: viewName }, '', '');
    }
    currentActiveView = viewName;
}

function navigateBack() {
    if (currentActiveView !== 'dashboard') {
        history.back();
    } else {
        renderDashboard();
    }
}

window.onpopstate = () => {
    clearInterval(quizCountdownTimer);
    activeFlashcardDeck = null;
    activeQuizState = null;
    currentActiveView = 'dashboard';
    renderDashboard();
};

/* ==========================================================================
   WORKSPACE & NAVIGATION
   ========================================================================== */
let currentSubjectFilter = 'All';
let currentPeriodFilter = 'All';
let searchQuery = '';
let isSidebarRail = false;

function handleSearch(val) {
    searchQuery = (val || '').trim().toLowerCase();
    document.getElementById('search-clear-btn').classList.toggle('hidden', !searchQuery);
    renderDashboard();
}

function clearSearch() {
    const input = document.getElementById('global-search-input');
    input.value = '';
    handleSearch('');
}

function toggleMobileSidebar(show) {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (show) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        toggleMobileSidebar(false);
    }
});

function toggleSidebarRail() {
    const sidebar = document.getElementById('app-sidebar');
    const textNodes = sidebar.querySelectorAll('.sidebar-text');
    const toggleIcon = document.getElementById('sidebar-rail-btn');

    isSidebarRail = !isSidebarRail;

    if (!isSidebarRail) {
        sidebar.classList.remove('md:w-[72px]');
        sidebar.classList.add('md:w-[270px]');
        textNodes.forEach(el => { el.style.display = ''; el.style.opacity = '1'; });
        toggleIcon.innerHTML = `<i data-lucide="panel-left-close" class="w-4 h-4"></i>`;
    } else {
        sidebar.classList.remove('md:w-[270px]');
        sidebar.classList.add('md:w-[72px]');
        textNodes.forEach(el => { el.style.display = 'none'; el.style.opacity = '0'; });
        toggleIcon.innerHTML = `<i data-lucide="panel-left-open" class="w-4 h-4"></i>`;
    }
    lucide.createIcons();
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    renderNavigation();
    if (currentActiveView === 'dashboard') renderDashboard();
}

function setPeriodFilter(period) {
    currentPeriodFilter = period;
    document.querySelectorAll('#period-button-group .period-pill').forEach(btn => {
        const active = btn.dataset.period === period;
        btn.className = active
            ? 'period-pill py-1.5 px-2 rounded-xl text-xs font-bold transition bg-[#0D82FF] text-white shadow-sm text-center'
            : 'period-pill py-1.5 px-2 rounded-xl text-xs font-semibold hover:bg-white/70 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition text-center';
    });
    document.getElementById('breadcrumb-period').innerText = period;
    renderDashboard();
}

function renderNavigation() {
    const list = document.getElementById('subject-nav-list');
    list.innerHTML = '';

    const isAllActive = currentSubjectFilter === 'All';
    const allItem = document.createElement('div');
    allItem.className = `flex items-center gap-2 p-2.5 rounded-2xl cursor-pointer text-xs font-bold transition ${isAllActive
            ? 'bg-[#0D82FF] text-white shadow-md shadow-blue-500/25'
            : 'hover:bg-white/50 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-300'
        }`;
    allItem.onclick = () => {
        currentSubjectFilter = 'All';
        document.getElementById('breadcrumb-subject').innerText = 'All Subjects';
        renderNavigation();
        renderDashboard();
        toggleMobileSidebar(false);
    };
    allItem.innerHTML = `<i data-lucide="layers" class="w-4 h-4 shrink-0"></i><span class="sidebar-text truncate">All Subjects</span>`;
    list.appendChild(allItem);

    appData.subjects.forEach(sub => {
        const isSubActive = String(currentSubjectFilter) === String(sub.id);
        const deckCount = appData.decks.filter(d => String(d.subjectId) === String(sub.id)).length;
        const color = sub.color || '#0D82FF';

        const item = document.createElement('div');
        item.className = `group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer text-xs font-semibold transition ${isSubActive ? 'text-white shadow-md font-bold' : 'hover:bg-white/50 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-300'
            }`;
        if (isSubActive) {
            item.style.backgroundColor = color;
            item.style.boxShadow = `0 10px 20px -5px ${color}55`;
        }

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2 truncate flex-1';
        left.onclick = () => {
            currentSubjectFilter = String(sub.id);
            document.getElementById('breadcrumb-subject').innerText = sub.name;
            renderNavigation();
            renderDashboard();
            toggleMobileSidebar(false);
        };

        left.innerHTML = `
          <i data-lucide="folder" class="w-4 h-4 shrink-0 transition" style="color: ${isSubActive ? '#FFFFFF' : color}"></i>
          <span class="sidebar-text truncate ${isSubActive ? 'text-white font-bold' : 'text-neutral-700 dark:text-neutral-200'}">${escapeHTML(sub.name)}</span>
        `;

        const right = document.createElement('div');
        right.className = 'sidebar-text flex items-center gap-1';
        right.innerHTML = `
          <button onclick="event.stopPropagation(); openEditSubjectModal('${escapeHTML(String(sub.id))}')" title="Edit Subject & Color" class="opacity-80 md:opacity-0 group-hover:opacity-100 p-1 ${isSubActive ? 'text-white hover:text-neutral-200' : 'text-neutral-400 hover:text-blue-500'} transition">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteSubject('${escapeHTML(String(sub.id))}')" title="Delete Subject" class="opacity-80 md:opacity-0 group-hover:opacity-100 p-1 ${isSubActive ? 'text-white hover:text-rose-200' : 'text-neutral-400 hover:text-rose-500'} transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
          <span class="text-[10px] px-2 py-0.5 rounded-full ${isSubActive ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'} font-bold">${deckCount}</span>
        `;

        item.appendChild(left);
        item.appendChild(right);
        list.appendChild(item);
    });

    lucide.createIcons();
}

/* ==========================================================================
   SUBJECT CRUD OPERATIONS
   ========================================================================== */
async function openNewSubjectModal() {
    const name = await appPrompt('New Subject Folder', 'e.g. Operating Systems');
    if (name) {
        const palette = ['#0D82FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
        const randomColor = palette[appData.subjects.length % palette.length];
        const newSub = { id: generateId(), name, color: randomColor };
        appData.subjects.push(newSub);

        await saveAppData();
        currentSubjectFilter = String(newSub.id);
        const breadcrumb = document.getElementById('breadcrumb-subject');
        if (breadcrumb) breadcrumb.innerText = name;
        renderNavigation();
        renderDashboard();
        showToast(`Subject "${name}" created`);
    }
}

function openEditSubjectModal(subId) {
    const sub = appData.subjects.find(s => String(s.id) === String(subId));
    if (!sub) return;
    document.getElementById('edit-subject-id').value = String(sub.id);
    document.getElementById('edit-subject-name-field').value = sub.name;
    document.getElementById('edit-subject-color-field').value = sub.color || '#0D82FF';
    openModal('modal-edit-subject');
}

function saveSubjectEdit() {
    const subId = document.getElementById('edit-subject-id').value;
    const name = document.getElementById('edit-subject-name-field').value.trim();
    const color = document.getElementById('edit-subject-color-field').value;
    if (!name) return appAlert('Error', 'Subject name cannot be empty.');

    const sub = appData.subjects.find(s => String(s.id) === String(subId));
    if (sub) {
        sub.name = name;
        sub.color = color || '#0D82FF';
        saveAppData();
        closeModal('modal-edit-subject');
        if (String(currentSubjectFilter) === String(subId)) {
            document.getElementById('breadcrumb-subject').innerText = name;
        }
        showToast('Subject updated');
        renderNavigation();
        renderDashboard();
    }
}

async function deleteSubject(id) {
    const ok = await appConfirm('Delete Subject', 'Are you sure you want to delete this subject along with all its decks and cards?');
    if (!ok) return;

    const removedSubject = appData.subjects.find(s => String(s.id) === String(id));
    const removedDecks = appData.decks.filter(d => String(d.subjectId) === String(id));
    const deckIds = removedDecks.map(d => String(d.id));
    const removedCards = appData.cards.filter(c => deckIds.includes(String(c.deckId)));

    appData.cards = appData.cards.filter(c => !deckIds.includes(String(c.deckId)));
    appData.decks = appData.decks.filter(d => String(d.subjectId) !== String(id));
    appData.subjects = appData.subjects.filter(s => String(s.id) !== String(id));

    if (String(currentSubjectFilter) === String(id)) {
        currentSubjectFilter = 'All';
        const breadcrumb = document.getElementById('breadcrumb-subject');
        if (breadcrumb) {
            breadcrumb.innerText = 'All Subjects';
        }
    }

    saveAppData();

    showToast('Subject deleted', () => {
        appData.subjects.push(removedSubject);
        appData.decks.push(...removedDecks);
        appData.cards.push(...removedCards);
        saveAppData();
        renderNavigation();
        renderDashboard();
    });

    renderNavigation();
    renderDashboard();
}

/* ==========================================================================
   DASHBOARD & SEARCH FILTERING
   ========================================================================== */
function renderDashboard() {
    currentActiveView = 'dashboard';
    const container = document.getElementById('viewport-content');
    let decks = [...appData.decks];
    let cards = [...appData.cards];

    if (currentSubjectFilter !== 'All') decks = decks.filter(d => String(d.subjectId) === String(currentSubjectFilter));
    if (currentPeriodFilter !== 'All') decks = decks.filter(d => d.period === currentPeriodFilter);

    if (searchQuery) {
        const matchingCards = cards.filter(c => c.prompt.toLowerCase().includes(searchQuery) || c.answer.toLowerCase().includes(searchQuery));
        const deckIdsWithMatchingCards = matchingCards.map(c => String(c.deckId));
        decks = decks.filter(d => d.title.toLowerCase().includes(searchQuery) || deckIdsWithMatchingCards.includes(String(d.id)));
    }

    const relevantDeckIds = decks.map(d => String(d.id));
    const relevantCards = cards.filter(c => relevantDeckIds.includes(String(c.deckId)));

    const mastered = relevantCards.filter(c => (c.consecutiveCorrect || 0) >= 3).length;
    const learning = relevantCards.filter(c => (c.consecutiveCorrect || 0) >= 1 && (c.consecutiveCorrect || 0) < 3).length;
    const newCards = relevantCards.filter(c => (c.consecutiveCorrect || 0) === 0).length;

    const retentionRate = relevantCards.length ? Math.round((mastered / relevantCards.length) * 100) : 0;
    const avgExamSpeed = appData.telemetry.totalResponses ? (appData.telemetry.totalStudyTimeSec / appData.telemetry.totalResponses).toFixed(1) : 0;

    const topMissed = [...relevantCards].filter(c => (c.misses || 0) > 0).sort((a, b) => (b.misses || 0) - (a.misses || 0)).slice(0, 5);

    let html = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div class="glass-card p-5 rounded-3xl flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Retention Rate</p>
              <h3 class="text-3xl font-black text-neutral-900 dark:text-white mt-1">${retentionRate}%</h3>
              <p class="text-[11px] text-neutral-400 mt-0.5">${mastered} Mastered / ${relevantCards.length} Cards</p>
            </div>
            <div class="relative w-14 h-14 shrink-0">
              <svg class="w-14 h-14 transform -rotate-90">
                <circle cx="28" cy="28" r="22" stroke="currentColor" stroke-width="5" fill="none" class="text-blue-100 dark:text-neutral-800" />
                <circle cx="28" cy="28" r="22" stroke="currentColor" stroke-width="5" fill="none"
                  stroke-dasharray="${2 * Math.PI * 22}"
                  stroke-dashoffset="${2 * Math.PI * 22 * (1 - retentionRate / 100)}"
                  class="text-[#0D82FF] dark:text-[#389BFF] transition-all duration-1000" stroke-linecap="round" />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-[10px] font-black text-neutral-800 dark:text-neutral-100">${retentionRate}%</span>
            </div>
          </div>

          <div class="glass-card p-5 rounded-3xl">
            <span class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Card Mastery</span>
            <div class="grid grid-cols-3 gap-1 mt-2 text-center">
              <div class="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div class="font-black text-sm text-[#0D82FF] dark:text-blue-400">${mastered}</div>
                <span class="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Mastered</span>
              </div>
              <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div class="font-black text-sm text-amber-500 dark:text-amber-400">${learning}</div>
                <span class="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Learning</span>
              </div>
              <div class="p-2 rounded-xl bg-white/10 dark:bg-white/5 border border-white/10">
                <div class="font-black text-sm text-neutral-800 dark:text-neutral-100">${newCards}</div>
                <span class="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">New</span>
              </div>
            </div>
          </div>

          <div class="glass-card p-5 rounded-3xl flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Exam Speed</p>
              <h3 class="text-2xl font-black text-neutral-900 dark:text-white mt-1">${avgExamSpeed}s</h3>
              <p class="text-[11px] text-neutral-400 mt-0.5">Average pace per exam prompt</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <i data-lucide="timer" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="glass-card p-5 rounded-3xl flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Active Pool</p>
              <h3 class="text-2xl font-black text-neutral-900 dark:text-white mt-1">${decks.length} Decks</h3>
              <p class="text-[11px] text-neutral-400 mt-0.5">${searchQuery ? 'Matching Search' : 'Matching filters'}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <i data-lucide="book-open" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        ${topMissed.length > 0 ? `
          <div class="glass-card p-5 rounded-3xl">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-black text-neutral-700 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-500"></i> Top Missed Concepts
              </h4>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-[#B8DAFF]/40 dark:border-white/10 text-neutral-500 dark:text-neutral-300 font-bold uppercase text-[10px]">
                    <th class="pb-2">Term / Concept</th>
                    <th class="pb-2">Misses</th>
                    <th class="pb-2">Accuracy</th>
                    <th class="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#B8DAFF]/20 dark:divide-white/5">
                  ${topMissed.map(item => {
        const conceptLabel = (item.type === 'tf' || item.type === 'enumeration') ? item.prompt : item.answer;
        const missCount = item.misses || 0;
        return `
                    <tr>
                      <td class="py-2.5 font-bold text-neutral-800 dark:text-neutral-100 max-w-xs truncate" title="${escapeHTML(conceptLabel)}">${escapeHTML(conceptLabel)}</td>
                      <td class="py-2.5 text-rose-500 dark:text-rose-400 font-black">${missCount} ${missCount === 1 ? 'miss' : 'misses'}</td>
                      <td class="py-2.5 font-medium text-neutral-500 dark:text-neutral-400">${item.totalAttempts ? Math.round(((item.totalAttempts - item.misses) / item.totalAttempts) * 100) : 0}%</td>
                      <td class="py-2.5 text-right">
                        <button onclick="cramSingleCard('${escapeHTML(String(item.id))}')" class="btn-action-pill px-3 py-1 rounded-xl text-[11px] font-bold bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF]">Cram</button>
                      </td>
                    </tr>
                    `;
    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-1">
          <h2 class="text-sm font-black text-neutral-800 dark:text-white">Decks (${decks.length})</h2>
        </div>
      `;

    if (decks.length === 0) {
        html += `
          <div class="h-64 flex flex-col items-center justify-center glass-card rounded-3xl border border-dashed border-[#B8DAFF]/80 dark:border-white/10 text-center p-6 space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-white/5 text-[#0D82FF] flex items-center justify-center"><i data-lucide="folder-plus" class="w-6 h-6"></i></div>
            <h4 class="text-sm font-bold text-neutral-800 dark:text-white">No Decks Found</h4>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">${searchQuery ? 'No decks or cards match your search query.' : 'Create a deck or use "Quick Notes" above to parse notes directly.'}</p>
          </div>
        `;
    } else {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">`;
        decks.forEach(deck => {
            const deckCards = cards.filter(c => String(c.deckId) === String(deck.id));
            const dMastered = deckCards.filter(c => (c.consecutiveCorrect || 0) >= 3).length;
            const dProgress = deckCards.length ? Math.round((dMastered / deckCards.length) * 100) : 0;
            const strokeOffset = 2 * Math.PI * 18 * (1 - dProgress / 100);

            const identCount = deckCards.filter(c => c.type === 'identification').length;
            const enumCount = deckCards.filter(c => c.type === 'enumeration').length;
            const tfCount = deckCards.filter(c => c.type === 'tf').length;
            const safeDeckId = escapeHTML(String(deck.id));

            html += `
            <div class="glass-card p-5 rounded-3xl flex flex-col justify-between group min-h-[220px]">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF] border border-blue-200/60 dark:border-blue-700/40">${escapeHTML(deck.period)}</span>
                    <span class="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
                      <i data-lucide="clock" class="w-3.5 h-3.5"></i> ${timeAgo(deck.lastStudied)}
                    </span>
                  </div>
                  <div class="relative w-10 h-10">
                    <svg class="w-10 h-10 transform -rotate-90">
                      <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="3.5" fill="none" class="text-blue-100 dark:text-neutral-800" />
                      <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="3.5" fill="none"
                        stroke-dasharray="${2 * Math.PI * 18}"
                        stroke-dashoffset="${strokeOffset}"
                        class="text-[#0D82FF] dark:text-[#389BFF] transition-all duration-1000" stroke-linecap="round" />
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-[9px] font-black text-neutral-800 dark:text-neutral-200">${dProgress}%</span>
                  </div>
                </div>

                <h3 class="text-base font-bold text-neutral-900 dark:text-white leading-snug">${escapeHTML(deck.title)}</h3>
                <p class="text-xs text-neutral-400 mt-1">${deckCards.length} Total Cards logged</p>

                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">${identCount} Terms</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">${enumCount} Lists</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">${tfCount} T/F</span>
                </div>
              </div>

              <div class="pt-4 mt-4 border-t border-[#B8DAFF]/30 dark:border-white/10 flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <button onclick="startFlashcards('${safeDeckId}')" class="btn-action-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF] flex items-center gap-1">
                    <i data-lucide="layers" class="w-3.5 h-3.5"></i> Cards
                  </button>
                  <button onclick="promptPracticeExam('${safeDeckId}')" class="btn-action-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0D82FF] text-white flex items-center gap-1 shadow-sm">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Exam
                  </button>
                </div>

                <div class="flex items-center gap-1">
                  <button onclick="renderDeckCardReview('${safeDeckId}')" title="View Cards" class="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition">
                    <i data-lucide="list" class="w-4 h-4"></i>
                  </button>
                  <button onclick="openEditDeckModal('${safeDeckId}')" title="Edit Deck" class="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                  </button>
                  <button onclick="promptPDFExport('${safeDeckId}')" title="Export PDF" class="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                  </button>
                  <button onclick="deleteDeck('${safeDeckId}')" title="Delete Deck" class="p-2 rounded-xl hover:bg-rose-500 hover:text-white text-neutral-400 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
    lucide.createIcons();
}

/* ==========================================================================
   DECK MANAGEMENT
   ========================================================================== */
async function openNewDeckModal() {
    if (appData.subjects.length === 0) {
        await appAlert('No Subjects', 'Create a Subject folder first.');
        return;
    }
    document.getElementById('modal-deck-title').innerText = 'Create New Deck';
    document.getElementById('deck-edit-mode-id').value = '';
    const select = document.getElementById('deck-subject-field');
    select.innerHTML = appData.subjects.map(s => `<option value="${escapeHTML(String(s.id))}">${escapeHTML(s.name)}</option>`).join('');
    if (currentSubjectFilter !== 'All') select.value = String(currentSubjectFilter);
    document.getElementById('deck-title-field').value = '';
    document.getElementById('deck-period-field').value = currentPeriodFilter !== 'All' ? currentPeriodFilter : 'Prelim';
    openModal('modal-deck');
    lucide.createIcons();
}

function openEditDeckModal(deckId) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');

    document.getElementById('modal-deck-title').innerText = 'Edit Deck';
    document.getElementById('deck-edit-mode-id').value = String(deck.id);
    const select = document.getElementById('deck-subject-field');
    select.innerHTML = appData.subjects.map(s => `<option value="${escapeHTML(String(s.id))}">${escapeHTML(s.name)}</option>`).join('');
    select.value = String(deck.subjectId);
    document.getElementById('deck-title-field').value = deck.title;
    document.getElementById('deck-period-field').value = deck.period;
    openModal('modal-deck');
    lucide.createIcons();
}

async function saveDeckForm() {
    const editId = document.getElementById('deck-edit-mode-id').value;
    const title = document.getElementById('deck-title-field').value.trim();
    const subjectId = document.getElementById('deck-subject-field').value;
    const period = document.getElementById('deck-period-field').value;

    if (!title) return appAlert('Required Field', 'Please enter a title for the deck.');

    if (editId) {
        const deck = appData.decks.find(d => String(d.id) === String(editId));
        if (deck) {
            deck.title = title;
            deck.subjectId = String(subjectId);
            deck.period = period;
            showToast(`Deck "${title}" updated`);
        }
    } else {
        const newDeck = {
            id: generateId(),
            title,
            subjectId: String(subjectId),
            period,
            lastStudied: new Date().toISOString()
        };
        appData.decks.push(newDeck);
        showToast(`Deck "${title}" created`);
    }

    await saveAppData();
    closeModal('modal-deck');

    // Align dashboard filters so the new deck is immediately visible
    currentSubjectFilter = String(subjectId);
    currentPeriodFilter = 'All';

    const sub = appData.subjects.find(s => String(s.id) === String(subjectId));
    if (sub) {
        document.getElementById('breadcrumb-subject').innerText = sub.name;
    }
    setPeriodFilter('All');
    renderNavigation();
    renderDashboard();
}

async function deleteDeck(deckId) {
    const dIndex = appData.decks.findIndex(d => String(d.id) === String(deckId));
    if (dIndex === -1) return appAlert('Error', 'Deck not found.');

    const targetDeck = appData.decks[dIndex];
    const ok = await appConfirm('Delete Deck', `Are you sure you want to remove "${targetDeck.title}" and all its associated cards?`);
    if (!ok) return;

    const removedDeck = appData.decks[dIndex];
    const removedCards = appData.cards.filter(c => String(c.deckId) === String(deckId));

    appData.cards = appData.cards.filter(c => String(c.deckId) !== String(deckId));
    appData.decks.splice(dIndex, 1);
    saveAppData();

    showToast(`Deck "${removedDeck.title}" deleted`, () => {
        appData.decks.splice(dIndex, 0, removedDeck);
        appData.cards.push(...removedCards);
        saveAppData();
        renderDashboard();
    });

    renderDashboard();
}

/* ==========================================================================
   INLINE DECK CARD MANAGER & EDITING
   ========================================================================== */
function renderDeckCardReview(deckId) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');

    enterActivityView('deck-review');
    const cards = appData.cards.filter(c => String(c.deckId) === String(deckId));
    const container = document.getElementById('viewport-content');

    container.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-4 pt-2">
          <div class="flex items-center justify-between">
            <button onclick="navigateBack()" class="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Library
            </button>
            <span class="text-xs font-bold text-neutral-400 font-mono">${cards.length} Cards</span>
          </div>

          <div class="glass-card p-6 rounded-3xl space-y-4 shadow-xl">
            <div class="border-b border-[#B8DAFF]/40 dark:border-white/10 pb-3 flex items-center justify-between">
              <div>
                <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF]">${escapeHTML(deck.period)}</span>
                <h2 class="text-xl font-black text-neutral-900 dark:text-white mt-1">${escapeHTML(deck.title)}</h2>
              </div>
              <button onclick="openEditDeckModal('${escapeHTML(String(deck.id))}')" class="btn-action-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-white/70 dark:bg-white/10 border border-[#B8DAFF]/50 text-neutral-800 dark:text-white">
                Edit Deck
              </button>
            </div>

            <div class="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              ${cards.length === 0 ? '<p class="text-xs text-neutral-400 py-6 text-center">No cards in this deck yet.</p>' : ''}
              ${cards.map(c => `
                <div class="p-3.5 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-[#B8DAFF]/40 dark:border-white/10 flex items-start justify-between gap-3 group">
                  <div class="space-y-1 flex-1">
                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">${c.type}</span>
                    <p class="font-bold text-xs text-neutral-800 dark:text-white">${escapeHTML(c.prompt)}</p>
                    <p class="text-xs text-[#0D82FF] dark:text-[#389BFF] font-semibold">${escapeHTML(c.answer)}</p>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button onclick="openCardEditor('${escapeHTML(String(c.id))}')" title="Edit Card" class="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-white/20 text-neutral-600 dark:text-neutral-300">
                      <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteCard('${escapeHTML(String(c.id))}', '${escapeHTML(String(deckId))}')" title="Delete Card" class="p-1.5 rounded-lg hover:bg-rose-500 hover:text-white text-neutral-400">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    lucide.createIcons();
}

function openCardEditor(cardId) {
    const card = appData.cards.find(c => String(c.id) === String(cardId));
    if (!card) return;
    document.getElementById('edit-card-id').value = String(card.id);
    document.getElementById('edit-card-prompt').value = card.prompt;
    document.getElementById('edit-card-answer').value = card.answer;
    document.getElementById('edit-card-type').value = card.type;
    openModal('modal-card-editor');
}

function saveCardEdit() {
    const id = document.getElementById('edit-card-id').value;
    const prompt = document.getElementById('edit-card-prompt').value.trim();
    const answer = document.getElementById('edit-card-answer').value.trim();
    const type = document.getElementById('edit-card-type').value;

    if (!prompt || !answer) return appAlert('Error', 'Fields cannot be empty.');

    const card = appData.cards.find(c => String(c.id) === String(id));
    if (card) {
        card.prompt = prompt;
        card.answer = answer;
        card.type = type;
        saveAppData();
        closeModal('modal-card-editor');
        showToast('Card updated successfully');
        renderDeckCardReview(card.deckId);
    }
}

function deleteCard(cardId, deckId) {
    const index = appData.cards.findIndex(c => String(c.id) === String(cardId));
    if (index === -1) return;
    const removedCard = appData.cards[index];
    appData.cards.splice(index, 1);
    saveAppData();

    showToast('Card deleted', () => {
        appData.cards.splice(index, 0, removedCard);
        saveAppData();
        renderDeckCardReview(deckId);
    });

    renderDeckCardReview(deckId);
}

/* ==========================================================================
   SMART NOTE IMPORTER
   ========================================================================== */
let parsedCardsCache = [];

async function openSmartImporterModal() {
    if (appData.decks.length === 0) {
        await appAlert('No Decks Available', 'Please create a deck first.');
        return;
    }
    const select = document.getElementById('import-target-deck');
    select.innerHTML = appData.decks.map(d => `<option value="${escapeHTML(String(d.id))}">${escapeHTML(d.title)} (${d.period})</option>`).join('');
    document.getElementById('import-textarea').value = '';
    parsedCardsCache = [];
    renderImportPreview();
    switchImportTab('paste');
    openModal('modal-importer');
    lucide.createIcons();
}

function switchImportTab(tab) {
    if (tab === 'paste') {
        document.getElementById('import-paste-view').classList.remove('hidden');
        document.getElementById('import-manual-view').classList.add('hidden');
        document.getElementById('tab-btn-paste').className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0D82FF] text-white shadow-sm';
        document.getElementById('tab-btn-manual').className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/10 text-neutral-700 dark:text-neutral-300';
    } else {
        document.getElementById('import-paste-view').classList.add('hidden');
        document.getElementById('import-manual-view').classList.remove('hidden');
        document.getElementById('tab-btn-manual').className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0D82FF] text-white shadow-sm';
        document.getElementById('tab-btn-paste').className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/10 text-neutral-700 dark:text-neutral-300';
    }
}

function liveParseNotes() {
    const text = document.getElementById('import-textarea').value;
    const lines = text.split('\n');
    parsedCardsCache = [];

    let currentTopic = null;
    let currentItems = [];

    function flushList() {
        if (currentTopic && currentItems.length > 0) {
            parsedCardsCache.push({
                tempId: generateId(),
                type: 'enumeration',
                prompt: currentTopic,
                answer: currentItems.join(', ')
            });
            currentTopic = null;
            currentItems = [];
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) { flushList(); continue; }

        const bulletMatch = line.match(/^([a-zA-Z\d]+[\.\)]|\-|\*)\s*(.+)$/);
        if (bulletMatch && currentTopic) {
            currentItems.push(bulletMatch[2].trim());
            continue;
        }

        if (line.endsWith(':')) {
            flushList();
            currentTopic = line.slice(0, -1).trim();
            continue;
        }

        flushList();

        let delimiter = null;
        if (line.includes(' = ')) delimiter = ' = ';
        else if (line.includes(' - ')) delimiter = ' - ';
        else if (line.includes(': ')) delimiter = ': ';

        if (delimiter) {
            const parts = line.split(delimiter);
            const left = parts[0].trim();
            const right = parts.slice(1).join(delimiter).trim();
            const lowerRight = right.toLowerCase();

            if (lowerRight === 'true' || lowerRight === 'false') {
                parsedCardsCache.push({
                    tempId: generateId(),
                    type: 'tf',
                    prompt: left,
                    answer: lowerRight === 'true' ? 'True' : 'False'
                });
                continue;
            }

            parsedCardsCache.push({
                tempId: generateId(),
                type: 'identification',
                prompt: right,
                answer: left
            });
            continue;
        }
    }
    flushList();
    renderImportPreview();
}

function renderImportPreview() {
    const termCount = parsedCardsCache.filter(c => c.type === 'identification').length;
    const listCount = parsedCardsCache.filter(c => c.type === 'enumeration').length;
    const tfCount = parsedCardsCache.filter(c => c.type === 'tf').length;

    document.getElementById('detection-chips').innerHTML = `
    <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold">${termCount} Terms</span>
    <span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold">${listCount} Lists</span>
    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">${tfCount} T/F</span>
  `;

    const previewBox = document.getElementById('import-preview-box');
    if (parsedCardsCache.length === 0) {
        previewBox.innerHTML = '<div class="text-neutral-400 italic">Paste text on the left to see live detection chips and editable cards...</div>';
        return;
    }

    previewBox.innerHTML = parsedCardsCache.map((card, idx) => `
    <div class="p-2.5 rounded-2xl bg-white/70 dark:bg-neutral-800/80 border border-[#B8DAFF]/40 dark:border-white/10 flex flex-col gap-1.5 relative group">
      <div class="flex items-center justify-between">
        <select onchange="updateImportCard(${idx}, 'type', this.value); renderImportPreview();" class="text-[10px] font-black uppercase px-2 py-0.5 rounded outline-none border border-[#B8DAFF]/40 dark:border-white/15 bg-white/90 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
          <option value="identification" ${card.type === 'identification' ? 'selected' : ''}>Term - Def</option>
          <option value="enumeration" ${card.type === 'enumeration' ? 'selected' : ''}>List / Enum</option>
          <option value="tf" ${card.type === 'tf' ? 'selected' : ''}>True / False</option>
        </select>
        <button onclick="removeImportCard(${idx})" title="Remove Card" class="p-1 text-neutral-400 hover:text-rose-500 rounded-lg transition">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <div>
        <label class="text-[9px] font-bold text-neutral-400 uppercase">Prompt</label>
        <input type="text" oninput="updateImportCard(${idx}, 'prompt', this.value)" value="${escapeHTML(card.prompt)}" class="w-full mt-0.5 p-1.5 rounded-lg bg-white/90 dark:bg-neutral-900 border border-[#B8DAFF]/50 dark:border-white/10 text-xs font-semibold text-neutral-800 dark:text-white outline-none">
      </div>
      <div>
        <label class="text-[9px] font-bold text-neutral-400 uppercase">Answer</label>
        <input type="text" oninput="updateImportCard(${idx}, 'answer', this.value)" value="${escapeHTML(card.answer)}" class="w-full mt-0.5 p-1.5 rounded-lg bg-white/90 dark:bg-neutral-900 border border-[#B8DAFF]/50 dark:border-white/10 text-xs font-mono font-bold text-[#0D82FF] dark:text-[#389BFF] outline-none">
      </div>
    </div>
  `).join('');
    lucide.createIcons();
}

function updateImportCard(index, field, val) {
    if (parsedCardsCache[index]) {
        parsedCardsCache[index][field] = val;
    }
}

function removeImportCard(index) {
    parsedCardsCache.splice(index, 1);
    renderImportPreview();
}

async function commitImportedCards() {
    const deckId = document.getElementById('import-target-deck').value;
    if (!deckId) return appAlert('Error', 'Select a deck first.');
    if (parsedCardsCache.length === 0) return appAlert('Error', 'No valid cards parsed.');

    parsedCardsCache.forEach(item => {
        appData.cards.push({
            id: generateId(),
            deckId: String(deckId),
            type: item.type,
            prompt: item.prompt.trim(),
            answer: item.answer.trim(),
            consecutiveCorrect: 0,
            totalAttempts: 0,
            misses: 0
        });
    });

    saveAppData();
    closeModal('modal-importer');
    showToast(`${parsedCardsCache.length} cards added to deck`);
    renderDashboard();
}

async function saveManualCard(andAnother) {
    const deckId = document.getElementById('import-target-deck').value;
    const prompt = document.getElementById('manual-prompt').value.trim();
    const answer = document.getElementById('manual-answer').value.trim();
    const type = document.getElementById('manual-type').value;

    if (!deckId) return appAlert('Error', 'Select a deck.');
    if (!prompt || !answer) return appAlert('Error', 'Fill in both prompt and answer fields.');

    appData.cards.push({
        id: generateId(),
        deckId: String(deckId),
        type,
        prompt,
        answer,
        consecutiveCorrect: 0,
        totalAttempts: 0,
        misses: 0
    });

    saveAppData();
    document.getElementById('manual-prompt').value = '';
    document.getElementById('manual-answer').value = '';

    if (!andAnother) closeModal('modal-importer');
    showToast('Card saved');
    renderDashboard();
}

/* ==========================================================================
   INTERACTIVE FLASHCARDS & GESTURES
   ========================================================================== */
let activeFlashcardDeck = null;
let flashcardIndex = 0;
let flashcardOrientation = 'term-first';
let stillLearningCards = [];
let touchStartX = 0;
let touchEndX = 0;

async function startFlashcards(deckId, cardList = null) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');
    const cards = cardList || appData.cards.filter(c => String(c.deckId) === String(deckId));
    if (cards.length === 0) return appAlert('No Cards Found', 'This deck contains no flashcards yet.');

    deck.lastStudied = new Date().toISOString();
    saveAppData();

    enterActivityView('flashcards');
    activeFlashcardDeck = { deck, cards: [...cards] };
    flashcardIndex = 0;
    stillLearningCards = [];
    renderFlashcardView();
}

function renderFlashcardView() {
    const s = activeFlashcardDeck;
    const c = s.cards[flashcardIndex];
    const container = document.getElementById('viewport-content');

    let frontText = flashcardOrientation === 'term-first' ? c.answer : c.prompt;
    let backText = flashcardOrientation === 'term-first' ? c.prompt : c.answer;

    container.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-4 pt-4">
          <div class="flex items-center justify-between px-1">
            <button onclick="navigateBack()" class="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Library
            </button>
            <div class="flex items-center gap-2 md:gap-3">
              <button onclick="toggleCardOrientation()" class="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/70 dark:bg-white/10 border border-[#B8DAFF]/50 dark:border-white/10 text-neutral-700 dark:text-neutral-300 truncate">
                ${flashcardOrientation === 'term-first' ? 'Term First' : 'Def First'}
              </button>
              <button onclick="shuffleFlashcards()" title="Shuffle Cards" class="p-1.5 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-neutral-600 dark:text-neutral-300">
                <i data-lucide="shuffle" class="w-4 h-4"></i>
              </button>
              <span class="text-xs font-black font-mono text-[#0D82FF] dark:text-[#389BFF]">${flashcardIndex + 1}/${s.cards.length}</span>
            </div>
          </div>

          <div id="flashcard-swipe-zone" class="perspective-container w-full h-80 cursor-pointer" onclick="toggleCardFlip(this)">
            <div class="card-3d-inner relative w-full h-full">
              <div class="card-front glass-card absolute inset-0 rounded-3xl p-6 md:p-8 flex flex-col justify-between items-center text-center shadow-2xl">
                <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF]">
                  ${c.type === 'enumeration' ? 'List Prompt' : (flashcardOrientation === 'term-first' ? 'Term' : 'Definition')}
                </span>
                <div class="text-xl md:text-2xl font-black text-neutral-800 dark:text-white max-h-48 overflow-y-auto px-2">
                  ${escapeHTML(frontText)}
                </div>
                <p class="text-[11px] font-bold text-neutral-400">Tap to flip / Swipe left or right</p>
              </div>

              <div class="card-back glass-card absolute inset-0 rounded-3xl p-6 md:p-8 flex flex-col justify-between items-center text-center shadow-2xl bg-white/95 dark:bg-neutral-900/95">
                <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  ${flashcardOrientation === 'term-first' ? 'Definition / Items' : 'Correct Term'}
                </span>
                <div class="text-lg md:text-xl font-bold text-[#0D82FF] dark:text-[#389BFF] max-h-44 overflow-y-auto px-2">
                  ${c.type === 'enumeration' ? `
                    <ul class="text-left list-disc pl-6 space-y-1 text-sm font-semibold text-neutral-800 dark:text-white">
                      ${backText.split(',').map(item => `<li>${escapeHTML(item.trim())}</li>`).join('')}
                    </ul>
                  ` : escapeHTML(backText)}
                </div>
                <div class="flex gap-3 w-full max-w-sm" onclick="event.stopPropagation()">
                  <button onclick="rateFlashcard(false)" class="btn-skew flex-1 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800">
                    Still Learning
                  </button>
                  <button onclick="rateFlashcard(true)" class="btn-action-pill flex-1 py-2.5 rounded-2xl text-xs font-bold bg-[#23c483] text-white">
                    Mastered
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between px-2 pt-2">
            <button onclick="prevCard()" class="px-4 py-2 rounded-2xl text-xs font-bold bg-white/70 dark:bg-white/10 hover:bg-white flex items-center gap-1 border border-[#B8DAFF]/40 text-neutral-700 dark:text-white">
              <i data-lucide="chevron-left" class="w-4 h-4"></i> Prev
            </button>
            <button onclick="nextCard()" class="px-4 py-2 rounded-2xl text-xs font-bold bg-white/70 dark:bg-white/10 hover:bg-white flex items-center gap-1 border border-[#B8DAFF]/40 text-neutral-700 dark:text-white">
              Next <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;

    lucide.createIcons();
    attachCardSwipeListeners();
}

function attachCardSwipeListeners() {
    const zone = document.getElementById('flashcard-swipe-zone');
    if (!zone) return;

    zone.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    zone.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) {
            if (diff < 0) nextCard();
            else prevCard();
        }
    }, { passive: true });
}

function toggleCardFlip(wrapper) {
    wrapper.querySelector('.card-3d-inner').classList.toggle('flipped');
}

function toggleCardOrientation() {
    flashcardOrientation = flashcardOrientation === 'term-first' ? 'def-first' : 'term-first';
    renderFlashcardView();
}

function shuffleFlashcards() {
    activeFlashcardDeck.cards.sort(() => Math.random() - 0.5);
    flashcardIndex = 0;
    renderFlashcardView();
}

function prevCard() {
    if (flashcardIndex > 0) {
        flashcardIndex--;
        renderFlashcardView();
    }
}

function nextCard() {
    if (flashcardIndex < activeFlashcardDeck.cards.length - 1) {
        flashcardIndex++;
        renderFlashcardView();
    } else {
        renderFlashcardsDone();
    }
}

async function rateFlashcard(isMastered) {
    const c = activeFlashcardDeck.cards[flashcardIndex];
    const targetCard = appData.cards.find(item => String(item.id) === String(c.id));
    if (targetCard) {
        if (isMastered) {
            targetCard.consecutiveCorrect = (targetCard.consecutiveCorrect || 0) + 1;
        } else {
            targetCard.consecutiveCorrect = 0;
            stillLearningCards.push(c);
        }
        saveAppData();
    }
    nextCard();
}

function renderFlashcardsDone() {
    const container = document.getElementById('viewport-content');
    container.innerHTML = `
        <div class="max-w-md mx-auto glass-card p-8 rounded-3xl space-y-5 text-center mt-12 shadow-2xl">
          <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center font-black text-2xl">
            <i data-lucide="award" class="w-8 h-8"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-neutral-900 dark:text-white">Flashcard Set Complete</h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Consistency builds strong neural recall.</p>
          </div>
          <div class="space-y-2 pt-2">
            ${stillLearningCards.length > 0 ? `
              <button onclick="startFlashcards('${escapeHTML(String(activeFlashcardDeck.deck.id))}', stillLearningCards)" class="w-full btn-action-pill py-3 rounded-2xl text-xs font-black bg-[#0D82FF] text-white shadow-lg shadow-blue-500/30">
                Review "Still Learning" Only (${stillLearningCards.length})
              </button>
            ` : ''}
            <button onclick="navigateBack()" class="w-full py-2.5 rounded-2xl text-xs font-bold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
              Return to Library
            </button>
          </div>
        </div>
      `;
    lucide.createIcons();
}

window.addEventListener('keydown', e => {
    if (!activeFlashcardDeck || currentActiveView !== 'flashcards') return;
    if (e.code === 'Space') {
        e.preventDefault();
        const wrapper = document.querySelector('.perspective-container');
        if (wrapper) toggleCardFlip(wrapper);
    } else if (e.code === 'ArrowRight') {
        nextCard();
    } else if (e.code === 'ArrowLeft') {
        prevCard();
    }
});

/* ==========================================================================
   PRACTICE EXAM ENGINE
   ========================================================================== */
let activeQuizState = null;
let quizCountdownTimer = null;

function getSavedExamPrefs() {
    try {
        const p = localStorage.getItem(EXAM_PREFS_KEY);
        if (p) return JSON.parse(p);
    } catch (e) { }
    return {
        poolSize: '10',
        direction: 'def-term',
        allowIdent: true,
        allowMCQ: true,
        allowEnum: true,
        allowTF: true,
        isTimer: true
    };
}

function saveExamPrefs(prefs) {
    try {
        localStorage.setItem(EXAM_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) { }
}

function promptPracticeExam(deckId) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');

    activeQuizState = { deckId: String(deck.id) };
    const prefs = getSavedExamPrefs();

    document.querySelectorAll('#exam-pool-size button').forEach(b => {
        const isMatch = b.dataset.val === prefs.poolSize;
        b.className = isMatch
            ? 'py-2 rounded-xl font-bold transition bg-[#0D82FF] text-white'
            : 'py-2 rounded-xl font-bold transition bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-white';
        b.onclick = () => {
            document.querySelectorAll('#exam-pool-size button').forEach(btn => {
                btn.className = 'py-2 rounded-xl font-bold transition bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-white';
            });
            b.className = 'py-2 rounded-xl font-bold transition bg-[#0D82FF] text-white';
        };
    });

    document.getElementById('exam-direction-select').value = prefs.direction;
    document.getElementById('fmt-ident').checked = prefs.allowIdent;
    document.getElementById('fmt-mcq').checked = prefs.allowMCQ;
    document.getElementById('fmt-enum').checked = prefs.allowEnum;
    document.getElementById('fmt-tf').checked = prefs.allowTF;
    document.getElementById('exam-timer-toggle').checked = prefs.isTimer;

    openModal('modal-exam-config');
    lucide.createIcons();
}

async function startPracticeExam() {
    const deck = appData.decks.find(d => String(d.id) === String(activeQuizState.deckId));
    if (deck) {
        deck.lastStudied = new Date().toISOString();
        saveAppData();
    }

    const poolBtn = document.querySelector('#exam-pool-size button.bg-\\[\\#0D82FF\\]') || document.querySelector('#exam-pool-size button');
    const poolSize = poolBtn ? poolBtn.dataset.val : '10';
    const direction = document.getElementById('exam-direction-select').value;
    const isTimer = document.getElementById('exam-timer-toggle').checked;

    const allowIdent = document.getElementById('fmt-ident').checked;
    const allowMCQ = document.getElementById('fmt-mcq').checked;
    const allowEnum = document.getElementById('fmt-enum').checked;
    const allowTF = document.getElementById('fmt-tf').checked;

    saveExamPrefs({
        poolSize,
        direction,
        allowIdent,
        allowMCQ,
        allowEnum,
        allowTF,
        isTimer
    });

    let cards = appData.cards.filter(c => String(c.deckId) === String(activeQuizState.deckId));
    if (cards.length === 0) return appAlert('Empty Deck', 'No cards available in this deck.');

    cards = cards.filter(c => {
        if (c.type === 'identification') return allowIdent || allowMCQ;
        if (c.type === 'enumeration') return allowEnum;
        if (c.type === 'tf') return allowTF;
        return true;
    });

    if (cards.length === 0) return appAlert('No Matches', 'No cards match your format selections.');

    enterActivityView('exam');

    const pureIdentAnswers = [...new Set(
        appData.cards
            .filter(c => String(c.deckId) === String(activeQuizState.deckId) && c.type === 'identification')
            .map(c => c.answer)
            .filter(Boolean)
    )];

    cards.sort(() => Math.random() - 0.5);
    if (poolSize !== 'All') cards = cards.slice(0, parseInt(poolSize));

    activeQuizState = {
        deckId: String(activeQuizState.deckId),
        cards,
        identAnswers: pureIdentAnswers,
        direction,
        allowMCQ,
        timerEnabled: isTimer,
        timeRemaining: 20,
        currentIndex: 0,
        score: 0,
        missedCards: [],
        questionLogs: [],
        isSubmitting: false,
        questionStartTime: Date.now()
    };

    closeModal('modal-exam-config');
    renderQuizQuestion();
}

function renderQuizQuestion() {
    clearInterval(quizCountdownTimer);
    const s = activeQuizState;
    const c = s.cards[s.currentIndex];
    s.isSubmitting = false;
    s.questionStartTime = Date.now();

    let promptText = c.prompt;
    let groundTruth = c.answer;
    let isFlipped = false;

    if (s.direction === 'term-def' && c.type === 'identification') {
        isFlipped = true;
        promptText = `What is the definition of: "${c.answer}"?`;
        groundTruth = c.prompt;
    } else if (s.direction === 'mixed' && c.type === 'identification' && Math.random() > 0.5) {
        isFlipped = true;
        promptText = `What is the definition of: "${c.answer}"?`;
        groundTruth = c.prompt;
    }

    s.currentQuestionIsFlipped = isFlipped;
    const foilPoolCount = isFlipped
        ? appData.cards.filter(cardItem => String(cardItem.deckId) === String(c.deckId) && cardItem.type === 'identification').length
        : s.identAnswers.length;

    const isMCQEligible = s.allowMCQ && foilPoolCount >= 4 && c.type === 'identification';

    const container = document.getElementById('viewport-content');
    container.innerHTML = `
        <div class="max-w-xl mx-auto space-y-4 pt-4 md:pt-6">
          <div class="flex items-center justify-between px-1">
            <button onclick="navigateBack()" class="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Exit Exam
            </button>
            <div class="flex items-center gap-3">
              ${s.timerEnabled ? `
                <div id="timer-badge" class="px-3 py-1 rounded-full text-xs font-mono font-black bg-white/80 dark:bg-neutral-800 border border-[#B8DAFF]/60 dark:border-white/10 text-neutral-700 dark:text-neutral-200">
                  ⏱ <span id="timer-num">20</span>s
                </div>
              ` : ''}
              <span class="text-xs font-black font-mono text-[#0D82FF] dark:text-[#389BFF]">${s.currentIndex + 1} / ${s.cards.length}</span>
            </div>
          </div>

          <div id="quiz-card-box" class="glass-card p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl transition border-2 border-transparent">
            <div class="flex items-center justify-between border-b border-[#B8DAFF]/40 dark:border-white/10 pb-3">
              <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF]">
                ${c.type === 'tf' ? 'True or False' : (c.type === 'enumeration' ? 'List Verification' : (isMCQEligible ? 'Multiple Choice' : 'Identification'))}
              </span>
              <span class="text-xs font-bold text-neutral-400 font-mono">Score: ${s.score.toFixed(1).replace(/\.0$/, '')}</span>
            </div>

            <div class="text-base md:text-lg font-bold text-neutral-900 dark:text-white leading-relaxed min-h-[50px]">
              ${escapeHTML(promptText)}
            </div>

            <div id="quiz-interaction-slot"></div>
            <div id="quiz-feedback-banner" class="hidden p-3.5 rounded-2xl text-xs font-bold"></div>
          </div>
        </div>
      `;

    mountQuizInteraction(c, groundTruth, promptText);
    lucide.createIcons();

    if (s.timerEnabled) {
        s.timeRemaining = 20;
        const timeNum = document.getElementById('timer-num');
        const badge = document.getElementById('timer-badge');
        quizCountdownTimer = setInterval(() => {
            s.timeRemaining--;
            if (timeNum) timeNum.innerText = s.timeRemaining;
            if (s.timeRemaining <= 3 && badge) {
                badge.classList.add('animate-pulse', 'border-rose-500', 'text-rose-500');
            }
            if (s.timeRemaining <= 0) {
                clearInterval(quizCountdownTimer);
                handleExamAnswer(0, groundTruth, promptText, 'Time Expired!', 'Timeout');
            }
        }, 1000);
    }
}

function mountQuizInteraction(card, groundTruth, promptText) {
    const slot = document.getElementById('quiz-interaction-slot');
    slot.innerHTML = '';
    const s = activeQuizState;

    if (card.type === 'tf') {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-3';
        ['True', 'False'].forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'btn-action-pill py-3.5 rounded-2xl text-xs font-black bg-white/70 dark:bg-white/10 border border-[#B8DAFF]/60 dark:border-white/10 text-neutral-800 dark:text-white';
            btn.textContent = val;
            btn.onclick = () => {
                const isCorr = val.toLowerCase() === groundTruth.toLowerCase();
                handleExamAnswer(isCorr ? 1 : 0, groundTruth, promptText, '', val);
            };
            grid.appendChild(btn);
        });
        slot.appendChild(grid);
        return;
    }

    if (card.type === 'enumeration') {
        const expectedItems = groundTruth.split(',').map(i => i.trim()).filter(Boolean);
        const wrap = document.createElement('div');
        wrap.className = 'space-y-3';
        const label = document.createElement('p');
        label.className = 'text-[11px] font-bold text-neutral-400';
        label.innerText = `Enter ${expectedItems.length} items (comma-separated, partial credit supported):`;
        wrap.appendChild(label);

        const input = document.createElement('input');
        input.id = 'active-quiz-input';
        input.type = 'text';
        input.placeholder = 'e.g. Item 1, Item 2, Item 3...';
        input.className = 'w-full p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-800 border border-[#B8DAFF]/60 dark:border-white/15 text-xs font-bold outline-none focus:border-[#0D82FF] text-neutral-800 dark:text-white';
        input.onkeydown = e => { if (e.key === 'Enter') checkEnumAnswer(expectedItems, groundTruth, promptText); };

        const btn = document.createElement('button');
        btn.className = 'w-full btn-action-pill py-3 rounded-2xl text-xs font-black bg-[#0D82FF] text-white shadow-md';
        btn.textContent = 'Verify List';
        btn.onclick = () => checkEnumAnswer(expectedItems, groundTruth, promptText);

        wrap.appendChild(input);
        wrap.appendChild(btn);
        slot.appendChild(wrap);
        setTimeout(() => input.focus(), 50);
        return;
    }

    // Allow MCQ even when flipped by pulling prompts (definitions) instead of answers (terms)
    const foilPool = s.currentQuestionIsFlipped
        ? appData.cards
            .filter(c => String(c.deckId) === String(card.deckId) && c.type === 'identification')
            .map(c => c.prompt)
        : s.identAnswers;

    const isMCQ = s.allowMCQ && foilPool.length >= 4 && card.type === 'identification';

    if (isMCQ) {
        const pool = foilPool.filter(a => normalize(a) !== normalize(groundTruth));
        pool.sort(() => Math.random() - 0.5);
        const distractors = pool.slice(0, 3);
        const options = [groundTruth, ...distractors].sort(() => Math.random() - 0.5);

        const form = document.createElement('div');
        form.className = 'space-y-2.5';
        options.forEach(opt => {
            const row = document.createElement('label');
            row.className = 'radio-input-wrapper p-3 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-[#B8DAFF]/40 dark:border-white/10 hover:border-[#0D82FF]';
            row.innerHTML = `
            <input type="radio" name="quiz-radio" class="radio-input" value="${escapeHTML(opt)}">
            <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">${escapeHTML(opt)}</span>
          `;
            row.onclick = () => {
                const isCorr = normalize(opt) === normalize(groundTruth);
                handleExamAnswer(isCorr ? 1 : 0, groundTruth, promptText, '', opt);
            };
            form.appendChild(row);
        });
        slot.appendChild(form);
    } else {
        const wrap = document.createElement('div');
        wrap.className = 'space-y-3';
        const input = document.createElement('input');
        input.id = 'active-quiz-input';
        input.type = 'text';
        input.placeholder = 'Type your answer here...';
        input.className = 'w-full p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-800 border border-[#B8DAFF]/60 dark:border-white/15 text-xs font-bold outline-none focus:border-[#0D82FF] text-neutral-800 dark:text-white';
        input.onkeydown = e => { if (e.key === 'Enter') checkIdentAnswer(groundTruth, promptText); };

        const btn = document.createElement('button');
        btn.className = 'w-full btn-action-pill py-3 rounded-2xl text-xs font-black bg-[#0D82FF] text-white shadow-md';
        btn.textContent = 'Submit Answer';
        btn.onclick = () => checkIdentAnswer(groundTruth, promptText);

        wrap.appendChild(input);
        wrap.appendChild(btn);
        slot.appendChild(wrap);
        setTimeout(() => input.focus(), 50);
    }
}

function checkIdentAnswer(groundTruth, promptText) {
    const s = activeQuizState;
    const input = document.getElementById('active-quiz-input');
    const val = input ? input.value : '';
    const entered = normalize(val);
    const target = normalize(groundTruth);

    let isCorrect = 0;

    if (s && s.currentQuestionIsFlipped) {
        // Keyword overlap scoring for typed definition sentences
        const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'and', 'or', 'so', 'it', 'its', 'that', 'this']);

        // Preserve spaces between words so split(/\s+/) works as intended
        const toWords = str => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

        const expectedKeywords = toWords(groundTruth).filter(w => w.length > 2 && !stopWords.has(w));
        const userKeywords = new Set(toWords(val).filter(w => w.length > 2 && !stopWords.has(w)));

        if (expectedKeywords.length === 0) {
            isCorrect = entered === target ? 1 : 0;
        } else {
            const hits = expectedKeywords.filter(w => userKeywords.has(w)).length;
            // Gives credit if the user typed at least 60% of the core keywords
            isCorrect = (hits / expectedKeywords.length) >= 0.6 ? 1 : 0;
        }
    } else {
        // Standard strict check for short terms
        const dist = levenshtein(entered, target);
        const allowedTolerance = target.length >= 8 ? 2 : (target.length >= 4 ? 1 : 0);
        isCorrect = (dist <= allowedTolerance || entered === target) ? 1 : 0;
    }

    handleExamAnswer(isCorrect, groundTruth, promptText, '', val);
}

function checkEnumAnswer(expectedItems, groundTruth, promptText) {
    const input = document.getElementById('active-quiz-input');
    const val = input ? input.value : '';
    const enteredList = val.split(',').map(normalize).filter(Boolean);
    const expectedNormalized = expectedItems.map(normalize);

    let matches = 0;
    const matchedExpectedIndices = new Set();

    enteredList.forEach(ent => {
        for (let idx = 0; idx < expectedNormalized.length; idx++) {
            // Match each entered response to at most one expected item
            if (!matchedExpectedIndices.has(idx) && levenshtein(ent, expectedNormalized[idx]) <= 1) {
                matchedExpectedIndices.add(idx);
                matches++;
                break;
            }
        }
    });

    const totalExpected = expectedNormalized.length || 1;
    const earnedFraction = Math.min(1, matches / totalExpected);
    let note = '';
    if (earnedFraction > 0 && earnedFraction < 1) {
        note = `Partial Credit: ${matches}/${totalExpected} items correct (+${Math.round(earnedFraction * 100)}%)`;
    }

    handleExamAnswer(earnedFraction, groundTruth, promptText, note, val);
}

function handleExamAnswer(creditScore, groundTruth, promptText, customNote = '', userAnswer = '') {
    const s = activeQuizState;
    if (s.isSubmitting) return;
    s.isSubmitting = true;
    clearInterval(quizCountdownTimer);

    const responseTime = Math.max(1, Math.round((Date.now() - s.questionStartTime) / 1000));
    appData.telemetry.totalStudyTimeSec += responseTime;
    appData.telemetry.totalResponses += 1;

    const card = s.cards[s.currentIndex];
    const targetCard = appData.cards.find(c => String(c.id) === String(card.id));

    s.score += creditScore;

    s.questionLogs.push({
        prompt: promptText,
        expectedAnswer: groundTruth,
        userAnswer: userAnswer || '(None)',
        credit: creditScore,
        type: card.type
    });

    if (targetCard) {
        targetCard.totalAttempts = (targetCard.totalAttempts || 0) + 1;
        if (creditScore >= 1) {
            targetCard.consecutiveCorrect = (targetCard.consecutiveCorrect || 0) + 1;
        } else {
            targetCard.consecutiveCorrect = 0;
            targetCard.misses = (targetCard.misses || 0) + 1;
        }
        saveAppData();
    }

    const cardBox = document.getElementById('quiz-card-box');
    const banner = document.getElementById('quiz-feedback-banner');
    banner.classList.remove('hidden');

    if (creditScore >= 1) {
        cardBox.classList.add('border-emerald-500');
        banner.className = 'p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-black';
        banner.innerText = 'Correct! Outstanding recall.';
    } else if (creditScore > 0) {
        cardBox.classList.add('border-amber-500');
        banner.className = 'p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black';
        banner.innerHTML = `${customNote ? escapeHTML(customNote) + ' &bull; ' : ''}Expected: <span class="underline">${escapeHTML(groundTruth)}</span>`;
        s.missedCards.push(card);
    } else {
        s.missedCards.push(card);
        cardBox.classList.add('border-rose-500');
        banner.className = 'p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs font-black';
        banner.innerHTML = `${customNote ? escapeHTML(customNote) + ' ' : ''}Correct: <span class="underline">${escapeHTML(groundTruth)}</span>`;
    }

    setTimeout(() => {
        s.currentIndex++;
        if (s.currentIndex < s.cards.length) {
            renderQuizQuestion();
        } else {
            renderQuizSummary();
        }
    }, 1300);
}

function renderQuizSummary() {
    const s = activeQuizState;
    const pct = Math.round((s.score / s.cards.length) * 100);
    const container = document.getElementById('viewport-content');

    container.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-5 mt-6 pb-12">
          <div class="glass-card p-6 md:p-8 rounded-3xl space-y-4 text-center shadow-2xl">
            <div class="text-5xl font-black text-neutral-900 dark:text-white">${pct}%</div>
            <div>
              <h3 class="text-xl font-black text-neutral-800 dark:text-white">Exam Completed</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Score: ${s.score.toFixed(1).replace(/\.0$/, '')} / ${s.cards.length} points (${pct}%)</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              ${s.missedCards.length > 0 ? `
                <button onclick="retryMissedQuestionsLoop()" class="btn-action-pill py-2.5 px-5 rounded-2xl text-xs font-black bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                  Retry Missed Questions (${s.missedCards.length})
                </button>
              ` : `
                <div class="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
                  Perfect Score Achieved! 100% Mastery
                </div>
              `}
              <button onclick="navigateBack()" class="py-2.5 px-5 rounded-2xl text-xs font-bold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                Return to Dashboard
              </button>
            </div>
          </div>

          <!-- PER-QUESTION REVIEW SCREEN -->
          <div class="glass-card p-6 rounded-3xl space-y-4 shadow-xl">
            <div class="flex items-center justify-between border-b border-[#B8DAFF]/40 dark:border-white/10 pb-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4 text-[#0D82FF]"></i> Question-by-Question Review
              </h4>
              <span class="text-xs font-bold text-neutral-400 font-mono">${s.questionLogs.length} Questions</span>
            </div>

            <div class="space-y-3">
              ${s.questionLogs.map((log, idx) => {
        const isFull = log.credit >= 1;
        const isPartial = log.credit > 0 && log.credit < 1;
        const badgeColor = isFull ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : (isPartial ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300');
        const badgeLabel = isFull ? 'Correct (+1.0)' : (isPartial ? `Partial (+${log.credit.toFixed(2)})` : 'Missed (0.0)');

        return `
                  <div class="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-[#B8DAFF]/40 dark:border-white/10 space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-xs font-bold text-neutral-800 dark:text-white flex-1">
                        <span class="font-mono text-neutral-400 font-semibold mr-1">#${idx + 1}</span> ${escapeHTML(log.prompt)}
                      </span>
                      <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${badgeColor}">${badgeLabel}</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div class="p-2 rounded-xl bg-black/5 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5">
                        <span class="block text-[9px] font-bold text-neutral-400 uppercase">Your Answer</span>
                        <span class="${isFull ? 'text-emerald-600 dark:text-emerald-400 font-bold' : (isPartial ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold')}">${escapeHTML(log.userAnswer)}</span>
                      </div>
                      <div class="p-2 rounded-xl bg-black/5 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5">
                        <span class="block text-[9px] font-bold text-neutral-400 uppercase">Correct Answer</span>
                        <span class="text-[#0D82FF] dark:text-[#389BFF] font-bold">${escapeHTML(log.expectedAnswer)}</span>
                      </div>
                    </div>
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        </div>
      `;
    lucide.createIcons();
}

function retryMissedQuestionsLoop() {
    activeQuizState.cards = [...activeQuizState.missedCards].sort(() => Math.random() - 0.5);
    activeQuizState.missedCards = [];
    activeQuizState.questionLogs = [];
    activeQuizState.currentIndex = 0;
    activeQuizState.score = 0;
    renderQuizQuestion();
}

function cramSingleCard(cardId) {
    const card = appData.cards.find(c => String(c.id) === String(cardId));
    if (!card) return;
    enterActivityView('exam');
    activeQuizState = {
        deckId: String(card.deckId),
        cards: [card],
        identAnswers: [card.answer],
        direction: 'def-term',
        allowMCQ: false,
        timerEnabled: false,
        currentIndex: 0,
        score: 0,
        missedCards: [],
        questionLogs: [],
        isSubmitting: false,
        questionStartTime: Date.now()
    };
    renderQuizQuestion();
}

/* ==========================================================================
   STUDY SHEET EXPORT (PDF)
   ========================================================================== */
let pdfExportDeckId = null;

function promptPDFExport(deckId) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');

    pdfExportDeckId = String(deck.id);
    openModal('modal-export-pdf');
    lucide.createIcons();
}

function generateStudySheetPDF() {
    const { jsPDF } = window.jspdf;
    const isBlankExam = document.getElementById('pdf-blank-exam-toggle').checked;
    const deck = appData.decks.find(d => String(d.id) === String(pdfExportDeckId));

    if (!deck) {
        appAlert('Error', 'Deck not found for PDF export.');
        closeModal('modal-export-pdf');
        return;
    }

    const cards = appData.cards.filter(c => String(c.deckId) === String(pdfExportDeckId));
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Dark Blue Header Card
    doc.setFillColor(15, 23, 42); // slate-900 / dark navy
    doc.roundedRect(14, 12, pageWidth - 28, 28, 4, 4, 'F');

    // Title inside header with collision prevention
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    let headerTitle = isBlankExam ? `EXAM: ${deck.title.toUpperCase()}` : `${deck.title.toUpperCase()} STUDY GUIDE`;

    const maxTitleWidth = pageWidth - 105; // leaves safe buffer before the badges
    if (doc.getTextWidth(headerTitle) > maxTitleWidth) {
        while (doc.getTextWidth(headerTitle + '...') > maxTitleWidth && headerTitle.length > 0) {
            headerTitle = headerTitle.slice(0, -1);
        }
        headerTitle += '...';
    }
    doc.text(headerTitle, 20, 23);

    // Subtitle inside header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Official Examination Reviewer • ${deck.period} Curriculum`, 20, 31);

    // Header Pill Badges
    // Pill 1: Period
    doc.setFillColor(13, 130, 255); // brand blue
    doc.roundedRect(pageWidth - 78, 19, 26, 6.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${deck.period.toUpperCase()} PERIOD`, pageWidth - 65, 23.5, { align: 'center' });

    // Pill 2: Question Count
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(pageWidth - 50, 19, 32, 6.5, 2, 2, 'F');
    doc.setTextColor(226, 232, 240);
    doc.text(`${cards.length} HIGH-YIELD ITEMS`, pageWidth - 34, 23.5, { align: 'center' });

    // 2. Section Heading with Vertical Accent Bar
    let currentY = 48;
    doc.setFillColor(13, 130, 255);
    doc.rect(14, currentY, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. CONCEPTS, DEFINITIONS & ANSWERS', 19, currentY + 5.5);

    // 3. Prepare Table Data
    const tableRows = cards.map((c, idx) => {
        const itemNum = String(idx + 1).padStart(2, '0');
        let scopeText = c.prompt;

        let answerText = '';
        if (isBlankExam) {
            answerText = '____________________';
        } else {
            if (c.type === 'enumeration') {
                answerText = c.answer.split(',').map(i => `• ${i.trim()}`).join('\n');
            } else {
                answerText = c.answer;
            }
        }

        return [itemNum, scopeText, answerText];
    });

    // 4. Render Table via AutoTable
    doc.autoTable({
        startY: currentY + 10,
        margin: { left: 14, right: 14, bottom: 18 },
        head: [['ITEM', 'CONCEPT DEFINITION & SCOPE', isBlankExam ? 'YOUR ANSWER' : 'OFFICIAL TERM / ANSWER']],
        body: tableRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
            lineColor: [226, 232, 240], // slate-200
            lineWidth: 0.2,
            valign: 'middle',
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [15, 23, 42], // dark navy table header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // light slate stripe
        },
        columnStyles: {
            0: {
                cellWidth: 14,
                halign: 'center',
                textColor: [13, 130, 255], // blue item numbers
                fontStyle: 'bold'
            },
            1: {
                cellWidth: 'auto',
                fontStyle: 'normal'
            },
            2: {
                cellWidth: 55,
                fontStyle: 'bold',
                textColor: [15, 23, 42]
            }
        },
        didDrawPage: (data) => {
            // Footer page numbers
            const str = `Page ${doc.internal.getNumberOfPages()}`;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        }
    });

    // 5. Download File
    doc.save(`${deck.title.replace(/\s+/g, '_')}_Reviewer.pdf`);
    closeModal('modal-export-pdf');
}

/* ==========================================================================
   BACKUP & RESTORE
   ========================================================================== */
function exportJSONBackup() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NoteX_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function importJSONBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmed = await appConfirm('Restore Backup', 'Importing will replace all your current subjects, decks, and flashcards with the backup file. Proceed?');
    if (!confirmed) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const parsed = JSON.parse(e.target.result);
            const sanitized = sanitizeData(parsed);
            if (sanitized && sanitized.subjects && sanitized.decks && sanitized.cards) {
                appData = sanitized;
                saveAppData();
                await appAlert('Success', 'Backup successfully restored!');
                renderNavigation();
                renderDashboard();
            } else {
                appAlert('Import Failed', 'Invalid backup schema detected.');
            }
        } catch (err) {
            appAlert('Import Failed', 'Failed to read JSON backup file.');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

async function triggerQuickAction(type) {
    if (appData.decks.length === 0) {
        await appAlert('No Decks Found', 'Please create a deck first.');
        return;
    }

    // Prioritize decks matching current subject filter if one is selected
    let availableDecks = [...appData.decks];
    if (currentSubjectFilter !== 'All') {
        const filtered = availableDecks.filter(d => String(d.subjectId) === String(currentSubjectFilter));
        if (filtered.length > 0) availableDecks = filtered;
    }

    // If exactly 1 deck exists in current view, open it immediately
    if (availableDecks.length === 1) {
        const singleDeckId = availableDecks[0].id;
        if (type === 'flashcards') startFlashcards(singleDeckId);
        else promptPracticeExam(singleDeckId);
        return;
    }

    // Otherwise, open the selection modal
    const pickerTitle = document.getElementById('deck-picker-title');
    pickerTitle.innerHTML = type === 'flashcards'
        ? `<i data-lucide="layers" class="w-4 h-4 text-blue-500"></i> Study Flashcards`
        : `<i data-lucide="clipboard-check" class="w-4 h-4 text-emerald-500"></i> Practice Exam`;

    const listContainer = document.getElementById('deck-picker-list');
    listContainer.innerHTML = availableDecks.map(deck => {
        const cardCount = appData.cards.filter(c => String(c.deckId) === String(deck.id)).length;
        const sub = appData.subjects.find(s => String(s.id) === String(deck.subjectId));
        const subName = sub ? sub.name : 'General';

        return `
          <button onclick="selectQuickActionDeck('${escapeHTML(String(deck.id))}', '${type}')" class="w-full p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between group shadow-sm">
            <div class="truncate flex-1 pr-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[#0D82FF]/10 text-[#0D82FF] dark:text-[#389BFF] font-mono">${escapeHTML(deck.period)}</span>
                <span class="text-[11px] font-semibold deck-picker-subname truncate">${escapeHTML(subName)}</span>
              </div>
              <h4 class="font-bold text-xs truncate leading-tight">${escapeHTML(deck.title)}</h4>
            </div>
            <span class="text-[10px] font-bold font-mono px-2.5 py-1 rounded-xl shrink-0 deck-picker-count">${cardCount} cards</span>
          </button>
        `;
    }).join('');

    openModal('modal-deck-picker');
    lucide.createIcons();
}

function selectQuickActionDeck(deckId, type) {
    closeModal('modal-deck-picker');
    if (type === 'flashcards') {
        startFlashcards(deckId);
    } else {
        promptPracticeExam(deckId);
    }
}

/* App Bootstrap */
window.addEventListener('DOMContentLoaded', async () => {
    initPWA();
    initWebGL();
    renderWebGL(0);

    // Await cloud sync first so the dashboard renders the full library immediately
    await loadAppData();
    renderNavigation();
    renderDashboard();

    if (supabaseClient) {
        supabaseClient
            .channel('public:app_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sync' }, payload => {
                if (payload.new && payload.new.data && payload.new.id === SYNC_ROOM_ID) {
                    const incoming = sanitizeData(payload.new.data);
                    if (incoming && incoming.subjects && incoming.subjects.length >= 3) {
                        appData = incoming;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
                        renderNavigation();
                        if (currentActiveView === 'dashboard') renderDashboard();
                    }
                }
            })
            .subscribe();
    }
});