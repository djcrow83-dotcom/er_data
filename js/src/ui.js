window.currentRenderLimit = 50;
window.tableScrollObserver = null;

window.renderTable = (data, append = false) => {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    let focusedRowId = null;
    let focusedFieldClass = null;
    let focusedSelection = null;
    if (!append && document.activeElement && tbody.contains(document.activeElement)) {
        const tr = document.activeElement.closest('tr');
        if (tr) focusedRowId = tr.id;
        focusedFieldClass = Array.from(document.activeElement.classList).find(c => c.startsWith('field-'));
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') {
            try { focusedSelection = document.activeElement.selectionStart; } catch (e) { }
        }
    }

    if (data.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
        return;
    }
    document.getElementById('emptyState').classList.add('hidden');

    if (!append) window.currentRenderLimit = 50;

    const startIdx = append ? window.currentRenderLimit - 50 : 0;
    const dataToRender = data.slice(startIdx, window.currentRenderLimit);

    let rows = '';
    const now = Date.now();
    const role = localStorage.getItem('er_system_role');

    dataToRender.forEach(d => {
        const pending = unsavedChanges.get(String(d._id)) || {};
        const r = { ...d, ...pending };
        let isUrgent = (r._status !== '처리완료' && (now - window.parseDate(r._date)) > 259200000);

        const bgClass = isUrgent ? 'bg-[#FEE2E2] hover:bg-[#FECACA]' : 'hover:bg-[#FAF3EE]';
        const stickyBg = isUrgent ? 'bg-[#FEE2E2]' : 'bg-white';
        const isSel = selectedIds.has(String(d._id));

        const ropt = `<option value="">선택</option>` + ['변심', '불량', '색상', '사이즈', '색상/사이즈', '수선', '오배송'].map(x => `<option value="${x}" ${r._reason === x ? 'selected' : ''}>${x}</option>`).join('');
        const sopt = `<option value="">선택</option>` + ['결제', '입금', '차감', '무상', '무료배송권', '동봉'].map(x => `<option value="${x}" ${r._shipping === x ? 'selected' : ''}>${x}</option>`).join('');
        const copt = `<option value="">선택</option>` + ['정상', '불량'].map(x => `<option value="${x}" ${r._product_condition === x ? 'selected' : ''}>${x}</option>`).join('');

        rows += `<tr id="row-${d._id}" class="${bgClass} border-b border-[#E8DDD4] transition-colors group">
                    <td class="px-4 py-2 text-center sticky left-0 z-30 ${stickyBg} border-r border-[#F0E8E0] min-w-[50px]">
                        <input type="checkbox" class="w-5 h-5 accent-[#D97756] row-check" value="${d._id}" ${isSel ? 'checked' : ''} onchange="window.toggleRowSelection('${d._id}')">
                    </td>`;

        COLUMNS.forEach(col => {
            let tdClass = `px-2 py-2 align-top`;
            let tdStyle = '';

            const val = r[col.id] || '';
            let inputHtml = '';
            if (col.id === '_status') {
                const icon = val === '처리완료' ? '✔' : (val === '보류' ? '!' : '-');
                const color = val === '처리완료' ? 'text-[#5E7A4A]' : (val === '보류' ? 'text-[#A67A52]' : 'text-[#B8A99C]');
                const statusOpts = ['미처리', '처리완료', '보류'].map(x => `<option value="${x}" ${val === x ? 'selected' : ''}>${x}</option>`).join('');
                inputHtml = `<div class="flex items-center gap-1"><span class="status-icon text-xs font-bold w-3 text-center ${color}">${icon}</span><select class="flex-grow text-xs border rounded p-1 outline-none focus:border-[#D97756] font-bold ${color} field-_status ${pending._status ? 'unsaved-input' : ''}" onchange="window.updateField('${d._id}', '_status', this.value)">${statusOpts}</select></div>`;
            } else if (col.id === '_reason') {
                inputHtml = `<select class="w-full text-xs border rounded p-1 outline-none focus:border-[#D97756] field-_reason ${pending._reason ? 'unsaved-input' : ''}" onchange="window.updateField('${d._id}','_reason',this.value)">${ropt}</select>`;
            } else if (col.id === '_shipping') {
                inputHtml = `<select class="w-full text-xs border rounded p-1 outline-none focus:border-[#D97756] field-_shipping ${pending._shipping ? 'unsaved-input' : ''}" onchange="window.updateField('${d._id}','_shipping',this.value)">${sopt}</select>`;
            } else if (col.id === '_product_condition') {
                inputHtml = `<select class="w-full text-xs border rounded p-1 outline-none focus:border-[#D97756] field-_product_condition ${pending._product_condition ? 'unsaved-input' : ''}" onchange="window.updateField('${d._id}','_product_condition',this.value)">${copt}</select>`;
            } else {
                const align = col.align === 'right' ? 'text-right' : '';
                const dateColor = (col.id === '_date' && isUrgent) ? 'text-[#B85C4A] font-bold' : '';
                inputHtml = `<input type="text" class="table-input field-${col.id} ${align} ${dateColor} ${pending[col.id] ? 'unsaved-input' : ''}" value="${window.escapeHtml(val)}" onchange="window.updateField('${d._id}', '${col.id}', this.value)" ${col.id === '_product' ? 'ondblclick="window.copyProductName(this)"' : ''}>`;
                if (col.id === '_product') inputHtml = `<div class="relative w-full">${inputHtml}<button onclick="window.openCombinedModal('${d._id}')" class="absolute right-0 top-1/2 -translate-y-1/2 combined-btn text-slate-300 hover:text-[#D97756] bg-white rounded p-0.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></button></div>`;
            }
            rows += `<td class="${tdClass}" style="${tdStyle}">${inputHtml}</td>`;
        });

        if (role === 'admin' || role === 'system') {
            rows += `<td class="px-2 py-2 text-center text-[#D4C4B8] hover:text-[#B85C4A] cursor-pointer font-bold" onclick="window.promptDeleteModal('${d._id}')">×</td></tr>`;
        } else {
            rows += `<td class="px-2 py-2 text-center text-[#D4C4B8] font-bold"></td></tr>`;
        }
    });

    if (append) {
        const trigger = document.getElementById('scroll-trigger');
        if (trigger) trigger.remove();
        tbody.insertAdjacentHTML('beforeend', rows);
    } else {
        tbody.innerHTML = rows;
    }

    if (window.currentRenderLimit < data.length) {
        const trigger = document.createElement('tr');
        trigger.id = 'scroll-trigger';
        trigger.innerHTML = `<td colspan="100%" class="text-center p-4 text-[#B8A99C] text-xs font-bold">더 불러오는 중... (${window.currentRenderLimit} / ${data.length})</td>`;
        tbody.appendChild(trigger);

        if (window.tableScrollObserver) window.tableScrollObserver.disconnect();
        window.tableScrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                window.currentRenderLimit += 50;
                window.renderTable(data, true);
            }
        }, { root: tbody.closest('.overflow-y-auto'), rootMargin: '200px' });
        window.tableScrollObserver.observe(trigger);
    }

    if (!append && focusedRowId && focusedFieldClass) {
        const restoredTr = document.getElementById(focusedRowId);
        if (restoredTr) {
            const restoredEl = restoredTr.querySelector(`.${focusedFieldClass}`);
            if (restoredEl) {
                restoredEl.focus();
                if (restoredEl.tagName === 'INPUT' && restoredEl.type === 'text' && focusedSelection !== null) {
                    try { restoredEl.setSelectionRange(focusedSelection, focusedSelection); } catch (e) { }
                }
            }
        }
    }
};

