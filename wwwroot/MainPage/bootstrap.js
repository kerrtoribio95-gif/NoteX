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