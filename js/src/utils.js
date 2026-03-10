// --- 3. GLOBAL FUNCTIONS (Hoisted) ---

let cleanupRetryCount = 0;
window.cleanupPendingData = async () => {
    if (!db) return;

    if (standardData.length === 0) {
        if (cleanupRetryCount < 10) {
            cleanupRetryCount++;
            setTimeout(window.cleanupPendingData, 1000);
        }
        return;
    }

    try {
        const pendingItems = standardData.filter(d => false); // All pending statuses and logic have been removed from the application
        if (pendingItems.length === 0) return;

        let batch = writeBatch(db);
        let batchCount = 0;
        let totalCleaned = 0;

        for (const data of pendingItems) {
            const docId = String(data._id);
            // [FIX] Restore raw collection path without 'artifacts/appId...'
            const ref = doc(db, LIVE_COLLECTION_NAME, docId);

            batch.update(ref, {
                // Fields are already removed
            });

            batchCount++;
            totalCleaned++;

            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        if (totalCleaned > 0) console.log(`[System] 작업 중단으로 멈춰있던 데이터 ${totalCleaned}건 메모리 기반 자동 복구 완료.`);
    } catch (e) {
        console.warn("[System] 데이터 자동 정리 실패:", e);
    }
};

window.escapeHtml = (unsafe) => {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

window.pendingConfirmAction = null;
window.showConfirm = (msg, action) => {
    document.getElementById('genericConfirmMessage').innerText = msg;
    window.pendingConfirmAction = action;
    document.getElementById('genericConfirmModal').classList.remove('hidden');
};
window.closeGenericConfirm = () => {
    document.getElementById('genericConfirmModal').classList.add('hidden');
    window.pendingConfirmAction = null;
};
document.getElementById('genericConfirmBtn').onclick = () => {
    if (window.pendingConfirmAction) window.pendingConfirmAction();
    window.closeGenericConfirm();
};

window.parseDate = (s) => {
    if (!s) return 0;
    const koreanMatch = s.match(/(\d+)월\s*(\d+)일/);
    const now = new Date();
    let year = now.getFullYear();
    if (koreanMatch) {
        const parsed = new Date(year, parseInt(koreanMatch[1]) - 1, parseInt(koreanMatch[2]));
        if (parsed.getTime() > now.getTime() + 7 * 24 * 60 * 60 * 1000) year--;
        return new Date(year, parseInt(koreanMatch[1]) - 1, parseInt(koreanMatch[2])).getTime();
    }

    if (typeof s === 'string' && s.includes('-')) {
        const parts = s.split('-');
        if (parts.length >= 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
        }
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};
window.parseMoney = (v) => parseInt(String(v).replace(/[^0-9-]/g, '')) || 0;
window.formatMoney = (n) => '₩' + n.toLocaleString();
window.isUrgent = (r) => {
    const ts = window.parseDate(r._date);
    return r._status !== '처리완료' && ts > 0 && (Date.now() - ts) > 259200000;
};
window.getStatusIcon = (s) => s === '처리완료' ? '✔' : (s === '보류' ? '!' : '-');
window.showToast = (m) => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const d = document.createElement('div'); d.className = 'toast show'; d.innerText = m;
    container.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.remove(); }, 3000);
};
window.showLoading = (s) => { const overlay = document.getElementById('loadingOverlay'); if (overlay) overlay.classList.toggle('hidden', !s); };

window.updateSaveButton = () => {
    const c = unsavedChanges.size;
    const badge = document.getElementById('unsavedCount');
    if (badge) badge.innerText = c;
    const btn = document.getElementById('saveChangesBtn');
    if (btn) { btn.classList.toggle('hidden', c === 0); btn.disabled = (c === 0); }
};

window.updateSelectionUI = () => {
    const count = selectedIds.size;
    const disp = document.getElementById('selectedCountDisplay');
    if (disp) disp.innerText = count + '개 선택';
    const container = document.getElementById('bulkActionContainer');
    if (container) {
        if (count > 0) { container.classList.remove('hidden'); container.classList.add('flex'); }
        else { container.classList.add('hidden'); container.classList.remove('flex'); }
    }
    const cb = document.getElementById('selectAllCheckboxTop');
    if (cb) cb.checked = (standardData.length > 0 && selectedIds.size === standardData.length);
};

window.updateTableCheckboxes = () => { document.querySelectorAll('.row-check').forEach(c => c.checked = selectedIds.has(c.value)); };

window.getMergedData = () => {
    const validData = standardData.filter(d => d._customer || d._product || d._order_id);
    if (unsavedChanges.size === 0) return validData;

    // 수정된 항목(unsavedChanges)이 있을 때만 해당 항목을 찾아 덮어쓰기 (방안 1)
    const merged = [...validData];
    for (const [id, pending] of unsavedChanges.entries()) {
        const idx = merged.findIndex(d => String(d._id) === id);
        if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...pending };
        }
    }
    return merged;
};

window.updateKPI = () => {
    const data = window.getMergedData();
    const total = data.length;
    const unprocessed = data.filter(d => (d._status || '').trim() === '미처리').length;
    const urgent = data.filter(d => window.isUrgent(d)).length;
    const processed = data.filter(d => (d._status || '').trim() === '처리완료').length;
    const defect = data.filter(d => (d._product_condition || '').trim() === '불량').length;
    const exchange = data.filter(d => (d._type || '').includes('교환')).length;
    const refundCount = data.filter(d => (d._type || '').includes('반품')).length;
    const refundSum = data.reduce((acc, d) => acc + window.parseMoney(d._refund_amount), 0);
    const defectRate = total > 0 ? ((defect / total) * 100).toFixed(1) : 0;

    const qMap = { quickTotal: total, quickUnprocessed: unprocessed, quickUrgent: urgent, quickCompleted: processed, quickRefundTotal: window.formatMoney(refundSum) };
    Object.entries(qMap).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.innerText = val.toLocaleString(); });
    const kpiMap = { kpiTotal: total, kpiUnprocessed: unprocessed, kpiUrgent: urgent, kpiDefect: defect, kpiMisdelivery: data.filter(d => (d._reason || '').includes('오배송')).length, kpiExchangeRate: exchange, kpiReturnRate: refundCount, kpiDefectRate: defectRate + '%' };
    Object.entries(kpiMap).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.innerText = val.toLocaleString(); });
};

