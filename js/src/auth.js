window.saveAllChanges = async () => {
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
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (role === 'admin' || role === 'system') {
        if (adminBtn) adminBtn.classList.remove('hidden');
        if (adminSettingsBtn) adminSettingsBtn.classList.remove('hidden');
        if (bulkDeleteBtn) bulkDeleteBtn.classList.remove('hidden');
    } else {
        if (adminBtn) adminBtn.classList.add('hidden');
        if (adminSettingsBtn) adminSettingsBtn.classList.add('hidden');
        if (bulkDeleteBtn) bulkDeleteBtn.classList.add('hidden');
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

