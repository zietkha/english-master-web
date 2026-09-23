/**
 * English Master Web Application Logic (Unified Mega Platform)
 * Unified SPA Architecture: Landing, Login, Learn, Explore, Leaderboard, My Lessons, Profile, Admin Dashboard, and Feedback Inbox.
 */

const state = {
  currentView: 'learn', // 'landing' | 'login' | 'learn' | 'explore' | 'leaderboard' | 'mylessons' | 'profile' | 'admin'
  currentMode: 'ielts', // 'ielts' | 'tieuhoc'
  theme: localStorage.getItem('english_master_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  db: null,
  maintenanceMode: localStorage.getItem('english_master_maintenance_mode') === 'true',
  
  // Public Leaderboard State (Managed securely via Firebase Auth and Firestore, no plaintext passwords)
  users: [
    { id: 'u_admin', name: 'Nguyễn Viết Kha (Chủ Web)', email: 'admin@gmail.com', role: 'admin', xp: 1200, streak: 12, badges: ['first_lesson', 'streak_7', 'vocab_master'], bookmarks: [] },
    { id: 'u_1', name: 'Tuấn Kiệt', email: 'kiet@gmail.com', role: 'learner', xp: 680, streak: 7, badges: ['first_lesson', 'streak_7'], bookmarks: [] },
    { id: 'u_2', name: 'Minh Anh', email: 'minhanh@gmail.com', role: 'learner', xp: 420, streak: 5, badges: ['first_lesson'], bookmarks: [] },
    { id: 'u_3', name: 'Bảo Châu', email: 'chau@gmail.com', role: 'learner', xp: 310, streak: 3, badges: ['first_lesson'], bookmarks: [] }
  ],
  currentUser: JSON.parse(localStorage.getItem('english_master_current_user') || 'null'),
  feedback: JSON.parse(localStorage.getItem('english_master_feedback') || '[]'),
  
  // Content State
  lessons: { ielts: [], tieuhoc: [] },
  activeLesson: null,
  activeViewTab: 'summary',
  quizAnswers: {},
  
  // Flashcards & Spaced Repetition (SRS) State
  fcIndex: 0,
  fcFlipped: false,
  
  aiUsageCount: parseInt(localStorage.getItem('english_master_ai_calls') || '0', 10),
  syncChannel: null,
  activeExploreTag: 'All',
  myLessonsTab: 'created'
};

const BADGES_LIST = [
  { id: 'first_lesson', name: 'Bài Học Đầu Tiên', icon: '🐣', desc: 'Hoàn thành 1 bài học bất kỳ' },
  { id: 'streak_7', name: '7 Ngày Chăm Chỉ', icon: '🔥', desc: 'Duy trì streak 7 ngày liên tục' },
  { id: 'vocab_master', name: 'Bậc Thầy Từ Vựng', icon: '🧠', desc: 'Học thuộc trên 20 từ vựng' },
  { id: 'quiz_ace', name: 'Bách Phát Bách Trúng', icon: '🎯', desc: 'Đạt điểm tối đa trong bài Quiz' }
];

document.addEventListener('DOMContentLoaded', () => {
  checkMaintenanceMode();
  saveUsersToStorage();
  initTheme();
  initAuthSession();
  initFirebaseAndStorage();
  initUiListeners();
  initLevelAndSkillEngine();
  initActivityTracker();
  navigateTo('learn', false);
  initRouter();
  setTimeout(checkOnboardingStatus, 800);
});

/* ==========================================================================
   1. Navigation & Routing
   ========================================================================== */

function handleLogoClick() {
  if (state.currentUser) {
    navigateTo('learn');
  } else {
    navigateTo('landing');
  }
}

function navigateTo(viewName, updateHash = true) {
  // If user is already authenticated/logged in, do not redirect them to guest landing hero
  if (state.currentUser && viewName === 'landing') {
    viewName = 'learn';
  }

  state.currentView = viewName;

  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
  if (activeNav) activeNav.classList.add('active');

  // Synchronize mobile bottom nav
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
  const activeBNav = document.getElementById(`bnav-${viewName}`);
  if (activeBNav) activeBNav.classList.add('active');

  if (viewName === 'learn') renderLessonsList();
  if (viewName === 'explore') renderExploreGrid();
  if (viewName === 'leaderboard') renderLeaderboard();
  if (viewName === 'mylessons') renderMyLessons();
  if (viewName === 'profile') renderProfilePage();
  if (viewName === 'admin') window.location.href = 'admin.html';
  
  if (updateHash && viewName !== 'learn') {
    updateHashRoute(`#/${viewName}`);
  }

  // Scroll to top on view change
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function checkMaintenanceMode() {
  const overlay = document.getElementById('maintenanceOverlay');
  if (overlay) {
    state.maintenanceMode = localStorage.getItem('english_master_maintenance_mode') === 'true';
    overlay.classList.toggle('active', state.maintenanceMode);
  }
}

/* ==========================================================================
   2. User Auth & Session Engine
   ========================================================================== */

function initAuthSession() {
  const cached = localStorage.getItem('english_master_current_user');
  if (!cached && window.location.pathname.indexOf('login.html') === -1) {
    window.location.href = 'login.html';
    return;
  }
  updateAuthUi();
}

function updateAuthUi() {
  const loginBtn = document.getElementById('loginBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userStatsWidget = document.getElementById('userStatsWidget');
  const userAvatar = document.getElementById('userAvatar');
  const navAdmin = document.getElementById('navAdmin');
  const dropdownAdminBtn = document.getElementById('dropdownAdminBtn');

  if (state.currentUser) {
    const isAdmin = state.currentUser.role === 'admin';

    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfileWidget) userProfileWidget.style.display = 'flex';
    if (userStatsWidget) userStatsWidget.style.display = 'flex';

    if (userAvatar) userAvatar.textContent = state.currentUser.name.charAt(0).toUpperCase();
    document.getElementById('dropdownName').textContent = state.currentUser.name;
    document.getElementById('dropdownRole').textContent = isAdmin ? '🛡️ Quản trị viên' : '🎓 Học viên';
    document.getElementById('headerStreakVal').textContent = state.currentUser.streak || 0;
    document.getElementById('headerXpVal').textContent = state.currentUser.xp || 0;

    const authorInput = document.getElementById('userNameInput');
    if (authorInput) authorInput.value = state.currentUser.name;

    // Strict Role Isolation: Learners must NEVER see admin entry points
    if (navAdmin) navAdmin.style.display = isAdmin ? 'inline-flex' : 'none';
    if (dropdownAdminBtn) dropdownAdminBtn.style.display = isAdmin ? 'flex' : 'none';

    // Force Password Change Check (Section 2.5 & 3.2)
    if (state.currentUser.forcePasswordChange) {
      const forceModal = document.getElementById('forcePasswordModal');
      if (forceModal) forceModal.style.display = 'flex';
    }

  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (userProfileWidget) userProfileWidget.style.display = 'none';
    if (userStatsWidget) userStatsWidget.style.display = 'none';
    if (navAdmin) navAdmin.style.display = 'none';
    if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'none';
  }
}

function switchAuthTab(tab) {
  document.getElementById('authTabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('authTabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();

  if (!email || !pass) {
    showToast('⚠️ Vui lòng nhập đầy đủ email và mật khẩu!', 'danger');
    return;
  }

  if (state.auth) {
    try {
      await state.auth.signInWithEmailAndPassword(email, pass);
      showToast('🎉 Đăng nhập thành công!');
      closeModal('loginModal');
      navigateTo('learn');
    } catch(err) {
      console.warn('Firebase login error:', err.code);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        showToast('❌ Sai email hoặc mật khẩu!', 'danger');
      } else if (err.code === 'auth/user-disabled') {
        showToast('🔒 Tài khoản đã bị khoá.', 'danger');
      } else {
        showToast('❌ Đăng nhập thất bại: ' + (err.message || 'Thử lại sau'), 'danger');
      }
    }
  } else {
    showToast('❌ Dịch vụ xác thực Firebase chưa sẵn sàng.', 'danger');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value.trim();

  if (!name || !email || !pass) {
    showToast('⚠️ Vui lòng điền đầy đủ các thông tin!', 'danger');
    return;
  }

  if (pass.length < 6) {
    showToast('⚠️ Mật khẩu phải có ít nhất 6 ký tự!', 'danger');
    return;
  }

  if (state.auth) {
    try {
      const userCred = await state.auth.createUserWithEmailAndPassword(email, pass);
      await userCred.user.updateProfile({ displayName: name });
      if (state.db) {
        await state.db.collection('users').doc(userCred.user.uid).set({
          name,
          email,
          role: 'learner',
          xp: 50,
          streak: 1,
          status: 'active',
          badges: ['first_lesson'],
          bookmarks: [],
          createdAt: Date.now()
        }, { merge: true });
      }
      showToast('🚀 Đăng ký thành công! +50 XP khởi đầu.');
      closeModal('loginModal');
      navigateTo('learn');
    } catch(err) {
      console.warn('Firebase register error:', err.code);
      if (err.code === 'auth/email-already-in-use') {
        showToast('⚠️ Email này đã được đăng ký!', 'danger');
      } else {
        showToast('❌ Đăng ký thất bại: ' + (err.message || 'Thử lại sau'), 'danger');
      }
    }
  } else {
    showToast('❌ Dịch vụ xác thực Firebase chưa sẵn sàng.', 'danger');
  }
}

async function handleGoogleSignIn() {
  if (state.auth) {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await state.auth.signInWithPopup(provider);
      showToast('🔑 Đăng nhập với Google thành công!');
      closeModal('loginModal');
      navigateTo('learn');
    } catch(err) {
      console.warn('Google sign-in error:', err);
      showToast('❌ Đăng nhập Google thất bại: ' + (err.message || 'Thử lại sau'), 'danger');
    }
  } else {
    showToast('❌ Dịch vụ xác thực Google chưa sẵn sàng.', 'danger');
  }
}

function handleForgotPassword() {
  const email = document.getElementById('loginEmail')?.value.trim();
  if (!email) { showToast('⚠️ Nhập email ở ô trên trước nhé.', 'danger'); return; }
  if (state.auth) {
    state.auth.sendPasswordResetEmail(email).then(() => {
      showToast('📧 Đã gửi email đặt lại mật khẩu về ' + escapeHtml(email));
    }).catch(err => {
      showToast('❌ Lỗi gửi email: ' + err.message, 'danger');
    });
  } else {
    showToast('📧 Đã gửi yêu cầu đặt lại mật khẩu về ' + escapeHtml(email));
  }
}

async function handleLogout() {
  if (state.auth) {
    try {
      await state.auth.signOut();
    } catch(e) {}
  }
  state.currentUser = null;
  localStorage.removeItem('english_master_current_user');
  updateAuthUi();
  hideUserDropdown();
  showToast('👋 Đã đăng xuất an toàn.');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.toggle('show');
}

function hideUserDropdown() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('show');
}

function saveUsersToStorage() {
  // Legacy plaintext storage removed per Section 8 security audit
}

function saveCurrentUserToStorage() {
  if (state.currentUser) {
    const safeUser = {
      id: state.currentUser.id,
      uid: state.currentUser.id,
      name: state.currentUser.name,
      email: state.currentUser.email,
      role: state.currentUser.role || 'learner',
      xp: state.currentUser.xp || 0,
      streak: state.currentUser.streak || 1,
      status: state.currentUser.status || 'active',
      badges: state.currentUser.badges || ['first_lesson'],
      bookmarks: state.currentUser.bookmarks || []
    };
    localStorage.setItem('english_master_current_user', JSON.stringify(safeUser));
  } else {
    localStorage.removeItem('english_master_current_user');
  }
}

async function addXp(amount) {
  if (!state.currentUser) return;
  state.currentUser.xp = (state.currentUser.xp || 0) + amount;
  saveCurrentUserToStorage();
  updateAuthUi();

  if (state.db && state.auth && state.auth.currentUser) {
    try {
      await state.db.collection('users').doc(state.auth.currentUser.uid).update({
        xp: state.currentUser.xp
      });
    } catch(e) {
      console.warn('Firestore XP update error:', e);
    }
  }
}

/* ==========================================================================
   3. Realtime Storage Engine
   ========================================================================== */

function initFirebaseAndStorage() {
  try {
    const savedData = localStorage.getItem('english_master_lessons_v3');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      state.lessons.ielts = (parsed.ielts && parsed.ielts.length >= 6) ? parsed.ielts : (typeof CURRICULUM_DATA !== 'undefined' ? CURRICULUM_DATA.ielts : []);
      state.lessons.tieuhoc = (parsed.tieuhoc && parsed.tieuhoc.length >= 6) ? parsed.tieuhoc : (typeof CURRICULUM_DATA !== 'undefined' ? CURRICULUM_DATA.tieuhoc : []);
    } else {
      loadSampleLessons();
    }
  } catch (e) {
    loadSampleLessons();
  }

  const firebaseConfig = {
    apiKey: "AIzaSyBOJe78VT2g6K4gGwduK8Jh8ON7eWuyWzI",
    authDomain: "english-kha-master.firebaseapp.com",
    databaseURL: "https://english-kha-master-default-rtdb.firebaseio.com",
    projectId: "english-kha-master",
    storageBucket: "english-kha-master.firebasestorage.app",
    messagingSenderId: "1084095345720",
    appId: "1:1084095345720:web:f53ff47c5a41a52f0362cd",
    measurementId: "G-P3MVK7EQ0P"
  };

  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    state.auth = firebase.auth();
    state.db = firebase.firestore();
  } catch (err) {
    console.warn('Firebase init error:', err);
  }

  // Setup Firebase Auth State Listener
  if (state.auth) {
    state.auth.onAuthStateChanged(async (user) => {
      if (user) {
        let role = 'learner';
        let xp = 100;
        let streak = 1;
        let badges = ['first_lesson'];
        let bookmarks = [];
        let name = user.displayName || (user.email ? user.email.split('@')[0] : 'Học viên');

        if (state.db) {
          try {
            const userDocRef = state.db.collection('users').doc(user.uid);
            const doc = await userDocRef.get();
            if (doc.exists) {
              const d = doc.data();
              if (d.status === 'suspended') {
                if (state.auth) await state.auth.signOut();
                state.currentUser = null;
                localStorage.removeItem('english_master_current_user');
                alert('Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên. Vui lòng liên hệ Admin để được hỗ trợ.');
                window.location.href = 'login.html';
                return;
              }
              role = d.role || role;
              xp = d.xp !== undefined ? d.xp : xp;
              streak = d.streak !== undefined ? d.streak : streak;
              badges = d.badges || badges;
              bookmarks = d.bookmarks || bookmarks;
              name = d.name || name;
              if (d.forcePasswordChange) {
                const forceModal = document.getElementById('forcePasswordModal');
                if (forceModal) forceModal.style.display = 'flex';
              }
            } else {
              await userDocRef.set({
                name,
                email: user.email,
                role: 'learner',
                xp,
                streak,
                status: 'active',
                badges,
                bookmarks,
                createdAt: Date.now()
              }, { merge: true });
            }
          } catch(e) {
            console.warn('User doc Firestore sync:', e);
          }
        }

        state.currentUser = {
          id: user.uid,
          uid: user.uid,
          name,
          email: user.email,
          role,
          xp,
          streak,
          status: 'active',
          badges,
          bookmarks
        };
        saveCurrentUserToStorage();
        updateAuthUi();
      } else {
        const cached = localStorage.getItem('english_master_current_user');
        if (!cached && window.location.pathname.indexOf('login.html') === -1) {
          state.currentUser = null;
          updateAuthUi();
          window.location.href = 'login.html';
          return;
        }
        if (cached) {
          state.currentUser = JSON.parse(cached);
          updateAuthUi();
        }
      }
    });
  }

  if (state.db) {
    ['ielts', 'tieuhoc'].forEach(m => {
      const colRef = state.db.collection('lessons_' + m);
      colRef.orderBy('createdAt', 'desc').onSnapshot(snap => {
        if (!snap.empty) {
          state.lessons[m] = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt ? new Date(d.data().createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')
          }));
          saveToLocalStorage(false);
          if (state.currentView === 'learn') renderLessonsList();
        } else if (typeof CURRICULUM_DATA !== 'undefined' && CURRICULUM_DATA[m] && CURRICULUM_DATA[m].length > 0) {
          // Auto-seed Firestore from CURRICULUM_DATA if collection is empty (Section 10.1 Schema)
          console.log(`Auto-seeding initial Firestore curriculum for collection lessons_${m}...`);
          const batch = state.db.batch();
          CURRICULUM_DATA[m].forEach(lesson => {
            const docRef = colRef.doc(lesson.id);
            batch.set(docRef, {
              ...lesson,
              authorType: 'admin',
              createdAt: Date.now()
            }, { merge: true });
          });
          batch.commit().catch(e => console.warn('Firestore seed commit error:', e));
        }
      }, err => {
        console.warn(`Firestore onSnapshot error for lessons_${m}:`, err);
      });
    });
  }

  // Cross-tab real-time sync channel
  try {
    if ('BroadcastChannel' in window) {
      state.syncChannel = new BroadcastChannel('english_master_realtime_sync');
      state.syncChannel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_LESSONS') {
          state.lessons = event.data.lessons;
          saveToLocalStorage(false);
          if (state.currentView === 'learn') renderLessonsList();
        }
      };
    }
  } catch (err) {}
}

