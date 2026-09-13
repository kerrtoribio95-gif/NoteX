/* ==========================================================================
   STUDY SHEET EXPORT (PDF)
   ========================================================================== */
let pdfExportDeckId = null;

function promptPDFExport(deckId) {
    const deck = appData.decks.find(d => String(d.id) === String(deckId));
    if (!deck) return appAlert('Error', 'Deck could not be found.');

    pdfExportDeckId = String(deck.id);
    openModal('modal-export-pdf');
    lucide.createIcons();
}

function generateStudySheetPDF() {
    const { jsPDF } = window.jspdf;
    const isBlankExam = document.getElementById('pdf-blank-exam-toggle').checked;
    const deck = appData.decks.find(d => String(d.id) === String(pdfExportDeckId));

    if (!deck) {
        appAlert('Error', 'Deck not found for PDF export.');
        closeModal('modal-export-pdf');
        return;
    }

    const cards = appData.cards.filter(c => String(c.deckId) === String(pdfExportDeckId));
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Dark Blue Header Card
    doc.setFillColor(15, 23, 42); // slate-900 / dark navy
    doc.roundedRect(14, 12, pageWidth - 28, 28, 4, 4, 'F');

    // Title inside header with collision prevention
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    let headerTitle = isBlankExam ? `EXAM: ${deck.title.toUpperCase()}` : `${deck.title.toUpperCase()} STUDY GUIDE`;

    const maxTitleWidth = pageWidth - 105; // leaves safe buffer before the badges
    if (doc.getTextWidth(headerTitle) > maxTitleWidth) {
        while (doc.getTextWidth(headerTitle + '...') > maxTitleWidth && headerTitle.length > 0) {
            headerTitle = headerTitle.slice(0, -1);
        }
        headerTitle += '...';
    }
    doc.text(headerTitle, 20, 23);

    // Subtitle inside header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Official Examination Reviewer • ${deck.period} Curriculum`, 20, 31);

    // Header Pill Badges
    // Pill 1: Period
    doc.setFillColor(13, 130, 255); // brand blue
    doc.roundedRect(pageWidth - 78, 19, 26, 6.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${deck.period.toUpperCase()} PERIOD`, pageWidth - 65, 23.5, { align: 'center' });

    // Pill 2: Question Count
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(pageWidth - 50, 19, 32, 6.5, 2, 2, 'F');
    doc.setTextColor(226, 232, 240);
    doc.text(`${cards.length} HIGH-YIELD ITEMS`, pageWidth - 34, 23.5, { align: 'center' });

    // 2. Section Heading with Vertical Accent Bar
    let currentY = 48;
    doc.setFillColor(13, 130, 255);
    doc.rect(14, currentY, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. CONCEPTS, DEFINITIONS & ANSWERS', 19, currentY + 5.5);

    // 3. Prepare Table Data
    const tableRows = cards.map((c, idx) => {
        const itemNum = String(idx + 1).padStart(2, '0');
        let scopeText = c.prompt;

        let answerText = '';
        if (isBlankExam) {
            answerText = '____________________';
        } else {
            if (c.type === 'enumeration') {
                answerText = c.answer.split(',').map(i => `• ${i.trim()}`).join('\n');
            } else {
                answerText = c.answer;
            }
        }

        return [itemNum, scopeText, answerText];
    });

    // 4. Render Table via AutoTable
    doc.autoTable({
        startY: currentY + 10,
        margin: { left: 14, right: 14, bottom: 18 },
        head: [['ITEM', 'CONCEPT DEFINITION & SCOPE', isBlankExam ? 'YOUR ANSWER' : 'OFFICIAL TERM / ANSWER']],
        body: tableRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
            lineColor: [226, 232, 240], // slate-200
            lineWidth: 0.2,
            valign: 'middle',
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [15, 23, 42], // dark navy table header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // light slate stripe
        },
        columnStyles: {
            0: {
                cellWidth: 14,
                halign: 'center',
                textColor: [13, 130, 255], // blue item numbers
                fontStyle: 'bold'
            },
            1: {
                cellWidth: 'auto',
                fontStyle: 'normal'
            },
            2: {
                cellWidth: 55,
                fontStyle: 'bold',
                textColor: [15, 23, 42]
            }
        },
        didDrawPage: (data) => {
            // Footer page numbers
            const str = `Page ${doc.internal.getNumberOfPages()}`;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        }
    });

    // 5. Download File
    doc.save(`${deck.title.replace(/\s+/g, '_')}_Reviewer.pdf`);
    closeModal('modal-export-pdf');
}

