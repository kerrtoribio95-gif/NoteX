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

