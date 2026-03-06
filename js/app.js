import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, orderBy, limit, writeBatch, deleteDoc, getDocs, initializeFirestore, memoryLocalCache, deleteField, where } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js';
// --- 9. FINAL INITIALIZATION ---
window.initSystem = async () => {
    try {
        // [FIX: 1번 원인 완전 해결] 
        // 빈 객체({}) 대신 고객님의 실제 파이어베이스 설정값을 직접 하드코딩하여
        // 깃허브나 로컬 어디서든 DB 서버에 곧바로 연결되도록 복구했습니다.
        window.firebaseConfig = {
            apiKey: "AIzaSyBQL7JBP3q8gmqbuEO1Q11lRo5TtNEsNlI",
            authDomain: "er-database-f786b.firebaseapp.com",
            projectId: "er-database-f786b",
            storageBucket: "er-database-f786b.firebasestorage.app",
            messagingSenderId: "94844773434",
            appId: "1:94844773434:web:024580a7b08a5565f7c103",
            measurementId: "G-KR48H62QY3"
        };

        app = initializeApp(window.firebaseConfig);
        analytics = getAnalytics(app);
        auth = getAuth(app);
        db = initializeFirestore(app, { localCache: memoryLocalCache() });

        onAuthStateChanged(auth, async u => {
            const btn = document.getElementById('loginBtn'); if (btn) btn.disabled = false;
            const msg = document.getElementById('auth-status-msg');

            if (u && !u.isAnonymous) {
                if (msg) msg.innerText = "서버 연결됨";

                try {
                    // [FIX] Restore raw collection path
                    const userDocSnap = await getDoc(doc(db, USERS_COLLECTION_NAME, u.email));
                    if (userDocSnap.exists()) {
                        await window.completeLogin(userDocSnap.data().displayName, u.email, userDocSnap.data().role);
                    } else {
                        if (document.getElementById('main-app').classList.contains('hidden')) {
                            document.getElementById('login-view').classList.remove('hidden');
                            document.getElementById('main-app').classList.add('hidden');
                        }
                    }
                } catch (docErr) {
                    console.error("사용자 권한 조회 실패:", docErr);
                    await signOut(auth);
                    if (msg) msg.innerText = "이메일과 비밀번호로 로그인해주세요.";
                    document.getElementById('login-view').classList.remove('hidden');
                    document.getElementById('main-app').classList.add('hidden');
                    window.showToast("인증 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
                }

            } else {
                if (msg) msg.innerText = "이메일과 비밀번호로 로그인해주세요.";
                document.getElementById('login-view').classList.remove('hidden');
                document.getElementById('main-app').classList.add('hidden');
            }
        });

        const tbody = document.getElementById('tableBody');
        if (tbody) {
            tbody.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                    isEditing = true;
                    if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
                }
            });
            tbody.addEventListener('focusout', (e) => {
                isEditing = false;
                if (pendingSync) {
                    syncTimeout = setTimeout(() => {
                        if (!isEditing && pendingSync) {
                            pendingSync = false;
                            window.applyLocalFilters(true); window.updateKPI(); window.renderRefundStats(); window.renderAllButtons();
                        }
                    }, 100);
                }
            });
        }

        window.renderTableHeader();
        window.renderTable([]);
        window.initExcelUpload();

    } catch (e) {
        console.error("초기화 에러:", e);
        window.showToast("서버 연결 실패");
    }
};

initSystem();

﻿        
        
        
        

        // --- 1. CONSTANTS ---
        const LIVE_COLLECTION_NAME = 'er_data';
        const ARCHIVE_COLLECTION_NAME = 'er_status_archive_shared_v1';
        let currentCollectionName = LIVE_COLLECTION_NAME;
        const COLLECTION_NAME = LIVE_COLLECTION_NAME;
        const LOG_COLLECTION_NAME = 'er_status_logs_shared_v1';
        const SETTINGS_COLLECTION_NAME = 'er_settings_shared_v1';
        const USERS_COLLECTION_NAME = 'er_users_v60';

        const COLUMNS = [
            { id: '_date', label: 'E/R팀입고', width: '120px' }, { id: '_customer', label: '고객명', width: '80px' },
            { id: '_user_id', label: '아이디', width: '90px' }, { id: '_phone', label: '전화번호', width: '110px' },
            { id: '_courier', label: '배송사', width: '80px' },
            { id: '_tracking', label: '송장번호', width: '120px' },
            { id: '_order_date', label: '주문일', width: '110px' },
            { id: '_ship_date', label: '출고일', width: '110px' },
            { id: '_delivery_completed_date', label: '배송완료일', width: '100px' },
            { id: '_channel', label: '판매처', width: '100px' }, { id: '_order_id', label: '주문번호', width: '140px' },
            { id: '_product', label: '상품명', width: '240px' }, { id: '_product_price', label: '상품금액', width: '90px', align: 'right' },
            { id: '_discount_info', label: '할인내용', width: '120px' }, { id: '_discount_amount', label: '할인금액', width: '90px', align: 'right' },
            { id: '_payment_amount', label: '결제금액', width: '90px', align: 'right' }, { id: '_shipping_cost_paid', label: '배송비금액', width: '90px', align: 'right' },
            { id: '_refund_amount', label: '환불액', width: '90px', align: 'right' }, { id: '_refund_method', label: '환불수단', width: '100px' },
            { id: '_refund_ledger', label: '환불장', width: '80px' }, { id: '_product_condition', label: '제품상태', width: '100px' },
            { id: '_type', label: '구분', width: '70px' }, { id: '_reason', label: '사유', width: '120px' },
            { id: '_shipping', label: '배송비', width: '80px' }, { id: '_processingNote', label: '처리 특이사항', width: '150px' },
            { id: '_status', label: '처리상태', width: '100px' }, { id: '_pic', label: '처리자', width: '80px' }
        ];
        const FIELD_LABELS = { '_status': '처리상태', '_pic': '처리자', '_product': '상품명', '_reason': '사유', '_shipping': '배송비', '_processingNote': '처리메모', '_refund_amount': '환불액', '_payment_amount': '결제금액', '_product_condition': '제품상태', '_tracking': '송장번호', '_channel': '판매처' };

        // --- 2. STATE ---
        let app, auth, db, analytics;
        let standardData = [], selectedIds = new Set(), unsavedChanges = new Map();
        let currentUserName = localStorage.getItem('er_system_username') || 'Guest';
        let activeStatus = '', activeDate = '', activeReason = '', activeType = '', isFilteringUrgent = false, deleteTargetIds = [], searchTimeout;
        let currentChartPeriod = 'daily', dateRangeMode = 'all', dateRangeFrom = null, dateRangeTo = null;
        let columnFilters = {}, columnSortField = '', columnSortOrder = '', activeCombinedRowId = null, activeColumnFilter = null;
        window.currentTableData = [];
        let globalOptions = { reasons: [], shipping: [], conditions: [], channels: [] };
        let activeSettingsTab = 'reasons', isArchiveMode = false;
        let activeReasonRowId = null;
        let unsubscribeSettings = null, unsubscribeData = null;
        let isEditing = false, pendingSync = false, syncTimeout = null;

        let dataFetchMode = 'recent'; // 'recent' 또는 'all'