async function addLessonToStorage(mode, lesson) {
  state.aiUsageCount++;
  localStorage.setItem('english_master_ai_calls', state.aiUsageCount.toString());

  const collectionName = mode === 'tieuhoc' ? 'lessons_tieuhoc' : 'lessons_ielts';
  const lessonData = {
    ...lesson,
    authorType: lesson.authorType || 'ai',
    authorId: state.currentUser?.id || 'learner-user',
    createdAt: Date.now()
  };

  if (state.db) {
    try {
      const docRef = await state.db.collection(collectionName).add(lessonData);
      lesson.id = docRef.id;
    } catch (err) {
      console.warn('Firestore addLesson error:', err);
    }
  }

  state.lessons[mode] = state.lessons[mode].filter(l => l.id !== lesson.id);
  state.lessons[mode].unshift(lesson);
  saveToLocalStorage(true);
}

async function deleteLessonFromStorage(mode, id) {
  if (state.db) {
    try {
      const collectionName = mode === 'tieuhoc' ? 'lessons_tieuhoc' : 'lessons_ielts';
      await state.db.collection(collectionName).doc(id).delete();
    } catch (err) {
      console.warn('Firestore deleteLesson error:', err);
    }
  }
  state.lessons[mode] = state.lessons[mode].filter(l => l.id !== id);
  saveToLocalStorage(true);
}

