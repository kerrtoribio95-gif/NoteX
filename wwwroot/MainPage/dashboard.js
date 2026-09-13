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

