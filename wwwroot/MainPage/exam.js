/* ==========================================================================
   PRACTICE EXAM ENGINE
   ========================================================================== */
let activeQuizState = null;
let quizCountdownTimer = null;

function getSavedExamPrefs() {
    try {
        const p = localStorage.getItem(EXAM_PREFS_KEY);
        if (p) return JSON.parse(p);
    } catch (e) { }
    return {
        poolSize: '10',
        direction: 'def-term',
        allowIdent: true,
        allowMCQ: true,
        allowEnum: true,
        allowTF: true,
        isTimer: true
    };
}

function saveExamPrefs(prefs) {
    try {
        localStorage.setItem(EXAM_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) { }
}

function promptPracticeExam(deckId) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');

    activeQuizState = { deckId: String(deck.id) };
    const prefs = getSavedExamPrefs();

    document.querySelectorAll('#exam-pool-size button').forEach(b => {
        const isMatch = b.dataset.val === prefs.poolSize;
        b.className = isMatch
            ? 'py-2 rounded-xl font-bold transition bg-[#0D82FF] text-white'
            : 'py-2 rounded-xl font-bold transition bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-white';
        b.onclick = () => {
            document.querySelectorAll('#exam-pool-size button').forEach(btn => {
                btn.className = 'py-2 rounded-xl font-bold transition bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-white';
            });
            b.className = 'py-2 rounded-xl font-bold transition bg-[#0D82FF] text-white';
        };
    });

    document.getElementById('exam-direction-select').value = prefs.direction;
    document.getElementById('fmt-ident').checked = prefs.allowIdent;
    document.getElementById('fmt-mcq').checked = prefs.allowMCQ;
    document.getElementById('fmt-enum').checked = prefs.allowEnum;
    document.getElementById('fmt-tf').checked = prefs.allowTF;
    document.getElementById('exam-timer-toggle').checked = prefs.isTimer;

    openModal('modal-exam-config');
    lucide.createIcons();
}

async function startPracticeExam() {
    const deck = appData.decks.find(d => String(d.id) === String(activeQuizState.deckId));
    if (deck) {
        deck.lastStudied = new Date().toISOString();
        saveAppData();
    }

    const poolBtn = document.querySelector('#exam-pool-size button.bg-\\[\\#0D82FF\\]') || document.querySelector('#exam-pool-size button');
    const poolSize = poolBtn ? poolBtn.dataset.val : '10';
    const direction = document.getElementById('exam-direction-select').value;
    const isTimer = document.getElementById('exam-timer-toggle').checked;

    const allowIdent = document.getElementById('fmt-ident').checked;
    const allowMCQ = document.getElementById('fmt-mcq').checked;
    const allowEnum = document.getElementById('fmt-enum').checked;
    const allowTF = document.getElementById('fmt-tf').checked;

    saveExamPrefs({
        poolSize,
        direction,
        allowIdent,
        allowMCQ,
        allowEnum,
        allowTF,
        isTimer
    });

    let cards = appData.cards.filter(c => String(c.deckId) === String(activeQuizState.deckId));
    if (cards.length === 0) return appAlert('Empty Deck', 'No cards available in this deck.');

    cards = cards.filter(c => {
        if (c.type === 'identification') return allowIdent || allowMCQ;
        if (c.type === 'enumeration') return allowEnum;
        if (c.type === 'tf') return allowTF;
        return true;
    });

    if (cards.length === 0) return appAlert('No Matches', 'No cards match your format selections.');

    enterActivityView('exam');

    const pureIdentAnswers = [...new Set(
        appData.cards
            .filter(c => String(c.deckId) === String(activeQuizState.deckId) && c.type === 'identification')
            .map(c => c.answer)
            .filter(Boolean)
    )];

    cards.sort(() => Math.random() - 0.5);
    if (poolSize !== 'All') cards = cards.slice(0, parseInt(poolSize));

    activeQuizState = {
        deckId: String(activeQuizState.deckId),
        cards,
        identAnswers: pureIdentAnswers,
        direction,
        allowMCQ,
        timerEnabled: isTimer,
        timeRemaining: 20,
        currentIndex: 0,
        score: 0,
        missedCards: [],
        questionLogs: [],
        isSubmitting: false,
        questionStartTime: Date.now()
    };

    closeModal('modal-exam-config');
    renderQuizQuestion();
}

