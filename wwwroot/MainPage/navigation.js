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

