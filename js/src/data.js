window.syncData = () => {
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
    try {
        // 1. REST API를 사용한 격리형 인증 계정 발급 (시스템 세션 로그아웃 방지 및 인덱싱 완전 분리)
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${window.firebaseConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: id, password: pw, returnSecureToken: false })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Unknown Auth Error');
        }

        // 2. 기존 로직: Firestore 역할 맵핑 테이블에 등록
        // [FIX] Restore raw collection path
        await setDoc(doc(db, USERS_COLLECTION_NAME, id), { displayName: name, username: id, role: role });

        window.showToast(`실제 계정 발급 및 권한 등록됨 (${role})`);
        ['newUserName', 'newUserId', 'newUserPw'].forEach(i => document.getElementById(i).value = '');
        window.loadUserList();
    } catch (e) {
        console.error("생성 실패:", e);
        if (e.message && e.message.includes('EMAIL_EXISTS')) {
            window.showToast("이미 사용 중인 이메일 계정입니다.");
        } else {
            window.showToast("생성 실패: " + (e.message || "알 수 없는 오류"));
        }
    } finally {
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
window.promptDeleteModal = (id) => {
    const r = localStorage.getItem('er_system_role');
    if (r !== 'admin' && r !== 'system') { window.showToast('삭제 권한이 없습니다.'); return; }
    deleteTargetIds = [id]; document.getElementById('deleteModal').classList.remove('hidden');
};
window.closeDeleteModal = () => document.getElementById('deleteModal').classList.add('hidden');
window.promptDeleteSelected = () => {
    const r = localStorage.getItem('er_system_role');
    if (r !== 'admin' && r !== 'system') { window.showToast('삭제 권한이 없습니다.'); return; }
    if (selectedIds.size > 0) { deleteTargetIds = Array.from(selectedIds); document.getElementById('deleteModal').classList.remove('hidden'); }
};

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