function renderQuizQuestion() {
    clearInterval(quizCountdownTimer);
    const s = activeQuizState;
    const c = s.cards[s.currentIndex];
    s.isSubmitting = false;
    s.questionStartTime = Date.now();

    let promptText = c.prompt;
    let groundTruth = c.answer;
    let isFlipped = false;

    if (s.direction === 'term-def' && c.type === 'identification') {
        isFlipped = true;
        promptText = `What is the definition of: "${c.answer}"?`;
        groundTruth = c.prompt;
    } else if (s.direction === 'mixed' && c.type === 'identification' && Math.random() > 0.5) {
        isFlipped = true;
        promptText = `What is the definition of: "${c.answer}"?`;
        groundTruth = c.prompt;
    }

    s.currentQuestionIsFlipped = isFlipped;
    const foilPoolCount = isFlipped
        ? appData.cards.filter(cardItem => String(cardItem.deckId) === String(c.deckId) && cardItem.type === 'identification').length
        : s.identAnswers.length;

    const isMCQEligible = s.allowMCQ && foilPoolCount >= 4 && c.type === 'identification';

    const container = document.getElementById('viewport-content');
    container.innerHTML = `
        <div class="max-w-xl mx-auto space-y-4 pt-4 md:pt-6">
          <div class="flex items-center justify-between px-1">
            <button onclick="navigateBack()" class="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Exit Exam
            </button>
            <div class="flex items-center gap-3">
              ${s.timerEnabled ? `
                <div id="timer-badge" class="px-3 py-1 rounded-full text-xs font-mono font-black bg-white/80 dark:bg-neutral-800 border border-[#B8DAFF]/60 dark:border-white/10 text-neutral-700 dark:text-neutral-200">
                  ⏱ <span id="timer-num">20</span>s
                </div>
              ` : ''}
              <span class="text-xs font-black font-mono text-[#0D82FF] dark:text-[#389BFF]">${s.currentIndex + 1} / ${s.cards.length}</span>
            </div>
          </div>

          <div id="quiz-card-box" class="glass-card p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl transition border-2 border-transparent">
            <div class="flex items-center justify-between border-b border-[#B8DAFF]/40 dark:border-white/10 pb-3">
              <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E1EFFF] text-[#0D82FF] dark:bg-[#1B2B44] dark:text-[#389BFF]">
                ${c.type === 'tf' ? 'True or False' : (c.type === 'enumeration' ? 'List Verification' : (isMCQEligible ? 'Multiple Choice' : 'Identification'))}
              </span>
              <span class="text-xs font-bold text-neutral-400 font-mono">Score: ${s.score.toFixed(1).replace(/\.0$/, '')}</span>
            </div>

            <div class="text-base md:text-lg font-bold text-neutral-900 dark:text-white leading-relaxed min-h-[50px]">
              ${escapeHTML(promptText)}
            </div>

            <div id="quiz-interaction-slot"></div>
            <div id="quiz-feedback-banner" class="hidden p-3.5 rounded-2xl text-xs font-bold"></div>
          </div>
        </div>
      `;

    mountQuizInteraction(c, groundTruth, promptText);
    lucide.createIcons();

    if (s.timerEnabled) {
        s.timeRemaining = 20;
        const timeNum = document.getElementById('timer-num');
        const badge = document.getElementById('timer-badge');
        quizCountdownTimer = setInterval(() => {
            s.timeRemaining--;
            if (timeNum) timeNum.innerText = s.timeRemaining;
            if (s.timeRemaining <= 3 && badge) {
                badge.classList.add('animate-pulse', 'border-rose-500', 'text-rose-500');
            }
            if (s.timeRemaining <= 0) {
                clearInterval(quizCountdownTimer);
                handleExamAnswer(0, groundTruth, promptText, 'Time Expired!', 'Timeout');
            }
        }, 1000);
    }
}