window.renderRefundStats = () => {
    const container = document.getElementById('refundDataContainer');
    if (!container) return;
    const data = window.getMergedData();
    const aggregated = {};
    data.forEach(row => {
        const amount = window.parseMoney(row._refund_amount);
        if (!amount || amount <= 0) return;
        const ts = window.parseDate(row._date);
        if (!ts) return;
        const d = new Date(ts);
        let key = '', label = '';
        if (currentChartPeriod === 'daily') { key = d.toISOString().split('T')[0]; label = `${d.getMonth() + 1}/${d.getDate()}`; }
        else if (currentChartPeriod === 'weekly') {
            const firstDay = new Date(d.getFullYear(), 0, 1);
            const week = Math.ceil(((d - firstDay) / 86400000 + firstDay.getDay() + 1) / 7);
            key = `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`; label = `${d.getFullYear().toString().slice(-2)}년 ${week}주`;
        } else { key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`; }
        if (!aggregated[key]) aggregated[key] = { label, amount: 0 };
        aggregated[key].amount += amount;
    });
    const sorted = Object.entries(aggregated).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
    container.innerHTML = sorted.map(([k, d]) => `<div class="bg-[#FAF3EE] p-3 rounded-lg text-center shadow-sm hover:bg-white transition-all border border-transparent hover:border-[#D97756]"><span class="text-[10px] font-bold text-[#8B7B6E] block mb-1">${d.label}</span><span class="text-sm font-bold text-[#D97756]">${window.formatMoney(d.amount)}</span></div>`).join('');
};

window.renderAllButtons = () => {
    const sDiv = document.getElementById('statusButtons');
    if (!sDiv) return;
    const data = window.getMergedData();
    const counts = { '미처리': 0, '처리완료': 0, '보류': 0 };
    data.forEach(d => { if (counts[d._status] !== undefined) counts[d._status]++; else counts['미처리']++; });
    sDiv.innerHTML = ['미처리', '처리완료', '보류'].map(s => `<button onclick="window.setActiveStatus('${s}')" class="status-btn px-4 py-1.5 border border-[#D4C4B8] rounded-md bg-white text-xs font-bold text-[#6B5D52] hover:bg-[#FAF3EE] transition-colors ${activeStatus === s ? 'active' : ''}"> ${s} <span class="count-badge ml-1 bg-[#F5EDE6] text-[#8B7B6E] px-1 rounded">${counts[s]}</span> </button>`).join('');
    const rDiv = document.getElementById('reasonButtons');
    if (rDiv) {
        const reasons = [...new Set(standardData.map(d => d._reason).filter(r => r))];
        rDiv.innerHTML = reasons.map(r => `<button onclick="window.setActiveReason('${r}')" class="reason-btn px-2 py-1 text-xs border border-[#E8DDD4] rounded-full hover:bg-[#F5EDE6] ${activeReason === r ? 'active' : ''}">${r}</button>`).join('');
    }
};

window.renderTableHeader = () => {
    const thead = document.getElementById('tableHeaderRow');
    if (!thead) return;
    let html = `<tr><th class="px-4 py-3 text-center sticky top-0 left-0 z-50 bg-[#FAF3EE] border-r border-[#E8DDD4] border-b min-w-[50px] w-[50px]"><input type="checkbox" id="selectAllCheckboxTop" onchange="window.toggleSelectAll(this.checked)" class="w-5 h-5 accent-[#D97756]"></th>`;

    COLUMNS.forEach(col => {
        let stickyClass = 'sticky top-0 z-40 bg-[#FAF3EE]';
        let style = `min-width:${col.width}; width:${col.width};`;
        const sortIcon = columnSortField === col.id ? (columnSortOrder === 'asc' ? ' ▲' : ' ▼') : '';
        html += `<th onclick="window.toggleColumnSort('${col.id}')" class="px-4 py-3 text-left text-xs font-bold text-[#8B7B6E] uppercase border-b border-[#E8DDD4] cursor-pointer hover:bg-[#F5EDE6] ${stickyClass}" style="${style}"> ${col.label}${sortIcon}</th>`;
    });
    const role = localStorage.getItem('er_system_role');
    if (role === 'admin' || role === 'system') {
        html += `<th class="px-4 py-3 border-b border-[#E8DDD4] text-center sticky top-0 z-40 bg-[#FAF3EE] min-w-[50px]">관리</th></tr>`;
    } else {
        html += `<th class="px-4 py-3 border-b border-[#E8DDD4] text-center sticky top-0 z-40 bg-[#FAF3EE] min-w-[50px]"></th></tr>`;
    }
    thead.innerHTML = html;
};

window.debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => window.applyLocalFilters(true), 300); };
window.toggleSelectAll = (c) => { selectedIds = c ? new Set(window.currentTableData.map(d => String(d._id))) : new Set(); window.applyLocalFilters(); };
window.toggleRowSelection = (id) => { const s = String(id); if (selectedIds.has(s)) selectedIds.delete(s); else selectedIds.add(s); window.updateSelectionUI(); };

