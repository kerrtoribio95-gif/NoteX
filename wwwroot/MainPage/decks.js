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