window.updateField = (id, field, value) => {
    if (isArchiveMode) return;
    const strId = String(id); const row = standardData.find(d => String(d._id) === strId); if (!row) return;
    if (field === '_reason' && value === '기타') { window.openReasonInputModal(id); return; }
    const currentPending = unsavedChanges.get(strId) || {}; let updates = { [field]: value };
    if (['_product_price', '_discount_amount', '_payment_amount', '_shipping_cost_paid'].includes(field)) {
        const getVal = (k) => (updates.hasOwnProperty(k) ? updates[k] : (currentPending.hasOwnProperty(k) ? currentPending[k] : row[k]));
        const p = window.parseMoney(getVal('_product_price')); const d = window.parseMoney(getVal('_discount_amount')); let pay = window.parseMoney(getVal('_payment_amount'));
        if (field === '_product_price' || field === '_discount_amount') { pay = p - d; updates['_payment_amount'] = window.formatMoney(pay); }
        const sPaid = window.parseMoney(getVal('_shipping_cost_paid')); updates['_refund_amount'] = window.formatMoney(pay - sPaid);
    }
    if (field === '_status' && value === '처리완료') updates['_pic'] = currentUserName;
    unsavedChanges.set(strId, { ...currentPending, ...updates }); window.updateSaveButton();

    const tr = document.getElementById(`row-${strId}`);
    if (tr) {
        const input = tr.querySelector(`.field-${field}`);
        if (input) {
            input.value = value;
            input.classList.add('unsaved-input');
            if (field === '_status') {
                const color = value === '처리완료' ? 'text-[#5E7A4A]' : (value === '보류' ? 'text-[#A67A52]' : 'text-[#B8A99C]');
                const icon = value === '처리완료' ? '✔' : (value === '보류' ? '!' : '-');
                const iconSpan = tr.querySelector('.status-icon');
                if (iconSpan) { iconSpan.className = `status-icon text-xs font-bold w-3 text-center ${color}`; iconSpan.innerText = icon; }
                input.className = `flex-grow text-xs border rounded p-1 outline-none focus:border-[#D97756] font-bold field-_status unsaved-input ${color}`;
            }
        }
    }
};

