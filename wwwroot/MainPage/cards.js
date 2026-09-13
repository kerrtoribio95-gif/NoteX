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

