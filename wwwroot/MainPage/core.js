
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