function mountQuizInteraction(card, groundTruth, promptText) {
    const slot = document.getElementById('quiz-interaction-slot');
    slot.innerHTML = '';
    const s = activeQuizState;

    if (card.type === 'tf') {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-3';
        ['True', 'False'].forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'btn-action-pill py-3.5 rounded-2xl text-xs font-black bg-white/70 dark:bg-white/10 border border-[#B8DAFF]/60 dark:border-white/10 text-neutral-800 dark:text-white';
            btn.textContent = val;
            btn.onclick = () => {
                const isCorr = val.toLowerCase() === groundTruth.toLowerCase();
                handleExamAnswer(isCorr ? 1 : 0, groundTruth, promptText, '', val);
            };
            grid.appendChild(btn);
        });
        slot.appendChild(grid);
        return;
    }

    if (card.type === 'enumeration') {
        const expectedItems = groundTruth.split(',').map(i => i.trim()).filter(Boolean);
        const wrap = document.createElement('div');
        wrap.className = 'space-y-3';
        const label = document.createElement('p');
        label.className = 'text-[11px] font-bold text-neutral-400';
        label.innerText = `Enter ${expectedItems.length} items (comma-separated, partial credit supported):`;
        wrap.appendChild(label);

        const input = document.createElement('input');
        input.id = 'active-quiz-input';
        input.type = 'text';
        input.placeholder = 'e.g. Item 1, Item 2, Item 3...';
        input.className = 'w-full p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-800 border border-[#B8DAFF]/60 dark:border-white/15 text-xs font-bold outline-none focus:border-[#0D82FF] text-neutral-800 dark:text-white';
        input.onkeydown = e => { if (e.key === 'Enter') checkEnumAnswer(expectedItems, groundTruth, promptText); };

        const btn = document.createElement('button');
        btn.className = 'w-full btn-action-pill py-3 rounded-2xl text-xs font-black bg-[#0D82FF] text-white shadow-md';
        btn.textContent = 'Verify List';
        btn.onclick = () => checkEnumAnswer(expectedItems, groundTruth, promptText);

        wrap.appendChild(input);
        wrap.appendChild(btn);
        slot.appendChild(wrap);
        setTimeout(() => input.focus(), 50);
        return;
    }

    // Allow MCQ even when flipped by pulling prompts (definitions) instead of answers (terms)
    const foilPool = s.currentQuestionIsFlipped
        ? appData.cards
            .filter(c => String(c.deckId) === String(card.deckId) && c.type === 'identification')
            .map(c => c.prompt)
        : s.identAnswers;

    const isMCQ = s.allowMCQ && foilPool.length >= 4 && card.type === 'identification';

    if (isMCQ) {
        const pool = foilPool.filter(a => normalize(a) !== normalize(groundTruth));
        pool.sort(() => Math.random() - 0.5);
        const distractors = pool.slice(0, 3);
        const options = [groundTruth, ...distractors].sort(() => Math.random() - 0.5);

        const form = document.createElement('div');
        form.className = 'space-y-2.5';
        options.forEach(opt => {
            const row = document.createElement('label');
            row.className = 'radio-input-wrapper p-3 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-[#B8DAFF]/40 dark:border-white/10 hover:border-[#0D82FF]';
            row.innerHTML = `
            <input type="radio" name="quiz-radio" class="radio-input" value="${escapeHTML(opt)}">
            <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">${escapeHTML(opt)}</span>
          `;
            row.onclick = () => {
                const isCorr = normalize(opt) === normalize(groundTruth);
                handleExamAnswer(isCorr ? 1 : 0, groundTruth, promptText, '', opt);
            };
            form.appendChild(row);
        });
        slot.appendChild(form);
    } else {
        const wrap = document.createElement('div');
        wrap.className = 'space-y-3';
        const input = document.createElement('input');
        input.id = 'active-quiz-input';
        input.type = 'text';
        input.placeholder = 'Type your answer here...';
        input.className = 'w-full p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-800 border border-[#B8DAFF]/60 dark:border-white/15 text-xs font-bold outline-none focus:border-[#0D82FF] text-neutral-800 dark:text-white';
        input.onkeydown = e => { if (e.key === 'Enter') checkIdentAnswer(groundTruth, promptText); };

        const btn = document.createElement('button');
        btn.className = 'w-full btn-action-pill py-3 rounded-2xl text-xs font-black bg-[#0D82FF] text-white shadow-md';
        btn.textContent = 'Submit Answer';
        btn.onclick = () => checkIdentAnswer(groundTruth, promptText);

        wrap.appendChild(input);
        wrap.appendChild(btn);
        slot.appendChild(wrap);
        setTimeout(() => input.focus(), 50);
    }
}