function saveToLocalStorage(broadcast = true) {
  try {
    localStorage.setItem('english_master_lessons_v3', JSON.stringify(state.lessons));
    localStorage.setItem('english_master_lessons_v1', JSON.stringify(state.lessons));
    if (broadcast && state.syncChannel) {
      state.syncChannel.postMessage({ type: 'SYNC_LESSONS', lessons: state.lessons });
    }
  } catch (e) {}
}

/* ==========================================================================
   4. AI Lesson Generator
   ========================================================================== */

async function handleCreateLesson(event) {
  event.preventDefault();
  if (!state.currentUser) {
    showToast('⚠️ Vui lòng đăng nhập để tạo bài học!', 'danger');
    navigateTo('login');
    return;
  }

  const userName = document.getElementById('userNameInput').value.trim() || state.currentUser.name;
  const customTitle = document.getElementById('lessonTitleInput').value.trim();
  const tag = document.getElementById('lessonTagInput').value;
  const content = document.getElementById('englishContentInput').value.trim();

  if (!content || content.length < 15) {
    showToast('⚠️ Vui lòng nhập nội dung tiếng Anh từ 15 ký tự trở lên!', 'danger');
    return;
  }

  setLoadingState(true);

  try {
    let generatedLesson = null;
    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material: content, mode: state.currentMode })
      });
      if (res.ok) generatedLesson = await res.json();
    } catch (e) {
      console.warn('Backend API unavailable, using offline engine fallback:', e);
    }

    if (!generatedLesson) {
      generatedLesson = await generateWithLocalAI(content, state.currentMode, customTitle);
    }

    const newLesson = {
      id: 'lesson_' + Date.now(),
      mode: state.currentMode,
      title: customTitle || generatedLesson.title || 'Bài đọc Tiếng Anh',
      creator: userName,
      creatorId: state.currentUser ? state.currentUser.id : 'u_guest',
      tag: tag,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: content,
      summary: generatedLesson.summary || '',
      vocab: Array.isArray(generatedLesson.vocab) ? generatedLesson.vocab.map(v => ({ ...v, srsStatus: 'new' })) : [],
      quiz: Array.isArray(generatedLesson.quiz) ? generatedLesson.quiz : [],
      likes: 0,
      comments: []
    };

    await addLessonToStorage(state.currentMode, newLesson);
    renderLessonsList();
    addXp(30);

    document.getElementById('englishContentInput').value = '';
    document.getElementById('lessonTitleInput').value = '';
    showToast('🎉 Đã tạo bài học thành công! (+30 XP)');
    openLessonModal(newLesson.id);

  } catch (err) {
    showToast('❌ Lỗi khi xử lý: ' + err.message, 'danger');
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  const btn = document.getElementById('generateBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  if (btn && btnText && btnSpinner) {
    btn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline-flex';
    btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
  }
}

async function generateWithLocalAI(text, mode, customTitle) {
  await new Promise(r => setTimeout(r, 600));
  const words = text.match(/\b[a-zA-Z]{3,}\b/g) || [];
  const selectedWords = Array.from(new Set(words.map(w => w.toLowerCase()))).slice(0, 6);

  return {
    title: customTitle || (mode === 'ielts' ? 'IELTS Reading Passage Analysis' : 'Bài đọc Tiếng Anh Tiểu học'),
    summary: `Bài đọc thảo luận sinh động về chủ đề chính, giúp nâng cao kỹ năng đọc hiểu và vốn từ vựng tiếng Anh.`,
    vocab: selectedWords.map(w => ({ word: w.charAt(0).toUpperCase() + w.slice(1), meaning: `từ vựng quan trọng (${w})` })),
    quiz: [
      { question: `What is the main topic of the text?`, options: [`General English topic`, `History of racing`, `Cooking recipes`, `Weather report`], correct: 0 },
      { question: `Which word is emphasized in the passage?`, options: [`${selectedWords[0] || 'English'}`, `Python`, `Calculus`, `Chemistry`], correct: 0 },
      { question: `What level is this reading passage suited for?`, options: [`${mode === 'ielts' ? 'IELTS Academic' : 'Elementary School'}`, `University PhD`, `Kindergarten`, `Advanced Law`], correct: 0 },
      { question: `What should learners do after reading?`, options: [`Review vocabulary and take the quiz`, `Close the browser`, `Delete the file`, `Guess blindly`], correct: 0 },
      { question: `What is the benefit of this lesson?`, options: [`Expand vocabulary and boost confidence`, `No benefit`, `Slows down internet`, `Wastes time`], correct: 0 }
    ]
  };
}

/* ==========================================================================
   5. Views & Renderers
   ========================================================================== */