﻿        // --- 3. GLOBAL FUNCTIONS (Hoisted) ---

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
                const pendingItems = standardData.filter(d => d._archiving_status === 'pending' || d._delete_status === 'pending');

                if (pendingItems.length === 0) return;

                let batch = writeBatch(db);
                let batchCount = 0;
                let totalCleaned = 0;

                for (const data of pendingItems) {
                    const docId = String(data._id);
                    // [FIX] Restore raw collection path without 'artifacts/appId...'
                    const ref = doc(db, LIVE_COLLECTION_NAME, docId);

                    batch.update(ref, {
                        _archiving_status: deleteField(),
                        _delete_status: deleteField()
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
        window.isUrgent = (r) => (r._status !== '처리완료' && (Date.now() - window.parseDate(r._date)) > 259200000);
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
            return standardData
                .filter(d => d._customer || d._product || d._order_id)
                .map(d => {
                    const pending = unsavedChanges.get(String(d._id));
                    return pending ? { ...d, ...pending } : d;
                });
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
            html += `<th class="px-4 py-3 border-b border-[#E8DDD4] text-center sticky top-0 z-40 bg-[#FAF3EE] min-w-[50px]">관리</th></tr>`;
            thead.innerHTML = html;
        };

        window.debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => window.applyLocalFilters(true), 300); };
        window.toggleSelectAll = (c) => { selectedIds = c ? new Set(window.currentTableData.map(d => String(d._id))) : new Set(); window.applyLocalFilters(); };
        window.toggleRowSelection = (id) => { const s = String(id); if (selectedIds.has(s)) selectedIds.delete(s); else selectedIds.add(s); window.updateSelectionUI(); };

