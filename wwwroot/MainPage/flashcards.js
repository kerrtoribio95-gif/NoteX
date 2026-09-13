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