function checkIdentAnswer(groundTruth, promptText) {
    const s = activeQuizState;
    const input = document.getElementById('active-quiz-input');
    const val = input ? input.value : '';
    const entered = normalize(val);
    const target = normalize(groundTruth);

    let isCorrect = 0;

    if (s && s.currentQuestionIsFlipped) {
        // Keyword overlap scoring for typed definition sentences
        const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'and', 'or', 'so', 'it', 'its', 'that', 'this']);

        // Preserve spaces between words so split(/\s+/) works as intended
        const toWords = str => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

        const expectedKeywords = toWords(groundTruth).filter(w => w.length > 2 && !stopWords.has(w));
        const userKeywords = new Set(toWords(val).filter(w => w.length > 2 && !stopWords.has(w)));

        if (expectedKeywords.length === 0) {
            isCorrect = entered === target ? 1 : 0;
        } else {
            const hits = expectedKeywords.filter(w => userKeywords.has(w)).length;
            // Gives credit if the user typed at least 60% of the core keywords
            isCorrect = (hits / expectedKeywords.length) >= 0.6 ? 1 : 0;
        }
    } else {
        // Standard strict check for short terms
        const dist = levenshtein(entered, target);
        const allowedTolerance = target.length >= 8 ? 2 : (target.length >= 4 ? 1 : 0);
        isCorrect = (dist <= allowedTolerance || entered === target) ? 1 : 0;
    }

    handleExamAnswer(isCorrect, groundTruth, promptText, '', val);
}

function checkEnumAnswer(expectedItems, groundTruth, promptText) {
    const input = document.getElementById('active-quiz-input');
    const val = input ? input.value : '';
    const enteredList = val.split(',').map(normalize).filter(Boolean);
    const expectedNormalized = expectedItems.map(normalize);

    let matches = 0;
    const matchedExpectedIndices = new Set();

    enteredList.forEach(ent => {
        for (let idx = 0; idx < expectedNormalized.length; idx++) {
            // Match each entered response to at most one expected item
            if (!matchedExpectedIndices.has(idx) && levenshtein(ent, expectedNormalized[idx]) <= 1) {
                matchedExpectedIndices.add(idx);
                matches++;
                break;
            }
        }
    });

    const totalExpected = expectedNormalized.length || 1;
    const earnedFraction = Math.min(1, matches / totalExpected);
    let note = '';
    if (earnedFraction > 0 && earnedFraction < 1) {
        note = `Partial Credit: ${matches}/${totalExpected} items correct (+${Math.round(earnedFraction * 100)}%)`;
    }

    handleExamAnswer(earnedFraction, groundTruth, promptText, note, val);
}

function handleExamAnswer(creditScore, groundTruth, promptText, customNote = '', userAnswer = '') {
    const s = activeQuizState;
    if (s.isSubmitting) return;
    s.isSubmitting = true;
    clearInterval(quizCountdownTimer);

    const responseTime = Math.max(1, Math.round((Date.now() - s.questionStartTime) / 1000));
    appData.telemetry.totalStudyTimeSec += responseTime;
    appData.telemetry.totalResponses += 1;

    const card = s.cards[s.currentIndex];
    const targetCard = appData.cards.find(c => String(c.id) === String(card.id));

    s.score += creditScore;

    s.questionLogs.push({
        prompt: promptText,
        expectedAnswer: groundTruth,
        userAnswer: userAnswer || '(None)',
        credit: creditScore,
        type: card.type
    });

    if (targetCard) {
        targetCard.totalAttempts = (targetCard.totalAttempts || 0) + 1;
        if (creditScore >= 1) {
            targetCard.consecutiveCorrect = (targetCard.consecutiveCorrect || 0) + 1;
        } else {
            targetCard.consecutiveCorrect = 0;
            targetCard.misses = (targetCard.misses || 0) + 1;
        }
        saveAppData();
    }

    const cardBox = document.getElementById('quiz-card-box');
    const banner = document.getElementById('quiz-feedback-banner');
    banner.classList.remove('hidden');

    if (creditScore >= 1) {
        cardBox.classList.add('border-emerald-500');
        banner.className = 'p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-black';
        banner.innerText = 'Correct! Outstanding recall.';
    } else if (creditScore > 0) {
        cardBox.classList.add('border-amber-500');
        banner.className = 'p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black';
        banner.innerHTML = `${customNote ? escapeHTML(customNote) + ' &bull; ' : ''}Expected: <span class="underline">${escapeHTML(groundTruth)}</span>`;
        s.missedCards.push(card);
    } else {
        s.missedCards.push(card);
        cardBox.classList.add('border-rose-500');
        banner.className = 'p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs font-black';
        banner.innerHTML = `${customNote ? escapeHTML(customNote) + ' ' : ''}Correct: <span class="underline">${escapeHTML(groundTruth)}</span>`;
    }

    setTimeout(() => {
        s.currentIndex++;
        if (s.currentIndex < s.cards.length) {
            renderQuizQuestion();
        } else {
            renderQuizSummary();
        }
    }, 1300);
}