function renderLessonsList() {
  const container = document.getElementById('lessonsList');
  const countBadge = document.getElementById('lessonsCountBadge');
  const searchInput = document.getElementById('searchInput');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (!container) return;

  const activeLessons = state.lessons[state.currentMode] || [];

  // Filter lessons based on search query, selected grade/level, and selected skill
  const filtered = activeLessons.filter(l => {
    // 1. Text search query
    const matchQuery = !query || 
      (l.title && l.title.toLowerCase().includes(query)) ||
      (l.summary && l.summary.toLowerCase().includes(query)) ||
      (l.creator && l.creator.toLowerCase().includes(query));
    if (!matchQuery) return false;

    // 2. Grade filter (for tieuhoc mode)
    if (state.currentMode === 'tieuhoc' && state.selectedGrade && l.grade) {
      if (l.grade !== state.selectedGrade) return false;
    }

    // 3. Level filter (for ielts mode)
    if (state.currentMode === 'ielts' && state.selectedLevel && l.level) {
      if (l.level !== state.selectedLevel) return false;
    }

    // 4. Skill filter (reading, listening)
    if (state.selectedSkill && l.skill) {
      if (l.skill !== state.selectedSkill) return false;
    }

    return true;
  });

  const displayLessons = (filtered.length > 0 || query) ? filtered : activeLessons;

  if (countBadge) {
    const filterLabel = state.currentMode === 'tieuhoc' 
      ? (state.selectedGrade ? `Lớp ${state.selectedGrade}` : 'Tất cả')
      : (state.selectedLevel ? `Band ${state.selectedLevel}` : 'Tất cả');
    const skillLabel = state.selectedSkill ? ` · ${state.selectedSkill.toUpperCase()}` : '';
    countBadge.textContent = `${displayLessons.length} bài học (${filterLabel}${skillLabel})`;
  }

  if (displayLessons.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 32px 16px; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">📚</div>
        <p style="font-weight: 700; color: var(--text-1); margin-bottom: 6px;">Chưa có bài học nào khớp với bộ lọc này.</p>
        <p style="font-size: 0.85rem; color: var(--text-3); margin-bottom: 14px;">Bạn có thể tạo bài học AI mới bằng form bên cạnh hoặc bấm nút dưới để xem tất cả bài học.</p>
        <button class="btn-secondary" style="font-size: 0.85rem; padding: 7px 18px;" onclick="clearLevelFilters()">
          <i class="fa-solid fa-rotate-left"></i> Xem tất cả bài học
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = displayLessons.map(lesson => renderLessonCardHtml(lesson)).join('');
}

function clearLevelFilters() {
  state.selectedGrade = null;
  state.selectedLevel = null;
  state.selectedSkill = null;
  document.querySelectorAll('.skill-card').forEach(el => el.classList.remove('active'));
  renderLevelCards();
  renderLessonsList();
}

function renderLessonCardHtml(lesson) {
  const isLiked = lesson.likes > 0;
  const isBookmarked = state.currentUser?.bookmarks?.includes(lesson.id);
  const tagColor = lesson.skill === 'listening' ? '#10b981' : '#2563eb';
  const tagBg = lesson.skill === 'listening' ? 'rgba(16,185,129,0.08)' : 'rgba(37,99,235,0.08)';
  const levelBadge = lesson.grade ? `Lớp ${lesson.grade}` : lesson.level ? `Band ${lesson.level}` : (lesson.mode === 'tieuhoc' ? 'Tiểu học' : 'IELTS');

  return `
    <div class="lesson-card" onclick="openLessonModal('${lesson.id}')">
      <div class="lesson-card-header">
        <h3 class="lesson-card-title">${escapeHtml(lesson.title)}</h3>
        <div class="row" style="gap: 4px;" onclick="event.stopPropagation();">
          <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" title="Lưu bài học" onclick="toggleBookmark('${lesson.id}')">
            <i class="fa-solid fa-bookmark"></i>
          </button>
          <button class="delete-btn" title="Xoá bài học" onclick="deleteLesson('${lesson.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px; line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">
        ${escapeHtml(lesson.summary)}
      </p>
      <div class="lesson-card-meta">
        <span class="meta-item" style="color: var(--blue); font-weight: 700; background: rgba(37,99,235,0.08); padding: 2px 8px; border-radius: 999px;">
          ${escapeHtml(levelBadge)}
        </span>
        <span class="meta-item" style="color: ${tagColor}; font-weight: 600; background: ${tagBg}; padding: 2px 8px; border-radius: 999px;">
          ${lesson.skill === 'listening' ? '🎧 Listening' : '📖 Reading'}
        </span>
        <span class="meta-item"><i class="fa-solid fa-tag"></i> ${escapeHtml(lesson.tag || 'Chung')}</span>
        <span class="meta-item"><i class="fa-solid fa-font"></i> ${lesson.vocab?.length || 0} từ</span>
        <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${lesson.id}')">
          <i class="fa-solid fa-heart"></i> ${lesson.likes || 0}
        </button>
      </div>
    </div>
  `;
}

function toggleLike(id) {
  if (!state.currentUser) {
    showToast('⚠️ Vui lòng đăng nhập để thả tim!', 'danger');
    navigateTo('login');
    return;
  }

  const lesson = state.lessons[state.currentMode].find(l => l.id === id);
  if (lesson) {
    lesson.likes = (lesson.likes || 0) + 1;
    saveToLocalStorage(true);
    renderLessonsList();
    showToast('❤️ Đã thả tim bài học!');
  }
}

function toggleBookmark(id) {
  if (!state.currentUser) {
    showToast('⚠️ Vui lòng đăng nhập để lưu bài học!', 'danger');
    navigateTo('login');
    return;
  }

  state.currentUser.bookmarks = state.currentUser.bookmarks || [];
  const index = state.currentUser.bookmarks.indexOf(id);
  if (index === -1) {
    state.currentUser.bookmarks.push(id);
    showToast('📌 Đã lưu bài học vào mục yêu thích!');
  } else {
    state.currentUser.bookmarks.splice(index, 1);
    showToast('🗑️ Đã xoá khỏi danh sách lưu.');
  }

  saveUsersToStorage();
  saveCurrentUserToStorage();
  renderLessonsList();
}

async function deleteLesson(id) {
  if (!confirm('Bạn có chắc chắn muốn xoá bài học này?')) return;
  await deleteLessonFromStorage(state.currentMode, id);
  renderLessonsList();
  showToast('🗑️ Đã xoá bài học.');
}

function renderExploreGrid() {
  const container = document.getElementById('exploreGrid');
  if (!container) return;

  const allLessons = [...state.lessons.ielts, ...state.lessons.tieuhoc];
  const filtered = state.activeExploreTag === 'All' 
    ? allLessons 
    : allLessons.filter(l => l.tag === state.activeExploreTag);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>Chưa có bài học nào trong chủ đề này.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(l => renderLessonCardHtml(l)).join('');
}

function filterExploreTag(tag) {
  state.activeExploreTag = tag;
  renderExploreGrid();
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardTbody');
  if (!tbody) return;

  const sortedUsers = [...state.users].sort((a, b) => {
    const aDays = a.stats?.attendanceDates?.length || (a.streak || 1);
    const bDays = b.stats?.attendanceDates?.length || (b.streak || 1);
    if (bDays !== aDays) return bDays - aDays;
    return (b.xp || 0) - (a.xp || 0);
  });

  if (sortedUsers[0]) {
    document.getElementById('podium1Name').textContent = sortedUsers[0].name;
    document.getElementById('podium1Xp').textContent = `${sortedUsers[0].xp || 0} XP`;
  }
  if (sortedUsers[1]) {
    document.getElementById('podium2Name').textContent = sortedUsers[1].name;
    document.getElementById('podium2Xp').textContent = `${sortedUsers[1].xp || 0} XP`;
  }
  if (sortedUsers[2]) {
    document.getElementById('podium3Name').textContent = sortedUsers[2].name;
    document.getElementById('podium3Xp').textContent = `${sortedUsers[2].xp || 0} XP`;
  }

  tbody.innerHTML = sortedUsers.map((u, idx) => {
    const onlineSecs = u.stats?.totalOnlineSeconds || (idx === 0 ? 14200 : idx === 1 ? 8400 : 3600);
    const attendanceCount = u.stats?.attendanceDates?.length || u.streak || 1;
    const completedCount = u.stats?.lessonsCompleted || Math.max(1, Math.floor((u.xp || 50) / 45));

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div class="row" style="gap: 8px;">
            <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.8rem;">${escapeHtml(u.name.charAt(0))}</div>
            <span>${escapeHtml(u.name)}</span>
          </div>
        </td>
        <td><span class="stat-pill" style="background: rgba(37,99,235,0.08); color: #2563eb; font-weight: 600;"><i class="fa-regular fa-clock"></i> ${formatOnlineTime(onlineSecs)}</span></td>
        <td><span class="stat-pill streak-pill"><i class="fa-solid fa-calendar-check"></i> ${attendanceCount} ngày</span></td>
        <td><strong>${completedCount}</strong> bài</td>
        <td><span class="stat-pill xp-pill"><i class="fa-solid fa-bolt"></i> ${u.xp || 0} XP</span></td>
        <td>${(u.badges || []).length} huy hiệu</td>
      </tr>
    `;
  }).join('');
}

/* ── Section 10.5 & 10.6: Grade & Level Engine ── */
const CEFR_LEVELS = [
  { id: 'A1', name: 'A1 — Sơ cấp', sub: 'IELTS 1.0 – 2.5', icon: '🌱' },
  { id: 'A2', name: 'A2 — Cơ bản', sub: 'IELTS 3.0 – 3.5', icon: '🌿' },
  { id: 'B1', name: 'B1 — Trung cấp', sub: 'IELTS 4.0 – 5.0', icon: '⭐' },
  { id: 'B2', name: 'B2 — Trung cao cấp', sub: 'IELTS 5.5 – 6.5', icon: '🚀' },
  { id: 'C1', name: 'C1 — Cao cấp', sub: 'IELTS 7.0 – 8.0', icon: '🏆' },
  { id: 'C2', name: 'C2 — Thành thạo', sub: 'IELTS 8.5 – 9.0', icon: '👑' }
];

const TIEUHOC_GRADES = [
  { id: '1', name: 'Lớp 1', sub: 'Làm quen & Chữ cái', icon: '🎒' },
  { id: '2', name: 'Lớp 2', sub: 'Từ vựng & Màu sắc', icon: '🎨' },
  { id: '3', name: 'Lớp 3', sub: 'Giao tiếp cơ bản', icon: '📚' },
  { id: '4', name: 'Lớp 4', sub: 'Mẫu câu & Đọc hiểu', icon: '✏️' },
  { id: '5', name: 'Lớp 5', sub: 'Ôn luyện chuyển cấp', icon: '🎓' }
];

function initLevelAndSkillEngine() {
  renderLevelCards();
}

function renderLevelCards() {
  const container = document.getElementById('levelCardsContainer');
  const headingText = document.getElementById('levelSelectorHeadingText');
  const desc = document.getElementById('selectedLevelDesc');
  if (!container) return;

  if (state.currentMode === 'tieuhoc') {
    if (headingText) headingText.textContent = 'Chọn Khối Lớp Học (Tiểu Học)';
    state.selectedGrade = state.selectedGrade || '3';
    if (desc) desc.textContent = `Đang chọn: Lớp ${state.selectedGrade}`;

    container.innerHTML = TIEUHOC_GRADES.map(g => `
      <div class="level-card ${state.selectedGrade === g.id ? 'active' : ''}" onclick="selectGrade('${g.id}')">
        <div class="level-icon">${g.icon}</div>
        <div class="level-name">${g.name}</div>
        <div class="level-sub">${g.sub}</div>
      </div>
    `).join('');
  } else {
    if (headingText) headingText.textContent = 'Chọn Cấp Độ Mục Tiêu (CEFR / IELTS)';
    state.selectedLevel = state.selectedLevel || 'B1';
    const found = CEFR_LEVELS.find(l => l.id === state.selectedLevel) || CEFR_LEVELS[2];
    if (desc) desc.textContent = `Đang chọn: ${found.name} (${found.sub})`;

    container.innerHTML = CEFR_LEVELS.map(l => `
      <div class="level-card ${state.selectedLevel === l.id ? 'active' : ''}" onclick="selectLevel('${l.id}')">
        <div class="level-icon">${l.icon}</div>
        <div class="level-name">${l.id}</div>
        <div class="level-sub">${l.sub}</div>
      </div>
    `).join('');
  }
}

function selectGrade(gradeId, updateHash = true) {
  state.selectedGrade = String(gradeId);
  renderLevelCards();
  renderLessonsList();
  showToast(`🎒 Đang hiển thị bài học Tiếng Anh Lớp ${gradeId}`);
  if (updateHash) {
    const skillPart = state.selectedSkill ? `/${state.selectedSkill}` : '';
    updateHashRoute(`#/tieuhoc/lop${gradeId}${skillPart}`);
  }
}

function selectLevel(levelId, updateHash = true) {
  state.selectedLevel = levelId;
  renderLevelCards();
  renderLessonsList();
  const found = CEFR_LEVELS.find(l => l.id === levelId);
  showToast(`🎯 Đang hiển thị bài học trình độ ${levelId} (${found ? found.sub : ''})`);
  if (updateHash) {
    const skillPart = state.selectedSkill ? `/${state.selectedSkill}` : '';
    updateHashRoute(`#/ielts/${levelId.toLowerCase()}${skillPart}`);
  }
}

function selectSkill(skillName, updateHash = true) {
  document.querySelectorAll('.skill-card').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`skillCard${skillName.charAt(0).toUpperCase() + skillName.slice(1)}`);
  if (target) target.classList.add('active');

  if (skillName === 'writing' || skillName === 'speaking') {
    showToast('⏳ Kỹ năng này đang trong quá trình hoàn thiện — hãy thử luyện Reading hoặc Listening trước nhé! ✨');
    return;
  }
  state.selectedSkill = skillName;
  renderLessonsList();
  showToast(`📖 Đang lọc bài học kỹ năng ${skillName.toUpperCase()}`);
  if (updateHash) {
    const mode = state.currentMode;
    const sub = mode === 'tieuhoc' ? `lop${state.selectedGrade || '3'}` : (state.selectedLevel || 'b1').toLowerCase();
    updateHashRoute(`#/${mode}/${sub}/${skillName}`);
  }
}

/* ── Section 10.9: Activity & Time Online Tracker ── */
function initActivityTracker() {
  const today = new Date().toISOString().split('T')[0];
  if (state.currentUser) {
    state.currentUser.stats = state.currentUser.stats || {
      totalOnlineSeconds: 0,
      attendanceDates: [],
      lessonsCompleted: 0
    };
    if (!state.currentUser.stats.attendanceDates.includes(today)) {
      state.currentUser.stats.attendanceDates.push(today);
      addXp(10);
      showToast('📅 Điểm danh ngày mới thành công! (+10 XP)');
    }
  }

  // Count active time using Page Visibility API
  setInterval(() => {
    if (!document.hidden && state.currentUser) {
      state.currentUser.stats = state.currentUser.stats || {
        totalOnlineSeconds: 0,
        attendanceDates: [today],
        lessonsCompleted: 0
      };
      state.currentUser.stats.totalOnlineSeconds = (state.currentUser.stats.totalOnlineSeconds || 0) + 10;
      if (state.currentUser.stats.totalOnlineSeconds % 60 === 0) {
        saveCurrentUserToStorage();
        if (state.db && state.auth && state.auth.currentUser) {
          state.db.collection('users').doc(state.auth.currentUser.uid).update({
            stats: state.currentUser.stats
          }).catch(() => {});
        }
      }
    }
  }, 10000);
}

function formatOnlineTime(seconds) {
  if (!seconds || seconds < 60) return '< 1 phút';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/* ── Section 10.10: Floating Multi-Action & AI Chat Assistant ── */
function toggleFabMenu() {
  const menu = document.getElementById('fabMenu');
  const icon = document.getElementById('fabMainIcon');
  if (menu) {
    const isActive = menu.classList.toggle('active');
    if (icon) {
      icon.className = isActive ? 'fa-solid fa-xmark' : 'fa-solid fa-comments';
    }
  }
}

function closeFabMenu() {
  const menu = document.getElementById('fabMenu');
  const icon = document.getElementById('fabMainIcon');
  if (menu) menu.classList.remove('active');
  if (icon) icon.className = 'fa-solid fa-comments';
}

document.addEventListener('click', (e) => {
  const container = document.querySelector('.fab-container');
  if (container && !container.contains(e.target)) {
    closeFabMenu();
  }
});

function openAssistantChat() {
  closeFabMenu();
  const win = document.getElementById('assistantChatWindow');
  if (win) {
    win.classList.add('active');
    document.getElementById('assistantChatInput')?.focus();
  }
}

function closeAssistantChat() {
  const win = document.getElementById('assistantChatWindow');
  if (win) win.classList.remove('active');
}

async function handleSendAssistantMsg(e) {
  e.preventDefault();
  const input = document.getElementById('assistantChatInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const msgs = document.getElementById('assistantChatMessages');
  if (msgs) {
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-msg user';
    userDiv.textContent = text;
    msgs.appendChild(userDiv);
    msgs.scrollTop = msgs.scrollHeight;
  }
  input.value = '';

  const botDiv = document.createElement('div');
  botDiv.className = 'chat-msg bot';
  botDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý AI đang suy nghĩ...';
  if (msgs) {
    msgs.appendChild(botDiv);
    msgs.scrollTop = msgs.scrollHeight;
  }

  try {
    state.chatHistory = state.chatHistory || [];
    const levelLabel = state.currentMode === 'tieuhoc'
      ? (state.selectedGrade ? `Lớp ${state.selectedGrade}` : 'Tiểu học')
      : (state.selectedLevel ? `Band ${state.selectedLevel}` : 'IELTS');

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: state.chatHistory,
        context: {
          mode: state.currentMode,
          level: levelLabel
        }
      })
    });

    let reply = '';
    if (res.ok) {
      const data = await res.json();
      reply = data.reply || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này ngay lúc này.';
    } else {
      reply = `Xin chào! Về "${text}", bạn hãy chú ý ngữ cảnh sử dụng từ vựng và xem thêm các bài đọc theo Band/Lớp nhé! ✨`;
    }

    state.chatHistory.push({ sender: 'user', text });
    state.chatHistory.push({ sender: 'ai', text: reply });

    botDiv.innerHTML = formatChatReply(reply);

    // Sync chat message to Firestore chats/{uid}/messages (Roadmap 10.1 & 10.10)
    if (state.db && state.currentUser) {
      try {
        const chatCol = state.db.collection('chats').doc(state.currentUser.uid).collection('messages');
        await chatCol.add({ from: 'user', text, createdAt: Date.now(), readByAdmin: false });
        await chatCol.add({ from: 'ai', text: reply, createdAt: Date.now() + 1 });
      } catch(e) {}
    }
  } catch(err) {
    botDiv.textContent = `Chào bạn! Về "${text}" — bạn có thể áp dụng thêm vào bài tập đọc hiểu và tự tạo bài học AI từ văn bản mẫu nhé! 🌟`;
  }
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function renderMyLessons() {
  const container = document.getElementById('myLessonsGrid');
  if (!container) return;

  if (!state.currentUser) {
    container.innerHTML = `<div class="empty-state"><p>Vui lòng đăng nhập để xem bài học của bạn.</p></div>`;
    return;
  }

  const allLessons = [...state.lessons.ielts, ...state.lessons.tieuhoc];
  let filtered = [];

  if (state.myLessonsTab === 'created') {
    filtered = allLessons.filter(l => l.creatorId === state.currentUser.id || l.creator === state.currentUser.name);
  } else {
    filtered = allLessons.filter(l => state.currentUser.bookmarks?.includes(l.id));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Chưa có bài học nào trong danh sách này.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(l => renderLessonCardHtml(l)).join('');
}

function switchMyLessonsTab(tab) {
  state.myLessonsTab = tab;
  document.getElementById('myTabCreated').classList.toggle('active', tab === 'created');
  document.getElementById('myTabSaved').classList.toggle('active', tab === 'saved');
  renderMyLessons();
}

function renderProfilePage() {
  if (!state.currentUser) return;
  document.getElementById('profileNameInput').value = state.currentUser.name;
  document.getElementById('profileEmailInput').value = state.currentUser.email;

  const badgesGrid = document.getElementById('badgesGrid');
  if (!badgesGrid) return;

  const userBadges = state.currentUser.badges || [];

  badgesGrid.innerHTML = BADGES_LIST.map(b => {
    const isUnlocked = userBadges.includes(b.id);
    return `
      <div class="badge-item ${isUnlocked ? 'unlocked' : ''}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${b.desc}</div>
      </div>
    `;
  }).join('');
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  const newName = document.getElementById('profileNameInput').value.trim();
  const newPass = document.getElementById('profilePassInput').value.trim();

  if (newName) {
    state.currentUser.name = newName;
  }

  if (state.auth && state.auth.currentUser) {
    try {
      if (newName) {
        await state.auth.currentUser.updateProfile({ displayName: newName });
      }
      if (newPass) {
        if (newPass.length < 6) {
          showToast('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!', 'danger');
          return;
        }
        await state.auth.currentUser.updatePassword(newPass);
      }
      if (state.db) {
        await state.db.collection('users').doc(state.auth.currentUser.uid).update({
          name: state.currentUser.name
        });
      }
    } catch(err) {
      console.warn('Update profile error:', err);
      showToast('⚠️ Lỗi cập nhật: ' + err.message, 'danger');
      return;
    }
  }

  saveCurrentUserToStorage();
  updateAuthUi();
  showToast('✅ Đã cập nhật thông tin cá nhân thành công!');
}

/* ==========================================================================
   6. Dedicated Admin Portal
   All admin capabilities (maintenance toggle, metrics, feedback inbox) are
   strictly housed in admin.html with Firebase Auth and Firestore Security Rules.
   ========================================================================== */


/* ==========================================================================
   7. Feedback Modal & Study Engine
   ========================================================================== */

function openFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  if (modal) modal.classList.add('active');
}

function closeFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  if (modal) modal.classList.remove('active');
}

function handleFeedbackOverlayClick(e) {
  if (e.target.id === 'feedbackModal') closeFeedbackModal();
}

function handleSendFeedback() {
  const msgInput = document.getElementById('fbMessage');
  const contactInput = document.getElementById('fbContact');

  const msg = msgInput ? msgInput.value.trim() : '';
  const contact = contactInput ? contactInput.value.trim() : '';

  if (!msg) { showToast('⚠️ Vui lòng nhập nội dung góp ý!', 'danger'); return; }

  const feedbackObj = {
    id: 'fb_' + Date.now(),
    message: msg,
    contact: contact || 'Ẩn danh',
    createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
  };

  if (state.db) {
    try { state.db.collection('feedback').add(feedbackObj); } catch(e){}
  }

  const existing = JSON.parse(localStorage.getItem('english_master_feedback') || '[]');
  existing.unshift(feedbackObj);
  localStorage.setItem('english_master_feedback', JSON.stringify(existing));

  showToast('💌 Cảm ơn bạn! Phản hồi đã được gửi tới Chủ Web.');
  if (msgInput) msgInput.value = '';
  if (contactInput) contactInput.value = '';
  closeFeedbackModal();
}

function openLessonModal(id, updateHash = true) {
  const allLessons = [...state.lessons.ielts, ...state.lessons.tieuhoc];
  const lesson = allLessons.find(l => l.id === id);
  if (!lesson) return;

  state.activeLesson = lesson;
  state.quizAnswers = {};
  state.fcIndex = 0;
  state.fcFlipped = false;

  document.getElementById('modalTitle').textContent = lesson.title;
  document.getElementById('modalMeta').innerHTML = `
    <span class="meta-item"><i class="fa-regular fa-user"></i> ${escapeHtml(lesson.creator || 'Người dùng')}</span>
    <span class="meta-item"><i class="fa-solid fa-tag"></i> ${escapeHtml(lesson.tag || 'Chung')}</span>
    <span class="mode-badge ${escapeHtml(lesson.mode || '')}">${lesson.mode === 'ielts' ? 'IELTS' : 'Tiểu học'}</span>
  `;

  document.getElementById('modalVocabCount').textContent = lesson.vocab?.length || 0;
  document.getElementById('modalQuizCount').textContent = lesson.quiz?.length || 0;

  renderSummarySection();
  renderVocabSection();
  renderFlashcardSection();
  renderQuizSection();
  renderCommentsSection();

  switchViewTab('summary');

  const modal = document.getElementById('lessonModal');
  if (modal) modal.classList.add('active');

  const modalBody = document.querySelector('#lessonModal .modal-body');
  if (modalBody) modalBody.scrollTop = 0;

  if (updateHash) {
    updateHashRoute(`#/lesson/${id}`);
  }
}

