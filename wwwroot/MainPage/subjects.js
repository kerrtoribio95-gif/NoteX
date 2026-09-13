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

