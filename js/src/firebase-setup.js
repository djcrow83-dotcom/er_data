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