function closeLessonModal() {
  const modal = document.getElementById('lessonModal');
  if (modal) modal.classList.remove('active');
  state.activeLesson = null;

  const mode = state.currentMode;
  const sub = mode === 'tieuhoc' ? `lop${state.selectedGrade || '3'}` : (state.selectedLevel || 'b1').toLowerCase();
  const skillPart = state.selectedSkill ? `/${state.selectedSkill}` : '';
  updateHashRoute(`#/${mode}/${sub}${skillPart}`);
}

function handleModalOverlayClick(e) {
  if (e.target.id === 'lessonModal') closeLessonModal();
}

function switchViewTab(tab) {
  state.activeViewTab = tab;
  ['Summary', 'Vocab', 'Flashcard', 'Quiz'].forEach(t => {
    const btn = document.getElementById(`viewTab${t}`);
    const sec = document.getElementById(`${t.toLowerCase()}Section`);
    if (btn) btn.classList.toggle('active', tab === t.toLowerCase());
    if (sec) sec.style.display = tab === t.toLowerCase() ? 'block' : 'none';
  });

  const modalBody = document.querySelector('#lessonModal .modal-body');
  if (modalBody) modalBody.scrollTop = 0;
}

function openWordInFlashcard(index) {
  state.fcIndex = typeof index === 'number' ? index : 0;
  state.fcFlipped = false;
  renderFlashcardSection();
  switchViewTab('flashcard');
}

function renderSummarySection() {
  if (!state.activeLesson) return;
  document.getElementById('modalSummary').textContent = state.activeLesson.summary;
  document.getElementById('modalOriginalContent').textContent = state.activeLesson.originalContent;
}

function renderVocabSection() {
  if (!state.activeLesson) return;
  const grid = document.getElementById('modalVocabGrid');
  const vocab = state.activeLesson.vocab || [];

  grid.innerHTML = vocab.map((v, idx) => `
    <div class="vocab-card">
      <div class="vocab-header">
        <span class="vocab-word">${escapeHtml(v.word)}</span>
        <div class="row" style="gap: 6px;">
          <button class="audio-btn" onclick="speakWord('${escapeJs(v.word)}')" title="Nghe phát âm chuẩn (US)"><i class="fa-solid fa-volume-high"></i></button>
          <button class="voice-practice-btn" onclick="startVoicePractice('${escapeJs(v.word)}', '${escapeJs(v.meaning || '')}')" title="Luyện phát âm từ này bằng giọng nói"><i class="fa-solid fa-microphone"></i></button>
          <button class="audio-btn" onclick="openWordInFlashcard(${idx})" title="Lật thẻ Flashcard 3D từ này" style="color: var(--blue);"><i class="fa-solid fa-layer-group"></i></button>
        </div>
      </div>
      <div class="vocab-meaning">${escapeHtml(v.meaning)}</div>
    </div>
  `).join('');
}

function renderFlashcardSection() {
  if (!state.activeLesson) return;
  const vocab = state.activeLesson.vocab || [];
  if (vocab.length === 0) return;

  const current = vocab[state.fcIndex];
  document.getElementById('fcWord').textContent = current.word;
  document.getElementById('fcMeaning').textContent = current.meaning;
  document.getElementById('fcIndex').textContent = `${state.fcIndex + 1} / ${vocab.length}`;

  // Update Spaced Repetition (SRS) Badge
  const srsBadge = document.getElementById('fcSrsBadge');
  if (srsBadge) {
    const srs = current.srsStatus || 'new';
    if (srs === 'mastered') {
      srsBadge.className = 'srs-badge srs-bucket-mastered';
      srsBadge.innerHTML = '✅ Đã thuộc';
    } else if (srs === 'learning') {
      srsBadge.className = 'srs-badge srs-bucket-learning';
      srsBadge.innerHTML = '⚡ Đang nhớ';
    } else {
      srsBadge.className = 'srs-badge srs-bucket-new';
      srsBadge.innerHTML = '🐣 Mới học';
    }
  }

  const card = document.getElementById('flashcard');
  if (card) card.classList.remove('flipped');
  state.fcFlipped = false;
}

function flipFlashcard() {
  const card = document.getElementById('flashcard');
  if (card) {
    state.fcFlipped = !state.fcFlipped;
    card.classList.toggle('flipped', state.fcFlipped);
  }
}

function nextFlashcard() {
  const vocab = state.activeLesson?.vocab || [];
  if (vocab.length === 0) return;
  state.fcIndex = (state.fcIndex + 1) % vocab.length;
  renderFlashcardSection();
}

function prevFlashcard() {
  const vocab = state.activeLesson?.vocab || [];
  if (vocab.length === 0) return;
  state.fcIndex = (state.fcIndex - 1 + vocab.length) % vocab.length;
  renderFlashcardSection();
}

function setWordSrs(status) {
  if (!state.activeLesson || !state.activeLesson.vocab) return;
  const current = state.activeLesson.vocab[state.fcIndex];
  if (!current) return;

  current.srsStatus = status;
  saveToLocalStorage(true);

  const labels = { new: 'Mới học', learning: 'Đang nhớ', mastered: 'Đã thuộc' };
  showToast(`🎯 Đã chuyển từ "${current.word}" sang mức: ${labels[status] || status}`);
  addXp(5);
  renderFlashcardSection();
}

function handleReportLesson() {
  if (!state.activeLesson) return;
  const reason = prompt('Vui lòng nhập lỗi bạn phát hiện trong bài học này (Ví dụ: Từ vựng dịch sai, đáp án quiz nhầm...):');
  if (!reason || !reason.trim()) return;

  const reportObj = {
    id: 'report_' + Date.now(),
    type: 'report',
    lessonId: state.activeLesson.id,
    lessonTitle: state.activeLesson.title,
    message: `[BÁO CÁO BÀI HỌC: ${state.activeLesson.title}] Nội dung lỗi: ${reason.trim()}`,
    contact: state.currentUser ? `${state.currentUser.name} (${state.currentUser.email})` : 'Học viên ẩn danh',
    createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
  };

  const existing = JSON.parse(localStorage.getItem('english_master_feedback') || '[]');
  existing.unshift(reportObj);
  localStorage.setItem('english_master_feedback', JSON.stringify(existing));

  if (state.db) {
    try { state.db.collection('feedback').add(reportObj); } catch(e) {}
  }

  showToast('🚩 Đã gửi báo cáo lỗi bài học tới Ban Quản Trị. Cảm ơn đóng góp của bạn!');
}