﻿        window.renderTable = (data) => {
            const tbody = document.getElementById('tableBody');
            if (!tbody) return;

            let focusedRowId = null;
            let focusedFieldClass = null;
            let focusedSelection = null;
            if (document.activeElement && tbody.contains(document.activeElement)) {
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

            let rows = '';
            const now = Date.now();
            data.forEach(d => {
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
                rows += `<td class="px-2 py-2 text-center text-[#D4C4B8] hover:text-[#B85C4A] cursor-pointer font-bold" onclick="window.promptDeleteModal('${d._id}')">×</td></tr>`;
            });
            tbody.innerHTML = rows;

            if (focusedRowId && focusedFieldClass) {
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

﻿window.saveAllChanges = async () => {
    if (unsavedChanges.size === 0 || !db) return;
    const btn = document.getElementById('saveChangesBtn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = "저장 중...";
    btn.disabled = true;
    window.showLoading(true);

    try {
        let batch = writeBatch(db);
        let c = 0;
        for (const [id, changes] of unsavedChanges) {
            const sanitizedChanges = {};
            Object.keys(changes).forEach(key => {
                if (changes[key] !== undefined) sanitizedChanges[key] = changes[key];
            });

            // [FIX] Restore raw collection path
            const docRef = doc(db, COLLECTION_NAME, id);
            batch.set(docRef, sanitizedChanges, { merge: true });

            const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const org = standardData.find(d => String(d._id) === String(id));

            const details = Object.entries(sanitizedChanges).map(([f, v]) => ({
                field: f,
                old: (org && org[f] !== undefined) ? org[f] : '',
                new: (v !== undefined) ? v : ''
            }));

            const targetName = (org && org._customer !== undefined) ? org._customer : '알 수 없음';

            // [FIX] Restore raw collection path
            batch.set(doc(db, LOG_COLLECTION_NAME, logId), {
                _id: logId,
                timestamp: new Date().toISOString(),
                user: currentUserName,
                action: '수정',
                targetId: id,
                targetName: targetName,
                details: details
            });

            c++;
            if (c >= 200) { await batch.commit(); batch = writeBatch(db); c = 0; }
        }
        if (c > 0) await batch.commit();

        unsavedChanges.clear();
        window.updateSaveButton();

        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>변경사항 저장 <span id="unsavedCount" class="bg-white/20 px-1.5 rounded text-xs ml-1">0</span>`;

        window.showToast("저장 완료");
    } catch (e) {
        console.error(e);
        window.showToast("저장 실패: " + e.message);
        btn.innerHTML = "재시도";
        btn.disabled = false;
    } finally {
        window.showLoading(false);
    }
};

window.loginSystem = async () => {
    const email = document.getElementById('loginId').value.trim().toLowerCase();
    const pw = document.getElementById('loginPw').value;

    if (!email || !pw) { window.showToast('이메일과 비밀번호를 입력하세요.'); return; }

    window.showLoading(true);
    try {
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, email, pw);
        } catch (authErr) {
            throw new Error('인증 실패');
        }

        const user = userCredential.user;

        // [FIX] Restore raw collection path
        const userDocRef = doc(db, USERS_COLLECTION_NAME, email);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
            await window.completeLogin(snap.data().displayName, email, snap.data().role);
        } else {
            // [FIX] Restore raw collection path
            const allUsersSnap = await getDocs(collection(db, USERS_COLLECTION_NAME));
            if (allUsersSnap.empty) {
                await setDoc(userDocRef, {
                    displayName: "마스터 관리자",
                    username: email,
                    role: 'system'
                });

                window.showToast("최초 가입을 환영합니다! 마스터 권한이 부여되었습니다.");
                await window.completeLogin("마스터 관리자", email, 'system');
            } else {
                await signOut(auth);
                window.showToast('권한이 부여되지 않은 계정입니다. 사내 관리자에게 권한 등록을 요청하세요.');
            }
        }
    } catch (e) {
        console.error(e);
        window.showToast('로그인 실패: 이메일이나 비밀번호가 올바르지 않습니다.');
    } finally {
        window.showLoading(false);
    }
};

window.completeLogin = async (name, id, role) => {
    currentUserName = name; localStorage.setItem('er_system_username', name);
    localStorage.setItem('er_system_userid', id); localStorage.setItem('er_system_role', role);
    document.getElementById('userNameDisplay').innerText = name;
    document.getElementById('login-view').classList.add('hidden'); document.getElementById('main-app').classList.remove('hidden');

    const adminBtn = document.getElementById('adminManagementBtn');
    const adminSettingsBtn = document.getElementById('btnAdminSettings');
    if (role === 'admin' || role === 'system') {
        if (adminBtn) adminBtn.classList.remove('hidden');
        if (adminSettingsBtn) adminSettingsBtn.classList.remove('hidden');
    } else {
        if (adminBtn) adminBtn.classList.add('hidden');
        if (adminSettingsBtn) adminSettingsBtn.classList.add('hidden');
    }
    window.showToast(`${name}님, 환영합니다.`);
    if (auth && auth.currentUser) {
        window.syncSettings();
        window.syncData();
    }
};

window.syncSettings = () => {
    if (!db) return;
    if (unsubscribeSettings) return;

    // [FIX] Restore raw collection path
    unsubscribeSettings = onSnapshot(doc(db, SETTINGS_COLLECTION_NAME, 'global_options'), (docSnap) => {
        if (docSnap.exists()) {
            globalOptions = { ...globalOptions, ...docSnap.data() };
            window.updateDatalists();
            if (standardData.length > 0) window.applyLocalFilters(true);
        }
        // [FIX] Restore raw collection path
        else setDoc(doc(db, SETTINGS_COLLECTION_NAME, 'global_options'), globalOptions).catch(e => { });
    }, (error) => { console.warn("Settings fetch error:", error); });
};

window.toggleDataMode = () => {
    dataFetchMode = dataFetchMode === 'recent' ? 'all' : 'recent';
    const btn = document.getElementById('dataModeBtn');
    if (dataFetchMode === 'recent') {
        btn.innerText = '최근 3개월 조회 중';
        btn.className = 'text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full transition-colors ml-1 shadow-sm border border-indigo-100';
    } else {
        btn.innerText = '전체 데이터 조회 중 (느림)';
        btn.className = 'text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-colors ml-1 shadow-sm border border-rose-100';
    }
    window.showLoading(true);
    window.syncData();
};

﻿window.syncData = () => {
    if (!db) return;

    if (unsubscribeData) {
        unsubscribeData();
        unsubscribeData = null;
    }

    let q;
    // [FIX] Restore raw collection path
    const baseCol = collection(db, currentCollectionName);

    if (dataFetchMode === 'recent') {
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() - 3);
        const limitStr = limitDate.toISOString().split('T')[0];
        q = query(baseCol, where('_date', '>=', limitStr));
    } else {
        q = query(baseCol);
    }

    unsubscribeData = onSnapshot(q, (snapshot) => {
        standardData = snapshot.docs.map(d => d.data()).sort((a, b) => a._id - b._id);

        if (isEditing) {
            pendingSync = true;
        } else {
            window.applyLocalFilters(true); window.updateKPI(); window.renderRefundStats(); window.renderAllButtons();
        }

        const cloud = document.getElementById('cloudStatus');
        if (cloud) { cloud.innerText = "실시간 동기화됨"; cloud.className = "text-xs px-2 py-0.5 rounded-full bg-[#E8EDE2] text-[#5E7A4A] font-medium ml-2 tracking-normal"; }
        window.showLoading(false);
    }, err => { window.showLoading(false); });
};

window.openLogModal = async () => {
    const container = document.getElementById('logListContainer');
    document.getElementById('logModal').classList.remove('hidden');

    container.innerHTML = '';
    const loadingText = document.createElement('div');
    loadingText.className = 'p-4 text-center text-sm text-[#8B7B6E]';
    loadingText.textContent = '로딩 중...';
    container.appendChild(loadingText);

    try {
        // [FIX] Restore raw collection path
        const snap = await getDocs(collection(db, LOG_COLLECTION_NAME));
        const logs = snap.docs.map(doc => doc.data()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

        container.innerHTML = '';

        if (logs.length === 0) {
            const emptyText = document.createElement('div');
            emptyText.className = 'p-4 text-center text-sm text-[#8B7B6E]';
            emptyText.textContent = '로그가 없습니다.';
            container.appendChild(emptyText);
            return;
        }

        logs.forEach(log => {
            const logCard = document.createElement('div');
            logCard.className = 'bg-white p-3 rounded border border-[#E8DDD4] shadow-sm';

            const headerFlex = document.createElement('div');
            headerFlex.className = 'flex justify-between text-xs font-bold text-[#5C4A3E] mb-1';

            const actionSpan = document.createElement('span');
            actionSpan.textContent = `${log.action} - ${log.targetName}`;

            const timeSpan = document.createElement('span');
            timeSpan.textContent = new Date(log.timestamp).toLocaleString();

            headerFlex.appendChild(actionSpan);
            headerFlex.appendChild(timeSpan);

            const userDiv = document.createElement('div');
            userDiv.className = 'text-[10px] text-[#8B7B6E] mb-1';
            userDiv.textContent = `작업자: ${log.user}`;

            logCard.appendChild(headerFlex);
            logCard.appendChild(userDiv);

            (log.details || []).forEach(d => {
                const detailDiv = document.createElement('div');
                detailDiv.className = 'text-[10px] mt-1';

                const fieldSpan = document.createElement('span');
                fieldSpan.className = 'font-bold';
                fieldSpan.textContent = `${d.field}: `;

                const oldText = document.createTextNode(`${d.old} → `);

                const newSpan = document.createElement('span');
                newSpan.className = 'text-[#D97756]';
                newSpan.textContent = d.new;

                detailDiv.appendChild(fieldSpan);
                detailDiv.appendChild(oldText);
                detailDiv.appendChild(newSpan);

                logCard.appendChild(detailDiv);
            });

            container.appendChild(logCard);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '';
        const errorText = document.createElement('div');
        errorText.className = 'p-4 text-center text-sm text-red-500';
        errorText.textContent = '로그를 불러오는 데 실패했습니다.';
        container.appendChild(errorText);
    }
};

window.closeLogModal = () => document.getElementById('logModal').classList.add('hidden');

window.openSettingsModal = () => { document.getElementById('settingsModal').classList.remove('hidden'); window.switchSettingsTab(activeSettingsTab); };
window.closeSettingsModal = () => document.getElementById('settingsModal').classList.add('hidden');
window.switchSettingsTab = (tab) => {
    activeSettingsTab = tab;
    ['reasons', 'shipping', 'conditions', 'channels', 'archive'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (t === tab) { btn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold'); btn.classList.remove('text-slate-500'); }
        else { btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold'); btn.classList.add('text-slate-500'); }
    });
    if (tab === 'archive') {
        document.getElementById('section-common-codes').classList.add('hidden');
        document.getElementById('section-archive').classList.remove('hidden');
        const btnToggle = document.getElementById('btnToggleArchive');
        if (isArchiveMode) {
            btnToggle.innerHTML = `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>라이브 데이터로 돌아가기</span>`;
            btnToggle.classList.replace('hover:border-amber-300', 'hover:border-green-300'); btnToggle.classList.replace('hover:bg-amber-50', 'hover:bg-green-50');
        } else {
            btnToggle.innerHTML = `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>아카이브 데이터 조회하기</span>`;
            btnToggle.classList.replace('hover:border-green-300', 'hover:border-amber-300'); btnToggle.classList.replace('hover:bg-green-50', 'hover:bg-amber-50');
        }
    } else {
        document.getElementById('section-common-codes').classList.remove('hidden');
        document.getElementById('section-archive').classList.add('hidden');
        window.renderSettingsChips();
    }
};
window.renderSettingsChips = () => {
    const container = document.getElementById('settingsChipsContainer');
    const list = globalOptions[activeSettingsTab] || [];
    const titles = { reasons: '사유 목록', shipping: '배송비 처리 목록', conditions: '제품 상태 목록', channels: '판매처 자동완성 목록' };
    document.getElementById('settingsListTitle').textContent = titles[activeSettingsTab];
    container.innerHTML = list.map(item => `<div class="option-chip"><span>${window.escapeHtml(item)}</span><button onclick="window.removeOption('${window.escapeHtml(item)}')">&times;</button></div>`).join('');
};
window.addCurrentOption = async () => {
    const input = document.getElementById('newOptionInput'); const val = input.value.trim();
    if (!val) return;
    if (globalOptions[activeSettingsTab].includes(val)) { window.showToast('이미 존재하는 항목입니다.'); return; }
    globalOptions[activeSettingsTab].push(val);
    input.value = ''; window.renderSettingsChips(); await window.saveGlobalOptions(); window.renderTable(standardData); window.updateDatalists();
};
window.removeOption = (val) => {
    window.showConfirm(`'${val}' 항목을 제거하시겠습니까?`, async () => {
        globalOptions[activeSettingsTab] = globalOptions[activeSettingsTab].filter(i => i !== val);
        window.renderSettingsChips(); await window.saveGlobalOptions(); window.renderTable(standardData); window.updateDatalists();
    });
};
window.saveGlobalOptions = async () => {
    if (!db) return;
    try {
        // [FIX] Restore raw collection path
        await setDoc(doc(db, SETTINGS_COLLECTION_NAME, 'global_options'), globalOptions);
        window.showToast("설정이 저장되었습니다.");
    } catch (e) { window.showToast("설정 저장 실패"); }
};
window.updateDatalists = () => { const dl = document.getElementById('channel-options'); if (dl) dl.innerHTML = (globalOptions.channels || []).map(c => `<option value="${window.escapeHtml(c)}"></option>`).join(''); };
window.toggleArchiveMode = () => {
    isArchiveMode = !isArchiveMode;
    if (isArchiveMode) {
        currentCollectionName = ARCHIVE_COLLECTION_NAME;
        document.getElementById('archiveModeBadge').classList.remove('hidden');
        document.getElementById('tableTitle').innerText = "아카이브 데이터 리스트";
        document.getElementById('btnAddRow').classList.add('hidden');
    } else {
        currentCollectionName = LIVE_COLLECTION_NAME;
        document.getElementById('archiveModeBadge').classList.add('hidden');
        document.getElementById('tableTitle').innerText = "상세 내역 리스트";
        document.getElementById('btnAddRow').classList.remove('hidden');
    }
    window.closeSettingsModal();
    window.syncData();
};
window.archiveProcessedData = async () => {
    if (isArchiveMode) { window.showToast("아카이브 모드에서는 실행할 수 없습니다."); return; }
    if (dataFetchMode === 'recent') {
        window.showToast("아카이빙은 '전체 데이터 조회' 모드에서만 가능합니다.");
        return;
    }

    const thresholdMonths = parseInt(document.getElementById('archiveThreshold').value);

    window.showConfirm(`${thresholdMonths}개월 이상 지난 '처리완료' 데이터를 아카이브로 이동하시겠습니까?`, async () => {
        window.showLoading(true);
        try {
            const thresholdDate = new Date();
            thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);
            const thresholdTime = thresholdDate.getTime();
            const toArchive = standardData.filter(d => ((d._status || '').trim() === '처리완료') && window.parseDate(d._date) && window.parseDate(d._date) <= thresholdTime);
            if (toArchive.length === 0) { window.showLoading(false); window.showToast("조건에 맞는 대상 데이터가 없습니다."); return; }

            const batchSize = 200;
            const chunks = [];
            for (let i = 0; i < toArchive.length; i += batchSize) chunks.push(toArchive.slice(i, i + batchSize));

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(docData => {
                    // [FIX] Restore raw collection path
                    batch.set(doc(db, LIVE_COLLECTION_NAME, docData._id.toString()), { _archiving_status: 'pending' }, { merge: true });
                });
                await batch.commit();
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(docData => {
                    const archiveData = { ...docData };
                    delete archiveData._archiving_status;
                    // [FIX] Restore raw collection path
                    batch.set(doc(db, ARCHIVE_COLLECTION_NAME, docData._id.toString()), archiveData);
                });
                await batch.commit();
            }

            let totalMoved = 0;
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(docData => {
                    // [FIX] Restore raw collection path
                    batch.delete(doc(db, LIVE_COLLECTION_NAME, docData._id.toString()));
                });
                await batch.commit();
                totalMoved += chunk.length;
            }

            const logId = `log_${Date.now()}`;
            // [FIX] Restore raw collection path
            await setDoc(doc(db, LOG_COLLECTION_NAME, logId), { _id: logId, timestamp: new Date().toISOString(), user: currentUserName, action: '아카이빙', targetId: 'BULK', targetName: `${totalMoved}건 아카이브 이동`, details: [] });
            window.showLoading(false);
            window.showToast(`${totalMoved}건 이동 완료.`);
            window.closeSettingsModal();
        } catch (e) {
            window.showToast("아카이빙 실패: " + e.message + " (일부 데이터가 보류 상태일 수 있습니다.)");
            window.showLoading(false);
        }
    });
};

window.openUserManagementModal = () => { document.getElementById('userManagementModal').classList.remove('hidden'); window.loadUserList(); };
window.closeUserManagementModal = () => document.getElementById('userManagementModal').classList.add('hidden');

window.addNewUser = async () => {
    const name = document.getElementById('newUserName').value.trim();
    const id = document.getElementById('newUserId').value.trim().toLowerCase();
    const pw = document.getElementById('newUserPw').value;
    const role = document.getElementById('newUserRole').value;
    if (!name || !id || !pw) return window.showToast("이름, 이메일, 비밀번호를 모두 입력해주세요.");
    if (pw.length < 6) return window.showToast("비밀번호는 최소 6자 이상이어야 합니다.");

    window.showLoading(true);
    let secondaryApp;
    try {
        // 1. 보조 앱(Secondary App)을 생성하여 메인 관리자 세션 로그아웃 방지
        secondaryApp = initializeApp(window.firebaseConfig, "SecondaryApp_" + Date.now());
        const secondaryAuth = getAuth(secondaryApp);

        // 2. 실제 인증 계정 발급
        await createUserWithEmailAndPassword(secondaryAuth, id, pw);

        // 3. 기존 로직: Firestore 역할 맵핑 테이블에 등록
        // [FIX] Restore raw collection path
        await setDoc(doc(db, USERS_COLLECTION_NAME, id), { displayName: name, username: id, role: role });

        window.showToast(`실제 계정 발급 및 권한 등록됨 (${role})`);
        ['newUserName', 'newUserId', 'newUserPw'].forEach(i => document.getElementById(i).value = '');
        window.loadUserList();
    } catch (e) {
        console.error("생성 실패:", e);
        if (e.code === 'auth/email-already-in-use') {
            window.showToast("이미 사용 중인 이메일 계정입니다.");
        } else {
            window.showToast("생성 실패: " + e.message);
        }
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp).catch(() => console.warn('보조 앱 삭제 처리됨'));
        }
        window.showLoading(false);
    }
};

window.loadUserList = async () => {
    if (!db) return;
    const container = document.getElementById('userListContainer');
    try {
        // [FIX] Restore raw collection path
        const snap = await getDocs(collection(db, USERS_COLLECTION_NAME));
        container.innerHTML = snap.docs.map(d => {
            const u = d.data();
            const isAdm = u.role === 'admin' || u.role === 'system';
            return `<div class="flex justify-between items-center p-3 hover:bg-[#FAF3EE] transition-colors">
                        <div class="flex flex-col">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-bold text-[#3D2E24]">${window.escapeHtml(u.displayName)}</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${isAdm ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'} font-bold uppercase">${u.role}</span>
                            </div>
                            <span class="text-[10px] text-[#8B7B6E]">Email: ${d.id}</span>
                        </div>
                        <button onclick="window.deleteUserAcc('${d.id}')" class="text-xs text-[#B85C4A] font-bold hover:underline">삭제</button>
                    </div>`;
        }).join('') || '<div class="p-4 text-center text-[#B8A99C] text-xs">사용자가 없습니다.</div>';
    } catch (e) { container.innerHTML = '로드 실패'; }
};

window.deleteUserAcc = async (id) => {
    window.showConfirm(`삭제하시겠습니까?`, async () => {
        try {
            // [FIX] Restore raw collection path
            await deleteDoc(doc(db, USERS_COLLECTION_NAME, id));
            window.loadUserList();
            window.showToast("삭제되었습니다.");
        } catch (e) {
            console.error(e);
            window.showToast("삭제 실패: " + e.message);
        }
    });
};

window.openBulkUpdateModal = () => { if (selectedIds.size === 0) return; document.getElementById('bulkUpdateModal').classList.remove('hidden'); window.updateBulkValueInput(document.getElementById('bulkFieldSelect').value); };
window.closeBulkUpdateModal = () => document.getElementById('bulkUpdateModal').classList.add('hidden');

window.updateBulkValueInput = (f) => {
    const c = document.getElementById('bulkValueContainer');
    if (f === '_status') {
        c.innerHTML = `<select id="bulkValueInput" class="w-full border border-[#D4C4B8] rounded-lg p-2.5 outline-none"><option value="미처리">미처리</option><option value="처리완료">처리완료</option><option value="보류">보류</option></select>`;
    } else if (f === '_product_condition') {
        c.innerHTML = `<select id="bulkValueInput" class="w-full border border-[#D4C4B8] rounded-lg p-2.5 outline-none">` + ['정상', '불량'].map(x => `<option value="${x}">${x}</option>`).join('') + `</select>`;
    } else if (f === '_reason') {
        const reasonOptions = ['변심', '불량', '색상', '사이즈', '색상/사이즈', '수선', '오배송'];
        c.innerHTML = `<select id="bulkValueInput" class="w-full border border-[#D4C4B8] rounded-lg p-2.5 outline-none">` + reasonOptions.map(x => `<option value="${x}">${x}</option>`).join('') + `</select>`;
    } else if (f === '_shipping') {
        const shippingOptions = ['결제', '입금', '차감', '무상', '무료배송권', '동봉'];
        c.innerHTML = `<select id="bulkValueInput" class="w-full border border-[#D4C4B8] rounded-lg p-2.5 outline-none">` + shippingOptions.map(x => `<option value="${x}">${x}</option>`).join('') + `</select>`;
    } else if (f === '_pic') {
        c.innerHTML = `<input type="text" id="bulkValueInput" class="w-full border border-[#D4C4B8] rounded-lg p-2.5 outline-none">`;
        document.getElementById('bulkValueInput').value = currentUserName;
    } else {
        c.innerHTML = `<input type="text" id="bulkValueInput" class="w-full border border-[#D4C4B8] rounded-lg p-2.5 outline-none" placeholder="내용 입력">`;
    }
};

window.submitBulkUpdate = () => { const f = document.getElementById('bulkFieldSelect').value; const v = document.getElementById('bulkValueInput').value.trim(); selectedIds.forEach(id => window.updateField(id, f, v)); window.closeBulkUpdateModal(); window.showToast(`${selectedIds.size}건 수정됨`); };
window.applyBulkStatus = (s) => { if (selectedIds.size === 0) return; selectedIds.forEach(id => window.updateField(id, '_status', s)); window.showToast(`${selectedIds.size}건 상태 변경됨`); };
window.applyBulkPicToSelf = () => { if (selectedIds.size === 0) return; selectedIds.forEach(id => window.updateField(id, '_pic', currentUserName)); window.showToast(`${selectedIds.size}건 담당 지정됨`); };

window.applyLocalFilters = (clearSelection = false) => {
    if (clearSelection) {
        selectedIds.clear();
    }

    const terms = (document.getElementById('tableSearch')?.value || '').toLowerCase().split(/\s+/).filter(t => t.length > 0);

    const fromTime = dateRangeFrom ? dateRangeFrom.getTime() : null;
    const toTime = dateRangeTo ? new Date(dateRangeTo).setHours(23, 59, 59, 999) : null;

    let res = [...standardData];

    res = res.filter(r => {
        if (!r._customer && !r._product && !r._order_id) return false;

        const vals = Object.values(r).join(' ').toLowerCase();
        if (terms && !terms.every(term => vals.includes(term))) return false;
        if (activeStatus && r._status !== activeStatus) return false;
        if (activeReason && r._reason !== activeReason) return false;
        if (activeType && !(r._type || '').includes(activeType)) return false;
        if (isFilteringUrgent && !window.isUrgent(r)) return false;

        if (fromTime || toTime) {
            const rowTime = window.parseDate(r._date);
            if (fromTime && rowTime < fromTime) return false;
            if (toTime && rowTime > toTime) return false;
        }

        for (const [f, set] of Object.entries(columnFilters)) {
            const val = (r[f] || '').toString().trim() || '(공백)';
            if (!set.has(val)) return false;
        }
        return true;
    });

    res.sort((a, b) => {
        const urgentA = window.isUrgent(a);
        const urgentB = window.isUrgent(b);
        if (urgentA && !urgentB) return -1;
        if (!urgentA && urgentB) return 1;

        if (columnSortField) {
            const valA = (a[columnSortField] || '').toString();
            const valB = (b[columnSortField] || '').toString();
            return columnSortOrder === 'asc' ? valA.localeCompare(valB, 'ko') : valB.localeCompare(valA, 'ko');
        } else {
            return window.parseDate(b._date) - window.parseDate(a._date);
        }
    });
    window.renderTable(res);
    window.currentTableData = res;
    window.updateSelectionUI();
};

window.toggleDashboard = () => { const content = document.getElementById('dashboardContent'); if (content) content.classList.toggle('hidden'); const arrow = document.getElementById('dashboardArrow'); if (arrow) arrow.style.transform = content.classList.contains('hidden') ? '' : 'rotate(180deg)'; if (content && !content.classList.contains('hidden')) window.renderRefundStats(); };
window.addNewRow = async () => {
    const newId = crypto.randomUUID();
    // [FIX] Restore raw collection path
    await setDoc(doc(db, COLLECTION_NAME, newId), {
        _id: newId,
        _date: new Date().toISOString().split('T')[0],
        _status: '미처리',
        _customer: '신규고객',
        _product: '상품명을 입력해주세요',
        _order_id: '주문번호 입력'
    });
};
window.promptDeleteModal = (id) => { deleteTargetIds = [id]; document.getElementById('deleteModal').classList.remove('hidden'); };
window.closeDeleteModal = () => document.getElementById('deleteModal').classList.add('hidden');
window.promptDeleteSelected = () => { if (selectedIds.size > 0) { deleteTargetIds = Array.from(selectedIds); document.getElementById('deleteModal').classList.remove('hidden'); } };

document.getElementById('confirmDeleteBtn').onclick = async () => {
    window.showLoading(true);
    try {
        const batchSize = 200;
        for (let i = 0; i < deleteTargetIds.length; i += batchSize) {
            const chunk = deleteTargetIds.slice(i, i + batchSize);
            const batch = writeBatch(db);
            // [FIX] Restore raw collection path
            chunk.forEach(id => batch.set(doc(db, COLLECTION_NAME, String(id)), { _delete_status: 'pending' }, { merge: true }));
            await batch.commit();
        }

        for (let i = 0; i < deleteTargetIds.length; i += batchSize) {
            const chunk = deleteTargetIds.slice(i, i + batchSize);
            const batch = writeBatch(db);
            // [FIX] Restore raw collection path
            chunk.forEach(id => batch.delete(doc(db, COLLECTION_NAME, String(id))));
            await batch.commit();
        }

        window.closeDeleteModal();
        selectedIds.clear();
        window.updateSelectionUI();
        window.showToast("삭제 완료");
    } catch (e) {
        console.error(e);
        window.showToast("삭제 실패: " + e.message);
    } finally {
        window.showLoading(false);
    }
};

window.setDateRange = (m) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    document.querySelectorAll('[id^="dr-"]').forEach(b => b.className = "px-3 py-1 text-xs font-bold rounded border transition-colors bg-white text-[#6B5D52] border-[#E8DDD4] hover:border-[#E8B4A0] hover:text-[#D97756]");
    const activeBtn = document.getElementById(`dr-${m}`); if (activeBtn) activeBtn.className = "px-3 py-1 text-xs font-bold rounded border bg-[#D97756] text-white border-[#D97756]";
    document.getElementById('customDatePanel').classList.toggle('hidden', m !== 'custom');
    if (m === 'all') { dateRangeFrom = null; dateRangeTo = null; }
    else if (m === 'today') { dateRangeFrom = today; dateRangeTo = today; }
    else if (m === '7d') { dateRangeFrom = new Date(today); dateRangeFrom.setDate(today.getDate() - 6); dateRangeTo = today; }
    else if (m === '30d') { dateRangeFrom = new Date(today); dateRangeFrom.setDate(today.getDate() - 29); dateRangeTo = today; }
    window.applyLocalFilters(true);
};
window.applyDateRange = () => { dateRangeFrom = document.getElementById('dateFrom').value ? new Date(document.getElementById('dateFrom').value) : null; dateRangeTo = document.getElementById('dateTo').value ? new Date(document.getElementById('dateTo').value) : null; window.applyLocalFilters(true); };
window.toggleColumnSort = (f) => { if (columnSortField === f) columnSortOrder = (columnSortOrder === 'desc' ? 'asc' : 'desc'); else { columnSortField = f; columnSortOrder = 'desc'; } window.applyLocalFilters(true); };
window.copyProductName = (el) => { navigator.clipboard.writeText(el.value).then(() => { window.showToast("복사됨"); el.style.backgroundColor = '#FFF5EB'; setTimeout(() => el.style.backgroundColor = '', 500); }); };
window.setActiveStatus = (s) => { activeStatus = activeStatus === s ? '' : s; window.applyLocalFilters(true); window.renderAllButtons(); window.updateKPI(); };
window.resetStatusFilter = () => { activeStatus = ''; window.applyLocalFilters(true); window.renderAllButtons(); window.updateKPI(); };
window.filterByCompleted = () => { window.resetFilters(); activeStatus = '처리완료'; window.applyLocalFilters(true); window.setFilterBadge("처리완료 건 조회"); };
window.filterByUnprocessed = () => { window.resetFilters(); activeStatus = '미처리'; window.applyLocalFilters(true); window.setFilterBadge("미처리 건 조회"); };
window.filterByMisdelivery = () => { window.resetFilters(); document.getElementById('tableSearch').value = "오배송"; window.applyLocalFilters(true); window.setFilterBadge("오배송 건 조회"); };
window.setActiveReason = (r) => { activeReason = activeReason === r ? '' : r; window.applyLocalFilters(true); window.renderAllButtons(); };
window.resetFilters = () => { activeStatus = ''; activeReason = ''; activeType = ''; isFilteringUrgent = false; dateRangeMode = 'all'; dateRangeFrom = null; dateRangeTo = null; columnFilters = {}; document.getElementById('tableSearch').value = ''; window.setDateRange('all'); window.renderAllButtons(); window.applyLocalFilters(true); window.updateKPI(); window.setFilterBadge(""); };
window.applyColumnFilter = () => { const selected = new Set(Array.from(document.querySelectorAll('.col-filter-check:checked')).map(i => i.value)); columnFilters[activeColumnFilter.field] = selected; window.applyLocalFilters(true); document.getElementById('columnFilterModal').classList.add('hidden'); };
window.clearColumnFilter = () => { delete columnFilters[activeColumnFilter.field]; window.applyLocalFilters(true); document.getElementById('columnFilterModal').classList.add('hidden'); };
window.filterByExchange = () => { window.resetFilters(); activeType = '교환'; window.applyLocalFilters(true); window.setFilterBadge("교환 건 조회"); };
window.filterByReturn = () => { window.resetFilters(); activeType = '반품'; window.applyLocalFilters(true); window.setFilterBadge("반품 건 조회"); };
window.filterByDefect = () => { window.resetFilters(); columnFilters['_product_condition'] = new Set(['불량']); window.applyLocalFilters(true); window.setFilterBadge("불량 상태 건 조회"); };
window.filterByUrgent = () => { window.resetFilters(); isFilteringUrgent = true; window.applyLocalFilters(true); window.setFilterBadge("장기미처리 건 조회"); };
window.filterByTotal = () => { window.resetFilters(); };

window.openCombinedModal = (id) => { activeCombinedRowId = String(id); const row = standardData.find(d => String(d._id) === activeCombinedRowId); const container = document.getElementById('combinedItemsList'); container.innerHTML = ''; (row._product || '').split(' / ').forEach(p => window.addCombinedItemInput(p)); window.updateCombinedTotal(); document.getElementById('combinedModal').classList.remove('hidden'); };
window.closeCombinedModal = () => document.getElementById('combinedModal').classList.add('hidden');
window.addCombinedItemInput = (v = '') => { const div = document.createElement('div'); div.className = "flex gap-2 mb-2 items-center"; div.innerHTML = `<input type="text" value="${window.escapeHtml(v)}" class="flex-grow border border-[#D4C4B8] p-2 rounded text-sm outline-none comb-item-input" oninput="window.updateCombinedTotal()"><button onclick="this.parentElement.remove(); window.updateCombinedTotal();" class="text-[#B85C4A] px-2 font-bold">×</button>`; document.getElementById('combinedItemsList').appendChild(div); };
window.updateCombinedTotal = () => { const count = document.querySelectorAll('.comb-item-input').length; document.getElementById('combinedTotalPreview').innerText = `${count}건 합산 중`; };
window.saveCombinedItems = () => { const values = Array.from(document.querySelectorAll('.comb-item-input')).map(i => i.value.trim()).filter(v => v); window.updateField(activeCombinedRowId, '_product', values.join(' / ')); document.getElementById('combinedModal').classList.add('hidden'); };
window.openColumnFilter = (e, f) => { e.stopPropagation(); const modal = document.getElementById('columnFilterModal'); const rect = e.currentTarget.getBoundingClientRect(); modal.style.top = `${rect.bottom + window.scrollY + 5}px`; modal.style.left = `${rect.left + window.scrollX}px`; const uniqueValues = [...new Set(standardData.map(d => (d[f] || '').toString().trim() || '(공백)'))].sort(); const currentSelection = columnFilters[f] || new Set(); document.getElementById('columnFilterList').innerHTML = uniqueValues.map(v => `<div class="flex items-center gap-2"><input type="checkbox" class="col-filter-check" value="${window.escapeHtml(v)}" ${currentSelection.has(v) ? 'checked' : ''}><span>${window.escapeHtml(v)}</span></div>`).join(''); activeColumnFilter = { field: f }; modal.classList.remove('hidden'); const closer = (evt) => { if (!modal.contains(evt.target)) { modal.classList.add('hidden'); document.removeEventListener('click', closer); } }; setTimeout(() => document.addEventListener('click', closer), 10); };

window.initExcelUpload = () => {
    const input = document.getElementById('listCsvInput');
    if (!input) return;
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!auth.currentUser) {
            window.showToast("로그인이 필요합니다.");
            e.target.value = '';
            return;
        }

        if (!db) {
            window.showToast("데이터베이스 연결 오류");
            e.target.value = '';
            return;
        }

        window.showLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            complete: async (results) => {
                try {
                    if (results.data.length === 0) {
                        window.showLoading(false);
                        window.showToast("데이터가 없습니다.");
                        return;
                    }

                    const batch = writeBatch(db);
                    const base = Date.now();
                    const mapConfig = {};

                    COLUMNS.forEach(c => mapConfig[c.label.replace(/\s+/g, '')] = c.id);

                    mapConfig['입고날짜'] = '_date';
                    mapConfig['입고일'] = '_date';
                    mapConfig['상태'] = '_status';
                    mapConfig['담당자'] = '_pic';
                    mapConfig['상품상태'] = '_product_condition';

                    let batchCount = 0;
                    let currentBatch = batch;
                    let count = 0;

                    for (let i = 0; i < results.data.length; i++) {
                        const row = results.data[i];

                        const cleanRow = {};
                        Object.keys(row).forEach(k => {
                            if (k) cleanRow[k.replace(/\s+/g, '')] = row[k];
                        });

                        if (!cleanRow['고객명'] && !cleanRow['주문번호'] && !cleanRow['상품명']) continue;

                        const uId = crypto.randomUUID();
                        const docData = { _id: uId, _status: '미처리', _date: new Date().toISOString().split('T')[0] };

                        Object.keys(mapConfig).forEach(lbl => {
                            if (cleanRow[lbl] !== undefined && cleanRow[lbl] !== '') {
                                docData[mapConfig[lbl]] = String(cleanRow[lbl]).trim();
                            }
                        });

                        // [FIX] Restore raw collection path
                        currentBatch.set(doc(db, COLLECTION_NAME, uId), docData);
                        count++;
                        batchCount++;

                        if (batchCount >= 400) {
                            await currentBatch.commit();
                            currentBatch = writeBatch(db);
                            batchCount = 0;
                        }
                    }

                    if (batchCount > 0) await currentBatch.commit();

                    window.showToast(`${count}건 등록 완료`);
                } catch (e) {
                    console.error(e);
                    window.showToast("업로드 에러: " + e.message);
                } finally {
                    window.showLoading(false);
                    e.target.value = '';
                }
            },
            error: (e) => {
                window.showToast("CSV 파싱 실패");
                window.showLoading(false);
                e.target.value = '';
            }
        });
    });
};

window.downloadBackup = () => { if (standardData.length === 0) return; const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(standardData); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, `ER_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`); };

document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await signOut(auth);
            localStorage.clear();
            window.location.reload();
        });
    }
    // === [BUG FIX] ===
    // HTML과 JS를 분리하면서 누락되었던 전역 초기화 함수들을 호출합니다.
    // HTML 문서가 전부 파싱된 후 인증 절차를 시작합니다.
    if (typeof window.initSystem === 'function') {
        window.initSystem();
    }
    if (typeof window.initializeTheme === 'function') {
        window.initializeTheme();
    }
});

window.saveUserIdentity = () => { const n = document.getElementById('usernameInput').value; if (n) { currentUserName = n; localStorage.setItem('er_system_username', n); document.getElementById('userNameDisplay').innerText = n; document.getElementById('userModal').classList.add('hidden'); } };
window.openUserModal = () => document.getElementById('userModal').classList.remove('hidden');
window.setChartPeriod = (p) => { currentChartPeriod = p;['daily', 'weekly', 'monthly'].forEach(m => { const btn = document.getElementById(`btn-chart-${m}`); if (btn) btn.className = (m === p ? "px-3 py-1.5 rounded-md transition-colors bg-white text-[#D97756] shadow-sm" : "px-3 py-1.5 rounded-md text-[#8B7B6E] hover:bg-white/50"); }); window.renderRefundStats(); };