function renderQuizSummary() {
    const s = activeQuizState;
    const pct = Math.round((s.score / s.cards.length) * 100);
    const container = document.getElementById('viewport-content');

    container.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-5 mt-6 pb-12">
          <div class="glass-card p-6 md:p-8 rounded-3xl space-y-4 text-center shadow-2xl">
            <div class="text-5xl font-black text-neutral-900 dark:text-white">${pct}%</div>
            <div>
              <h3 class="text-xl font-black text-neutral-800 dark:text-white">Exam Completed</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Score: ${s.score.toFixed(1).replace(/\.0$/, '')} / ${s.cards.length} points (${pct}%)</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              ${s.missedCards.length > 0 ? `
                <button onclick="retryMissedQuestionsLoop()" class="btn-action-pill py-2.5 px-5 rounded-2xl text-xs font-black bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                  Retry Missed Questions (${s.missedCards.length})
                </button>
              ` : `
                <div class="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
                  Perfect Score Achieved! 100% Mastery
                </div>
              `}
              <button onclick="navigateBack()" class="py-2.5 px-5 rounded-2xl text-xs font-bold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                Return to Dashboard
              </button>
            </div>
          </div>

          <!-- PER-QUESTION REVIEW SCREEN -->
          <div class="glass-card p-6 rounded-3xl space-y-4 shadow-xl">
            <div class="flex items-center justify-between border-b border-[#B8DAFF]/40 dark:border-white/10 pb-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4 text-[#0D82FF]"></i> Question-by-Question Review
              </h4>
              <span class="text-xs font-bold text-neutral-400 font-mono">${s.questionLogs.length} Questions</span>
            </div>

            <div class="space-y-3">
              ${s.questionLogs.map((log, idx) => {
        const isFull = log.credit >= 1;
        const isPartial = log.credit > 0 && log.credit < 1;
        const badgeColor = isFull ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : (isPartial ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300');
        const badgeLabel = isFull ? 'Correct (+1.0)' : (isPartial ? `Partial (+${log.credit.toFixed(2)})` : 'Missed (0.0)');

        return `
                  <div class="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-[#B8DAFF]/40 dark:border-white/10 space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-xs font-bold text-neutral-800 dark:text-white flex-1">
                        <span class="font-mono text-neutral-400 font-semibold mr-1">#${idx + 1}</span> ${escapeHTML(log.prompt)}
                      </span>
                      <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${badgeColor}">${badgeLabel}</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div class="p-2 rounded-xl bg-black/5 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5">
                        <span class="block text-[9px] font-bold text-neutral-400 uppercase">Your Answer</span>
                        <span class="${isFull ? 'text-emerald-600 dark:text-emerald-400 font-bold' : (isPartial ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold')}">${escapeHTML(log.userAnswer)}</span>
                      </div>
                      <div class="p-2 rounded-xl bg-black/5 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5">
                        <span class="block text-[9px] font-bold text-neutral-400 uppercase">Correct Answer</span>
                        <span class="text-[#0D82FF] dark:text-[#389BFF] font-bold">${escapeHTML(log.expectedAnswer)}</span>
                      </div>
                    </div>
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        </div>
      `;
    lucide.createIcons();
}

function retryMissedQuestionsLoop() {
    activeQuizState.cards = [...activeQuizState.missedCards].sort(() => Math.random() - 0.5);
    activeQuizState.missedCards = [];
    activeQuizState.questionLogs = [];
    activeQuizState.currentIndex = 0;
    activeQuizState.score = 0;
    renderQuizQuestion();
}

function cramSingleCard(cardId) {
    const card = appData.cards.find(c => String(c.id) === String(cardId));
    if (!card) return;
    enterActivityView('exam');
    activeQuizState = {
        deckId: String(card.deckId),
        cards: [card],
        identAnswers: [card.answer],
        direction: 'def-term',
        allowMCQ: false,
        timerEnabled: false,
        currentIndex: 0,
        score: 0,
        missedCards: [],
        questionLogs: [],
        isSubmitting: false,
        questionStartTime: Date.now()
    };
    renderQuizQuestion();
}