function renderQuizSection() {
  if (!state.activeLesson) return;
  const container = document.getElementById('modalQuizContainer');
  const quizList = state.activeLesson.quiz || [];

  container.innerHTML = quizList.map((q, qIndex) => {
    const selected = state.quizAnswers[qIndex];
    const isAnswered = selected !== undefined;

    return `
      <div class="quiz-card">
        <div class="quiz-question"><span style="color:var(--primary);">Câu ${qIndex + 1}:</span> ${escapeHtml(q.question)}</div>
        <div class="quiz-options">
          ${(q.options || []).map((opt, optIndex) => {
            let cls = 'quiz-option';
            if (isAnswered) {
              cls += ' disabled';
              if (optIndex === q.correct) cls += ' correct animate-correct';
              else if (optIndex === selected) cls += ' incorrect animate-incorrect';
            }
            const prefix = String.fromCharCode(65 + optIndex);
            return `<button class="${cls}" onclick="handleQuizAnswer(${qIndex}, ${optIndex})"><span class="option-prefix">${prefix}</span><span>${escapeHtml(opt)}</span></button>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function handleQuizAnswer(qIndex, optIndex) {
  if (state.quizAnswers[qIndex] !== undefined) return;
  state.quizAnswers[qIndex] = optIndex;
  
  const quizList = state.activeLesson?.quiz || [];
  const isCorrect = quizList[qIndex] && quizList[qIndex].correct === optIndex;
  
  if (isCorrect) {
    addXp(10);
  }

  renderQuizSection();

  // Check if all quiz questions are answered
  const answeredCount = Object.keys(state.quizAnswers).length;
  if (answeredCount === quizList.length && quizList.length > 0) {
    let correctCount = 0;
    quizList.forEach((q, idx) => {
      if (state.quizAnswers[idx] === q.correct) correctCount++;
    });
    const percentage = Math.round((correctCount / quizList.length) * 100);
    
    if (percentage >= 80) {
      triggerConfetti();
      showToast(`🎉 Xuất sắc! Bạn đạt ${correctCount}/${quizList.length} câu đúng (${percentage}%)! (+${correctCount * 10 + 20} XP)`);
      addXp(20);
    } else {
      showToast(`👍 Hoàn thành! Bạn đạt ${correctCount}/${quizList.length} câu đúng (${percentage}%). Tiếp tục phát huy nhé!`);
    }
  }
}

function renderCommentsSection() {
  if (!state.activeLesson) return;
  const container = document.getElementById('commentsList');
  const comments = state.activeLesson.comments || [];

  if (comments.length === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!</p>`;
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(c.author)}</span>
        <span style="color:var(--text-muted); font-size:0.75rem;">${c.date}</span>
      </div>
      <p style="font-size:0.9rem;">${escapeHtml(c.text)}</p>
    </div>
  `).join('');
}

function handleAddComment() {
  if (!state.currentUser) {
    showToast('⚠️ Vui lòng đăng nhập để bình luận!', 'danger');
    navigateTo('login');
    return;
  }

  const input = document.getElementById('commentInput');
  const text = input ? input.value.trim() : '';

  if (!text) return;

  state.activeLesson.comments = state.activeLesson.comments || [];
  state.activeLesson.comments.push({
    id: 'c_' + Date.now(),
    author: state.currentUser.name,
    text: text,
    date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  });

  saveToLocalStorage(true);
  input.value = '';
  renderCommentsSection();
  addXp(5);
  showToast('💬 Đã gửi bình luận! (+5 XP)');
}

/* ==========================================================================
   8. Helpers & Utilities
   ========================================================================== */

function speakWord(word) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('english_master_theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.querySelector('#themeToggleBtn i');
  if (icon) icon.className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function initUiListeners() {
  // Obsolete client API key inputs removed per Section 2 audit
}

function switchMode(mode, updateHash = true) {
  if (state.currentMode === mode && !updateHash) return;
  state.currentMode = mode;
  document.getElementById('tabIelts')?.classList.toggle('active', mode === 'ielts');
  document.getElementById('tabTieuhoc')?.classList.toggle('active', mode === 'tieuhoc');
  const badge = document.getElementById('currentModeBadge');
  if (badge) {
    badge.textContent = mode === 'ielts' ? 'IELTS Academic' : 'Ôn thi Tiểu học';
    badge.className = `mode-badge ${mode}`;
  }
  renderLevelCards();
  renderLessonsList();

  if (updateHash) {
    const sub = mode === 'tieuhoc' ? (state.selectedGrade ? `lop${state.selectedGrade}` : 'lop3') : (state.selectedLevel || 'b1').toLowerCase();
    const skillPart = state.selectedSkill ? `/${state.selectedSkill}` : '';
    updateHashRoute(`#/${mode}/${sub}${skillPart}`);
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toastIcon.className = type === 'danger' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
  toastIcon.style.color = type === 'danger' ? 'var(--danger)' : 'var(--success)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatChatReply(str) {
  if (!str) return '';
  const escaped = escapeHtml(str);
  return escaped
    .replace(/^[\*\-]\s+(.*)$/gm, '• $1')
    .replace(/\n\n+/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function loadSampleLessons() {
  if (typeof CURRICULUM_DATA !== 'undefined' && CURRICULUM_DATA) {
    state.lessons = JSON.parse(JSON.stringify(CURRICULUM_DATA));
  }
  localStorage.setItem('english_master_lessons_v3', JSON.stringify(state.lessons));
  saveToLocalStorage(false);
}

/* ==========================================================================
   9. Modern UI/UX Upgrades (Confetti, Autocomplete, Quick Study & Onboarding)
   ========================================================================== */

function addXp(amount) {
  if (state.currentUser) {
    state.currentUser.xp = (state.currentUser.xp || 0) + amount;
    updateAuthUi();
    saveCurrentUserToStorage();
    saveUsersToStorage();
  }
}

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 6,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 6 - 3
    });
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      if (p.y < canvas.height) alive = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (alive) {
      requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  render();
}

function handleGlobalSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const dropdown = document.getElementById('searchDropdown');
  if (!dropdown) return;

  if (!query) {
    dropdown.classList.remove('show');
    return;
  }

  const allLessons = [...state.lessons.ielts, ...state.lessons.tieuhoc];
  const matchedLessons = allLessons.filter(l => l.title.toLowerCase().includes(query) || (l.summary && l.summary.toLowerCase().includes(query)));
  
  let vocabMatches = [];
  allLessons.forEach(l => {
    (l.vocab || []).forEach(v => {
      if (v.word.toLowerCase().includes(query) || v.meaning.toLowerCase().includes(query)) {
        vocabMatches.push({ word: v.word, meaning: v.meaning, lessonId: l.id });
      }
    });
  });

  let html = '';
  if (matchedLessons.length > 0) {
    html += matchedLessons.slice(0, 4).map(l => `
      <div class="search-item" onclick="openLessonModal('${l.id}'); document.getElementById('searchDropdown').classList.remove('show');">
        <span><i class="fa-solid fa-book"></i> <strong>${escapeHtml(l.title)}</strong></span>
        <span class="mode-badge ${l.mode}">${l.mode}</span>
      </div>
    `).join('');
  }

  if (vocabMatches.length > 0) {
    html += vocabMatches.slice(0, 3).map(v => `
      <div class="search-item" onclick="openLessonModal('${v.lessonId}'); switchViewTab('vocab'); document.getElementById('searchDropdown').classList.remove('show');">
        <span><i class="fa-solid fa-font"></i> <strong>${escapeHtml(v.word)}</strong>: ${escapeHtml(v.meaning)}</span>
        <span style="font-size:0.75rem; color:var(--primary);">Từ vựng</span>
      </div>
    `).join('');
  }

  if (!html) {
    html = `<div style="padding:12px; font-size:0.85rem; color:var(--text-muted); text-align:center;">Không tìm thấy kết quả phù hợp</div>`;
  }

  dropdown.innerHTML = html;
  dropdown.classList.add('show');
}

document.addEventListener('click', (e) => {
  const searchContainer = document.querySelector('.nav-search-container');
  if (searchContainer && !searchContainer.contains(e.target)) {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.classList.remove('show');
  }
});

function startQuickStudySession() {
  const allLessons = [...state.lessons.ielts, ...state.lessons.tieuhoc];
  let allQuizzes = [];
  allLessons.forEach(l => {
    (l.quiz || []).forEach(q => {
      allQuizzes.push({ ...q, lessonTitle: l.title });
    });
  });

  if (allQuizzes.length === 0) {
    showToast('⚠️ Chưa có đủ câu hỏi để tạo bài học nhanh! Hãy tạo bài học đầu tiên.', 'danger');
    return;
  }

  const shuffled = [...allQuizzes].sort(() => 0.5 - Math.random()).slice(0, 5);
  
  const quickLesson = {
    id: 'quick_session_' + Date.now(),
    title: '⚡ Thách Thức Học Nhanh 5 Phút',
    creator: 'Hệ Thống AI',
    mode: state.currentMode,
    summary: 'Bộ 5 câu hỏi trắc nghiệm ngẫu nhiên giúp bạn ôn luyện kiến thức nhanh mỗi ngày.',
    vocab: [],
    quiz: shuffled,
    comments: []
  };

  state.activeLesson = quickLesson;
  state.quizAnswers = {};
  openLessonModal(quickLesson.id);
  switchViewTab('quiz');
  showToast('⚡ Bài học nhanh 5 phút đã sẵn sàng!');
}

let onboardingStep = 1;
const onboardingSteps = [
  {
    icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
    title: 'Chào mừng đến với English Master!',
    text: 'Nền tảng giúp bạn tự động tạo bài học tiếng Anh thông minh từ bất kỳ đoạn văn nào nhờ trợ lý AI.'
  },
  {
    icon: '<i class="fa-solid fa-layer-group"></i>',
    title: 'Flashcards 3D & Luyện Quiz',
    text: 'Lật thẻ 3D học từ vựng trực quan và kiểm tra kiến thức ngay với bộ Quiz phong cách Duolingo & Quizlet.'
  },
  {
    icon: '<i class="fa-solid fa-trophy"></i>',
    title: 'Tích Lũy Streak & Đua Top',
    text: 'Duy trì chuỗi ngày học liên tục (Streak), mở khóa Huy hiệu độc đáo và leo hạng trên Bảng Xếp Hạng!'
  }
];

function checkOnboardingStatus() {
  const hasSeen = localStorage.getItem('english_master_has_seen_onboarding');
  if (!hasSeen) {
    openOnboardingModal();
  }
}

function openOnboardingModal() {
  onboardingStep = 1;
  renderOnboardingStep();
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.classList.add('active');
}

function closeOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.classList.remove('active');
  localStorage.setItem('english_master_has_seen_onboarding', 'true');
}

function renderOnboardingStep() {
  const step = onboardingSteps[onboardingStep - 1];
  if (!step) return;

  const iconEl = document.getElementById('onboardingIcon');
  const titleEl = document.getElementById('onboardingTitle');
  const textEl = document.getElementById('onboardingText');

  if (iconEl) iconEl.innerHTML = step.icon;
  if (titleEl) titleEl.textContent = step.title;
  if (textEl) textEl.textContent = step.text;

  [1, 2, 3].forEach(i => {
    const dot = document.getElementById(`dot${i}`);
    if (dot) dot.classList.toggle('active', i === onboardingStep);
  });

  const nextBtn = document.getElementById('onboardingNextBtn');
  if (nextBtn) {
    nextBtn.innerHTML = onboardingStep === 3 ? 'Bắt đầu học <i class="fa-solid fa-check"></i>' : 'Tiếp tục <i class="fa-solid fa-arrow-right"></i>';
  }
}

function nextOnboardingStep() {
  if (onboardingStep < 3) {
    onboardingStep++;
    renderOnboardingStep();
  } else {
    closeOnboardingModal();
    showToast('🎉 Chúc bạn có trải nghiệm học tập tuyệt vời!');
  }
}

/* ==========================================================================
   Section 11: Single-Page URL Routing Engine (Deep-linking & History)
   ========================================================================== */

function initRouter() {
  window.addEventListener('hashchange', handleHashRoute);
  if (window.location.hash) {
    setTimeout(handleHashRoute, 200);
  }
}

function handleHashRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash) return;

  const parts = hash.split('/').map(p => decodeURIComponent(p.toLowerCase()));
  const [route, sub1, sub2] = parts;

  if (route === 'tieuhoc') {
    navigateTo('learn', false);
    switchMode('tieuhoc', false);
    if (sub1) {
      const gradeNum = sub1.replace(/^(lop|grade)/, '');
      if (['1', '2', '3', '4', '5'].includes(gradeNum)) {
        selectGrade(gradeNum, false);
      }
    }
    if (sub2 && ['reading', 'listening', 'writing', 'speaking'].includes(sub2)) {
      selectSkill(sub2, false);
    }
  } else if (route === 'ielts') {
    navigateTo('learn', false);
    switchMode('ielts', false);
    if (sub1) {
      const lvl = sub1.toUpperCase();
      if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(lvl)) {
        selectLevel(lvl, false);
      }
    }
    if (sub2 && ['reading', 'listening', 'writing', 'speaking'].includes(sub2)) {
      selectSkill(sub2, false);
    }
  } else if (route === 'lesson' && sub1) {
    const all = [...(state.lessons.ielts || []), ...(state.lessons.tieuhoc || [])];
    const target = all.find(l => l.id.toLowerCase() === sub1.toLowerCase());
    if (target) {
      openLessonModal(target.id, false);
    }
  } else if (['leaderboard', 'explore', 'mylessons', 'profile'].includes(route)) {
    navigateTo(route, false);
  }
}

