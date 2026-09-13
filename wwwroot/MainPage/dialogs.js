/* ==========================================================================
   ROBUST MODAL & DIALOG SUBSYSTEM
   ========================================================================== */
let currentDialogResolver = null;

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    const focusable = modal.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

function dismissAppDialog() {
    if (currentDialogResolver) {
        const resolve = currentDialogResolver;
        currentDialogResolver = null;
        resolve(null);
    }
    closeModal('modal-app-dialog');
}

function appAlert(title, message) {
    if (currentDialogResolver) { currentDialogResolver(null); currentDialogResolver = null; }
    return new Promise(resolve => {
        currentDialogResolver = resolve;
        const dialog = document.getElementById('modal-app-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = message;
        document.getElementById('dialog-input-wrapper').classList.add('hidden');

        const btns = document.getElementById('dialog-action-buttons');
        btns.innerHTML = `
          <button id="dialog-ok-btn" class="btn-action-pill px-5 py-2 rounded-xl text-xs font-black bg-[#0D82FF] text-white">OK</button>
        `;

        openModal('modal-app-dialog');
        document.getElementById('dialog-ok-btn').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve();
        };
    });
}

function appConfirm(title, message) {
    if (currentDialogResolver) { currentDialogResolver(null); currentDialogResolver = null; }
    return new Promise(resolve => {
        currentDialogResolver = (val) => resolve(!!val);
        const dialog = document.getElementById('modal-app-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = message;
        document.getElementById('dialog-input-wrapper').classList.add('hidden');

        const btns = document.getElementById('dialog-action-buttons');
        btns.innerHTML = `
          <button id="dialog-cancel-btn" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">Cancel</button>
          <button id="dialog-confirm-btn" class="btn-action-pill px-5 py-2 rounded-xl text-xs font-black bg-rose-500 text-white">Confirm</button>
        `;

        openModal('modal-app-dialog');
        document.getElementById('dialog-cancel-btn').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(false);
        };
        document.getElementById('dialog-confirm-btn').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(true);
        };
    });
}

function appPrompt(title, placeholder = '') {
    if (currentDialogResolver) { currentDialogResolver(null); currentDialogResolver = null; }
    return new Promise(resolve => {
        currentDialogResolver = resolve;
        const dialog = document.getElementById('modal-app-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = '';
        const inputWrap = document.getElementById('dialog-input-wrapper');
        const input = document.getElementById('dialog-prompt-input');
        inputWrap.classList.remove('hidden');
        input.value = '';
        input.placeholder = placeholder;

        const btns = document.getElementById('dialog-action-buttons');
        btns.innerHTML = `
          <button id="dialog-prompt-cancel" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">Cancel</button>
          <button id="dialog-prompt-save" class="btn-action-pill px-5 py-2 rounded-xl text-xs font-black bg-[#0D82FF] text-white">Save</button>
        `;

        openModal('modal-app-dialog');
        setTimeout(() => input.focus(), 50);

        const handleSave = () => {
            const val = input.value.trim();
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(val || null);
        };

        input.onkeydown = e => { if (e.key === 'Enter') handleSave(); };
        document.getElementById('dialog-prompt-save').onclick = handleSave;
        document.getElementById('dialog-prompt-cancel').onclick = () => {
            currentDialogResolver = null;
            closeModal('modal-app-dialog');
            resolve(null);
        };
    });
}

// Modal Backdrop Click & Escape Trapping
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            if (backdrop.id === 'modal-app-dialog') {
                dismissAppDialog();
            } else {
                closeModal(backdrop.id);
            }
        }
    });
});

window.addEventListener('keydown', e => {
    const openModals = Array.from(document.querySelectorAll('.modal-backdrop:not(.hidden)'));
    if (!openModals.length) return;
    const topModal = openModals[openModals.length - 1];

    if (e.key === 'Escape') {
        e.preventDefault();
        if (topModal.id === 'modal-app-dialog') {
            dismissAppDialog();
        } else {
            closeModal(topModal.id);
        }
        return;
    }

    if (e.key === 'Tab') {
        const focusable = topModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
});

