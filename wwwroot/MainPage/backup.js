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