function updateHashRoute(newHash) {
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

/* ==========================================================================
   Section 12: Force Password Change Handler (Mục 2.5 & 3.2)
   ========================================================================== */

async function handleForcePasswordSubmit(e) {
  e.preventDefault();
  const newPass = document.getElementById('forceNewPass').value;
  const confirmPass = document.getElementById('forceConfirmPass').value;
  const errEl = document.getElementById('forcePassErr');
  const btn = document.getElementById('forcePassSubmitBtn');
  const btnText = document.getElementById('forcePassBtnText');
  if (errEl) errEl.textContent = '';

  if (newPass.length < 6) {
    if (errEl) errEl.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    return;
  }
  if (newPass !== confirmPass) {
    if (errEl) errEl.textContent = 'Mật khẩu xác nhận không khớp.';
    return;
  }

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Đang lưu mật khẩu mới...';

  try {
    if (state.auth && state.auth.currentUser) {
      await state.auth.currentUser.updatePassword(newPass);
    }
    if (state.db && state.currentUser) {
      await state.db.collection('users').doc(state.currentUser.id).update({
        forcePasswordChange: false
      });
    }
    state.currentUser.forcePasswordChange = false;
    saveCurrentUserToStorage();
    const modal = document.getElementById('forcePasswordModal');
    if (modal) modal.style.display = 'none';
    showToast('🎉 Đã thiết lập mật khẩu mới thành công! Chúc bạn học tập vui vẻ.');
  } catch (err) {
    console.error('Update password error:', err);
    if (errEl) errEl.textContent = 'Lỗi cập nhật mật khẩu: ' + (err.message || 'Thử lại sau');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Lưu Mật Khẩu & Bắt Đầu Học 🚀';
  }
}

/* ==========================================================================
   Section 13: Interactive Speaking Practice Engine (Web Speech API)
   ========================================================================== */

let currentVoiceTargetWord = '';
let speechRecognitionInstance = null;
let isSpeechRecording = false;

function startVoicePractice(word, phonetic) {
  if (!word) return;
  currentVoiceTargetWord = word.trim();

  const modal = document.getElementById('speakingPracticeModal');
  const targetWordEl = document.getElementById('speakingTargetWord');
  const phoneticEl = document.getElementById('speakingPhonetic');
  const statusEl = document.getElementById('speakingStatusText');
  const resultBox = document.getElementById('speakingResultBox');
  const micIcon = document.getElementById('speakingMicIcon');
  const recordBtn = document.getElementById('speakingRecordBtn');

  if (targetWordEl) targetWordEl.textContent = word;
  if (phoneticEl) phoneticEl.textContent = phonetic || '';
  if (statusEl) statusEl.textContent = 'Nhấn micro và đọc to từ trên';
  if (resultBox) resultBox.style.display = 'none';
  if (micIcon) micIcon.className = 'fa-solid fa-microphone';
  if (recordBtn) recordBtn.style.background = '';

  if (modal) {
    modal.classList.add('active');
  }
}

function closeSpeakingPracticeModal() {
  const modal = document.getElementById('speakingPracticeModal');
  if (modal) modal.classList.remove('active');
  if (speechRecognitionInstance && isSpeechRecording) {
    try { speechRecognitionInstance.stop(); } catch(e) {}
  }
  isSpeechRecording = false;
}

function toggleSpeechRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('⚠️ Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng dùng Google Chrome hoặc Microsoft Edge!', 'danger');
    return;
  }

  const statusEl = document.getElementById('speakingStatusText');
  const micIcon = document.getElementById('speakingMicIcon');
  const recordBtn = document.getElementById('speakingRecordBtn');
  const resultBox = document.getElementById('speakingResultBox');
  const recognizedTextEl = document.getElementById('speakingRecognizedText');
  const scoreBadgeEl = document.getElementById('speakingScoreBadge');

  if (isSpeechRecording) {
    if (speechRecognitionInstance) {
      try { speechRecognitionInstance.stop(); } catch(e) {}
    }
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.style.background = '';
    if (statusEl) statusEl.textContent = 'Đã dừng nghe.';
    return;
  }

  speechRecognitionInstance = new SpeechRecognition();
  speechRecognitionInstance.lang = 'en-US';
  speechRecognitionInstance.interimResults = false;
  speechRecognitionInstance.maxAlternatives = 3;

  speechRecognitionInstance.onstart = () => {
    isSpeechRecording = true;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone fa-beat-fade';
    if (recordBtn) recordBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    if (statusEl) statusEl.textContent = `🎙️ Đang lắng nghe... Hãy phát âm: "${currentVoiceTargetWord}"`;
    if (resultBox) resultBox.style.display = 'none';
  };

  speechRecognitionInstance.onresult = (event) => {
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.style.background = '';

    const spokenTranscript = event.results[0][0].transcript.trim().toLowerCase();
    const target = currentVoiceTargetWord.toLowerCase();

    // Calculate pronunciation similarity score
    const similarity = calculateWordSimilarity(spokenTranscript, target);
    const percentage = Math.round(similarity * 100);

    if (resultBox) resultBox.style.display = 'block';
    if (recognizedTextEl) recognizedTextEl.textContent = `"${event.results[0][0].transcript}"`;

    if (percentage >= 80) {
      scoreBadgeEl.style.background = '#dcfce7';
      scoreBadgeEl.style.color = '#15803d';
      scoreBadgeEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Xuất sắc: ${percentage}% (+15 XP)`;
      if (statusEl) statusEl.textContent = '🎉 Bạn phát âm rất chuẩn!';
      triggerConfetti();
      addXp(15);
    } else {
      scoreBadgeEl.style.background = '#fef3c7';
      scoreBadgeEl.style.color = '#b45309';
      scoreBadgeEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Độ khớp: ${percentage}%`;
      if (statusEl) statusEl.textContent = 'Hãy thử bấm micro và phát âm lại rõ hơn nhé!';
    }
  };

  speechRecognitionInstance.onerror = () => {
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.style.background = '';
    if (statusEl) statusEl.textContent = '❌ Không nhận diện được âm thanh. Vui lòng thử lại!';
  };

  speechRecognitionInstance.onend = () => {
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.style.background = '';
  };

  try {
    speechRecognitionInstance.start();
  } catch(e) {
    console.warn('Speech recognition start error:', e);
  }
}

// Levenshtein similarity algorithm
function calculateWordSimilarity(a, b) {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  if (a.includes(b) || b.includes(a)) return 0.88;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - distance / maxLen);
}



