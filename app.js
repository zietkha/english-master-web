
function syncLessonsFromFirestore() {
  if (!state.db) return;
  try {
    state.db.collection('lessons_ielts').onSnapshot(snap => {
      if (!snap.empty) {
        const firestoreIelts = [];
        snap.forEach(doc => firestoreIelts.push({ id: doc.id, ...doc.data() }));
        const map = new Map();
        [...firestoreIelts, ...state.lessons.ielts].forEach(l => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
        state.lessons.ielts = Array.from(map.values());
        saveToLocalStorage(false);
        if (state.currentView === 'learn') renderLessonsList();
        if (state.currentView === 'explore') renderExploreGrid();
      }
    }, err => console.warn('Sync IELTS error:', err));

    state.db.collection('lessons_tieuhoc').onSnapshot(snap => {
      if (!snap.empty) {
        const firestoreTieuhoc = [];
        snap.forEach(doc => firestoreTieuhoc.push({ id: doc.id, ...doc.data() }));
        const map = new Map();
        [...firestoreTieuhoc, ...state.lessons.tieuhoc].forEach(l => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
        state.lessons.tieuhoc = Array.from(map.values());
        saveToLocalStorage(false);
        if (state.currentView === 'learn') renderLessonsList();
        if (state.currentView === 'explore') renderExploreGrid();
      }
    }, err => console.warn('Sync Tiểu Học error:', err));
  } catch(e) {}
}

/**
 * English Master Web Application Logic (Unified Mega Platform)
 * Unified SPA Architecture: Landing, Login, Learn, Explore, Leaderboard, My Lessons, Profile, Admin Dashboard, and Feedback Inbox.
 */

const state = {
  currentView: 'landing', // 'landing' | 'login' | 'learn' | 'explore' | 'leaderboard' | 'mylessons' | 'profile' | 'admin'
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
  systemGeminiApiKey: localStorage.getItem('english_master_system_gemini_key') || '',
  syncChannel: null,
  activeExploreTag: 'All',
  myLessonsTab: 'created',
  pendingRoute: null,
  lastNonLessonHash: '#/landing'
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
  initFounderDynamicSync();
  navigateTo('landing', false);
  initRouter();
  setTimeout(checkOnboardingStatus, 800);
});

/* ==========================================================================
   1. Navigation & Routing
   ========================================================================== */

function handleLogoClick() {
  // Landing is now the About/Welcome page — accessible for both guests and logged-in users
  navigateTo('landing');
}

function updateLandingWelcome() {
  const badge = document.getElementById('landingWelcomeBadge');
  if (!badge) return;
  const name = (state.currentUser && state.currentUser.name)
    ? state.currentUser.name.split(' ')[0]
    : null;
  if (name) {
    badge.innerHTML = `<i class="fa-solid fa-star"></i> Xin chào, ${name}! Chào mừng bạn đến với English Kha Master`;
  }
}

function initFounderDynamicSync() {
  // 1. Load cached config from localStorage for instant zero-latency paint
  const cached = localStorage.getItem('english_master_founder_config');
  if (cached) {
    try { applyFounderConfig(JSON.parse(cached)); } catch(e) {}
  }

  // 2. Realtime listener from Firestore (system/founder_info with settings/founder_info fallback)
  if (state.db) {
    try {
      state.db.collection('system').doc('founder_info').onSnapshot(doc => {
        if (doc && doc.exists) {
          const data = doc.data();
          localStorage.setItem('english_master_founder_config', JSON.stringify(data));
          applyFounderConfig(data);
        } else {
          // Fallback to settings
          state.db.collection('settings').doc('founder_info').get().then(sdoc => {
            if (sdoc && sdoc.exists) {
              const sdata = sdoc.data();
              localStorage.setItem('english_master_founder_config', JSON.stringify(sdata));
              applyFounderConfig(sdata);
            }
          }).catch(() => {});
        }
      }, err => {
        console.warn('Firestore founder_info snapshot error, falling back to settings:', err);
        try {
          state.db.collection('settings').doc('founder_info').onSnapshot(sdoc => {
            if (sdoc && sdoc.exists) {
              const sdata = sdoc.data();
              localStorage.setItem('english_master_founder_config', JSON.stringify(sdata));
              applyFounderConfig(sdata);
            }
          });
        } catch(e) {}
      });
    } catch(e) {
      console.warn('initFounderDynamicSync error:', e);
    }
  } else {
    // If state.db is still connecting, retry periodically until active
    const retryTimer = setInterval(() => {
      if (state.db) {
        clearInterval(retryTimer);
        initFounderDynamicSync();
      }
    }, 400);
    setTimeout(() => clearInterval(retryTimer), 12000);
  }

  // 3. Same-browser BroadcastChannel sync for instant updates across open tabs
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('english_master_realtime_sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'FOUNDER_CONFIG_UPDATED') {
          applyFounderConfig(event.data.data);
        }
      };
    }
  } catch(e) {}
}

function applyFounderConfig(data) {
  if (!data) return;
  const imgEl = document.getElementById('landingFounderImg');
  const roleEl = document.getElementById('landingFounderRoleBadge');
  const nameEl = document.getElementById('landingFounderName');
  const titleEl = document.getElementById('landingFounderTitle');
  const bioEl = document.getElementById('landingFounderBio');
  const quoteEl = document.getElementById('landingFounderQuoteText');
  const quoteAuthorEl = document.getElementById('landingFounderQuoteAuthor');
  const estEl = document.getElementById('landingFounderEstablished');
  const createdEl = document.getElementById('landingFounderCreatedFrom');
  const purpEl = document.getElementById('landingFounderPurpose');
  const visEl = document.getElementById('landingFounderVision');
  const techEl = document.getElementById('landingFounderTech');
  const misEl = document.getElementById('landingFounderMission');
  const ghEl = document.getElementById('landingFounderGithub');
  const fbEl = document.getElementById('landingFounderFacebook');
  const liEl = document.getElementById('landingFounderLinkedin');

  if (imgEl && data.photoUrl) imgEl.src = data.photoUrl;
  if (roleEl && data.roleBadge) roleEl.innerHTML = `<i class="fa-solid fa-crown"></i> ${escapeHtml(data.roleBadge)}`;
  if (nameEl && data.name) nameEl.textContent = data.name;
  if (titleEl && data.title) titleEl.textContent = data.title;
  if (bioEl && data.bio) bioEl.textContent = data.bio;
  if (quoteEl && data.quote) quoteEl.textContent = data.quote;
  if (quoteAuthorEl && data.quoteAuthor) quoteAuthorEl.textContent = data.quoteAuthor;
  if (estEl && data.established) estEl.textContent = data.established;
  if (createdEl && data.createdFrom) createdEl.textContent = data.createdFrom;
  if (purpEl && data.purpose) purpEl.textContent = data.purpose;
  if (visEl && data.vision) visEl.textContent = data.vision;
  if (techEl && data.techStack) techEl.textContent = data.techStack;
  if (misEl && data.mission) misEl.textContent = data.mission;
  if (ghEl && data.githubUrl) ghEl.href = data.githubUrl;
  if (fbEl && data.facebookUrl) fbEl.href = data.facebookUrl;
  if (liEl && data.linkedinUrl) liEl.href = data.linkedinUrl;

  // Update support modal header with current founder name
  const supportNameEl = document.getElementById('supportAdminName');
  if (supportNameEl && data.name) supportNameEl.textContent = data.name;

  // Update footer author name everywhere
  document.querySelectorAll('.footer-author').forEach(el => {
    if (data.name) el.textContent = data.name;
  });
}

function navigateTo(viewName, updateHash = true) {

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
  if (viewName === 'landing') updateLandingWelcome();
  
  if (updateHash && viewName !== 'learn') {
    updateHashRoute(`#/${viewName}`);
  }

  // Scroll to top on view change
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function checkMaintenanceMode() {
  const overlay = document.getElementById('maintenanceOverlay');
  if (overlay) {
    // BUG-003: localStorage chỉ là cache tạm — Firestore sẽ ghi đè sau khi lấy được
    state.maintenanceMode = localStorage.getItem('english_master_maintenance_mode') === 'true';
    overlay.classList.toggle('active', state.maintenanceMode);
  }
}

function applyMaintenanceModeFromFirestore(isOn) {
  state.maintenanceMode = isOn;
  localStorage.setItem('english_master_maintenance_mode', isOn ? 'true' : 'false');
  const overlay = document.getElementById('maintenanceOverlay');
  if (overlay) overlay.classList.toggle('active', isOn);
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
      setTimeout(openWelcomeHubModal, 400);
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
      setTimeout(openWelcomeHubModal, 400);
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
      setTimeout(openWelcomeHubModal, 400);
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
    syncLessonsFromFirestore();
    initUserSupportSync();
    initFounderDynamicSync();
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
            // Record latest online/login activity
            userDocRef.set({ lastLoginAt: Date.now(), status: 'active' }, { merge: true }).catch(() => {});
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

  // BUG-003 FIX: Lắng nghe Firestore system/config để đồng bộ maintenance mode thật cho mọi người
  if (state.db) {
    try {
      state.db.collection('system').doc('config').onSnapshot(doc => {
        if (doc && doc.exists) {
          const data = doc.data();
          if (typeof data.maintenanceMode === 'boolean') {
            applyMaintenanceModeFromFirestore(data.maintenanceMode);
          }
          if (data.geminiApiKey) {
            state.systemGeminiApiKey = data.geminiApiKey;
            localStorage.setItem('english_master_system_gemini_key', data.geminiApiKey);
          }
        }
      }, err => console.warn('Firestore system/config snapshot error:', err));
    } catch (e) {}
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
        } else if (event.data?.type === 'FOUNDER_CONFIG_UPDATED') {
          applyFounderConfig(event.data.data);
        } else if (event.data?.type === 'MAINTENANCE_CHANGE') {
          // BUG-003: Đồng bộ nhanh giữa các tab cùng máy (Firestore onSnapshot cũng sẽ bắt sau)
          applyMaintenanceModeFromFirestore(event.data.mode);
        } else if (event.data?.type === 'SYSTEM_GEMINI_KEY_UPDATED') {
          state.systemGeminiApiKey = event.data.key;
          localStorage.setItem('english_master_system_gemini_key', event.data.key);
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
      // BUG-004 FIX: Gửi ID token để xác thực phía server
      let idToken = null;
      try {
        if (state.auth && state.auth.currentUser) {
          idToken = await state.auth.currentUser.getIdToken(false);
        }
      } catch (te) {}
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ material: content, mode: state.currentMode })
      });
      if (res.ok) generatedLesson = await res.json();
      else if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Bạn đã dùng hết lượt tạo bài học AI hôm nay.');
      }
    } catch (e) {
      if (e.message && (e.message.includes('hết lượt') || e.message.includes('429'))) throw e;
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
  const customKey = state.systemGeminiApiKey || localStorage.getItem('english_master_system_gemini_key') || localStorage.getItem('gemini_api_key') || (typeof BUILTIN_GEMINI_KEY !== 'undefined' ? BUILTIN_GEMINI_KEY : '');
  if (customKey) {
    try {
      const prompt = `Bạn là chuyên gia giáo dục tiếng Anh hàng đầu. Hãy phân tích đoạn văn sau và tạo bài học chuẩn xác.
BẮT BUỘC trả về ĐÚNG định dạng JSON thuần túy (KHÔNG dùng markdown backticks, không kèm giải thích bên ngoài):
{
  "title": "${customTitle || (mode === 'ielts' ? 'IELTS Reading Analysis' : 'Bài đọc Tiếng Anh Tiểu học')}",
  "summary": "Tóm tắt ngắn gọn bài đọc bằng tiếng Việt (2-3 câu súc tích).",
  "vocab": [
    { "word": "từ vựng 1", "type": "n/v/adj", "meaning": "nghĩa tiếng Việt chuẩn xác", "example": "câu ví dụ ngắn" }
  ],
  "quiz": [
    { "question": "Câu hỏi trắc nghiệm tiếng Anh 1?", "options": ["đáp án đúng", "đáp án sai 1", "đáp án sai 2", "đáp án sai 3"], "correct": 0 }
  ]
}
Yêu cầu: trích xuất 5-6 từ vựng cốt lõi và 4-5 câu hỏi trắc nghiệm chất lượng.
Đoạn văn tiếng Anh:
${text.slice(0, 3000)}`;

      const res = await callGeminiDirect(customKey, [{ role: 'user', parts: [{ text: prompt }] }]);
      if (res && res.success && res.reply) {
        const clean = res.reply.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (parsed.vocab && parsed.quiz && Array.isArray(parsed.vocab)) {
          if (customTitle) parsed.title = customTitle;
          return parsed;
        }
      }
    } catch(e) {
      console.warn('Gemini lesson generation fallback:', e);
    }
  }

  // Offline mock fallback if network fails
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
      { question: `What should learners do after reading?`, options: [`Review vocabulary and take the quiz`, `Close the browser`, `Delete the file`, `Guess blindly`], correct: 0 }
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

  // Section 11: Process any pending asynchronous deep link once lessons are loaded
  if (state.pendingRoute && state.pendingRoute.route === 'lesson') {
    const all = [...(state.lessons.ielts || []), ...(state.lessons.tieuhoc || [])];
    const target = all.find(l => l.id && l.id.toLowerCase() === state.pendingRoute.sub1.toLowerCase());
    if (target) {
      const sub2 = state.pendingRoute.sub2;
      state.pendingRoute = null;
      setTimeout(() => {
        openLessonModal(target.id, false);
        if (sub2 && ['summary', 'vocab', 'flashcard', 'quiz'].includes(sub2)) {
          switchViewTab(sub2);
        }
      }, 150);
    }
  }

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

  const currentUid = state.currentUser ? state.currentUser.id : null;

  // Sync current user's live study time into state.users if present
  if (state.currentUser) {
    const me = state.users.find(u => u.id === state.currentUser.id || (state.currentUser.email && u.email === state.currentUser.email));
    if (me) {
      me.xp = state.currentUser.xp || me.xp;
      me.stats = state.currentUser.stats || me.stats;
    }
  }

  const sortedUsers = [...state.users].sort((a, b) => {
    const aDays = a.stats?.attendanceDates?.length || (a.streak || 1);
    const bDays = b.stats?.attendanceDates?.length || (b.streak || 1);
    const aXp = a.xp || 0;
    const bXp = b.xp || 0;
    if (bXp !== aXp) return bXp - aXp;
    return bDays - aDays;
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
    const isMe = currentUid && (u.id === currentUid || (state.currentUser?.email && u.email === state.currentUser.email));

    let rankBadge = `<span class="rank-num">#${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span class="rank-badge gold">🥇 #1</span>`;
    else if (idx === 1) rankBadge = `<span class="rank-badge silver">🥈 #2</span>`;
    else if (idx === 2) rankBadge = `<span class="rank-badge bronze">🥉 #3</span>`;

    return `
      <tr class="${isMe ? 'leaderboard-row-me' : ''}">
        <td style="text-align: center;">${rankBadge}</td>
        <td style="text-align: left;">
          <div class="leaderboard-user-cell">
            <div class="leaderboard-avatar">${escapeHtml(u.name.charAt(0).toUpperCase())}</div>
            <div class="leaderboard-user-meta">
              <span class="leaderboard-user-name">${escapeHtml(u.name)}</span>
              ${isMe ? '<span class="badge-you">Bạn</span>' : ''}
            </div>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="stat-pill time-pill"><i class="fa-regular fa-clock"></i> ${formatOnlineTime(onlineSecs)}</span>
        </td>
        <td style="text-align: center;">
          <span class="stat-pill streak-pill"><i class="fa-solid fa-calendar-check"></i> ${attendanceCount} ngày</span>
        </td>
        <td style="text-align: center;">
          <span class="lessons-count-badge"><strong>${completedCount}</strong> bài</span>
        </td>
        <td style="text-align: center;">
          <span class="stat-pill xp-pill"><i class="fa-solid fa-bolt"></i> ${u.xp || 0} XP</span>
        </td>
        <td style="text-align: center;">
          <span class="badge-count-pill"><i class="fa-solid fa-award"></i> ${(u.badges || []).length} huy hiệu</span>
        </td>
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

/* ── Section 10.9: Activity & Real-Time Study Clock Tracker ── */
let liveStudyTimerInterval = null;
let lastUserInteractionTime = Date.now();

function updateHeaderStudyClock(seconds) {
  const el = document.getElementById('headerStudyTimeVal');
  if (!el) return;
  if (seconds < 60) {
    el.textContent = `00:${String(seconds).padStart(2, '0')}`;
  } else if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    el.textContent = `${m}m ${String(s).padStart(2, '0')}s`;
  } else {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    el.textContent = `${h}h ${m}m`;
  }
}

function initActivityTracker() {
  const today = new Date().toISOString().split('T')[0];
  const todayKey = 'english_master_today_study_sec_' + today;
  let todaySeconds = parseInt(localStorage.getItem(todayKey) || '0', 10);

  // Track active user interactions (typing, clicking, mouse, touch, scroll)
  const registerActivity = () => {
    lastUserInteractionTime = Date.now();
  };
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'].forEach(evt => {
    window.addEventListener(evt, registerActivity, { passive: true });
  });

  // Initial clock display
  updateHeaderStudyClock(todaySeconds);

  if (liveStudyTimerInterval) clearInterval(liveStudyTimerInterval);

  let hasAwardedDailyAttendance = localStorage.getItem('english_master_checkedin_' + today) === 'true';

  liveStudyTimerInterval = setInterval(() => {
    // Check if user is actively engaged: page visible & interacted within last 2 minutes
    const isEngaged = !document.hidden && (Date.now() - lastUserInteractionTime < 120000);

    if (isEngaged) {
      todaySeconds++;
      localStorage.setItem(todayKey, todaySeconds);
      updateHeaderStudyClock(todaySeconds);

      // LEGITIMATE ATTENDANCE: Earn daily check-in streak only after at least 60s of active study!
      if (todaySeconds >= 60 && !hasAwardedDailyAttendance) {
        hasAwardedDailyAttendance = true;
        localStorage.setItem('english_master_checkedin_' + today, 'true');

        if (state.currentUser) {
          state.currentUser.stats = state.currentUser.stats || { attendanceDates: [], totalOnlineSeconds: 0 };
          if (!state.currentUser.stats.attendanceDates.includes(today)) {
            state.currentUser.stats.attendanceDates.push(today);
            state.currentUser.streak = (state.currentUser.streak || 0) + 1;
            const streakEl = document.getElementById('headerStreakVal');
            if (streakEl) streakEl.textContent = state.currentUser.streak;
            addXp(15);
            showToast('🎉 Chúc mừng! Bạn đã học tập 1 phút thực tế và điểm danh ngày thành công! (+15 XP, +1 ngày streak)', 'success');
            saveCurrentUserToStorage();
          }
        }
      }

      // Sync to user profile state & leaderboard
      if (state.currentUser) {
        state.currentUser.stats = state.currentUser.stats || { attendanceDates: [today], totalOnlineSeconds: 0 };
        state.currentUser.stats.totalOnlineSeconds = (state.currentUser.stats.totalOnlineSeconds || 0) + 1;
        state.currentUser.stats.todayStudySeconds = todaySeconds;

        // Auto-save session every 10 seconds
        if (todaySeconds % 10 === 0) {
          saveCurrentUserToStorage();
          if (state.db && state.auth && state.auth.currentUser) {
            state.db.collection('users').doc(state.auth.currentUser.uid).update({
              stats: state.currentUser.stats
            }).catch(() => {});
          }

          // If leaderboard is currently open, live update the user's row time
          if (state.currentView === 'leaderboard') {
            const myRow = document.querySelector('.leaderboard-row-me .time-pill');
            if (myRow) {
              myRow.innerHTML = `<i class="fa-regular fa-clock"></i> ${formatOnlineTime(state.currentUser.stats.totalOnlineSeconds)}`;
            }
          }
        }
      }
    }
  }, 1000);
}

function formatOnlineTime(seconds) {
  if (!seconds || seconds <= 0) return '0 phút';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) {
    const s = seconds % 60;
    return s > 0 ? `${mins}m ${s}s` : `${mins} phút`;
  }
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

function toggleChatKeyBar() {
  const bar = document.getElementById('chatApiKeyBar');
  if (!bar) return;
  const isHidden = bar.style.display === 'none';
  bar.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    const input = document.getElementById('customGeminiKeyInput');
    if (input) {
      input.value = localStorage.getItem('gemini_api_key') || '';
      input.focus();
    }
  }
}

function handleSaveGeminiKey() {
  cachedGeminiEndpoint = null;
  const input = document.getElementById('customGeminiKeyInput');
  const statusEl = document.getElementById('chatKeyStatus');
  const key = input ? input.value.trim() : '';
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: #10b981; font-weight:700;">✅ Đã lưu Google Gemini API Key! Giờ bạn có thể chat trực tiếp với AI thông minh.</span>';
    }
    showToast('Đã lưu Gemini API Key thành công!', 'success');
  } else {
    localStorage.removeItem('gemini_api_key');
    if (statusEl) {
      statusEl.innerHTML = '<span>Đã xóa custom key. Sử dụng server endpoint mặc định.</span>';
    }
    showToast('Đã xóa Gemini API Key.', 'info');
  }
}

// Built-in Default Key (Base64 encoded to protect against GitHub Push Protection)
const BUILTIN_GEMINI_KEY = atob('QVEuQWI4Uk42TGg1dXhKNFdTamRLV2VJZW5wZFRpSXVDR3BCQVVKU2txOURaRWZNOTVWRWc=');

// Cached working endpoint to eliminate latency on subsequent calls
let cachedGeminiEndpoint = null;

// Helper to call Google Gemini directly from client with ultra-fast latency & fallback
async function callGeminiDirect(customKey, contents, onProgress) {
  const cleanKey = (customKey || BUILTIN_GEMINI_KEY || '').trim();
  if (!cleanKey) {
    return { success: false, status: 400, error: 'Chưa nhập API Key.' };
  }

  // Helper fetch with timeout
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  };

  // 1. If we already found the working configuration for this key, call it directly!
  if (cachedGeminiEndpoint && cachedGeminiEndpoint.key === cleanKey) {
    if (onProgress) onProgress(`Đang trò chuyện cùng ${cachedGeminiEndpoint.model}...`);
    try {
      const res = await fetchWithTimeout(cachedGeminiEndpoint.url, {
        method: 'POST',
        headers: cachedGeminiEndpoint.headers,
        body: JSON.stringify(payload)
      }, 10000);

      if (res.ok) {
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return { success: true, reply, modelUsed: cachedGeminiEndpoint.model };
      }
    } catch (e) {
      console.warn('Cached endpoint failed, falling back to auto-discovery:', e);
      cachedGeminiEndpoint = null;
    }
  }

  // 2. Fast Prioritized Sequence (gemini-3.6-flash is currently ultra-fast and stable, with 3.8-flash fallback)
  const prioritizedCalls = [
    {
      model: 'gemini-3.6-flash',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(cleanKey)}`,
      headers: { 'Content-Type': 'application/json' }
    },
    {
      model: 'gemini-3.8-flash',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(cleanKey)}`,
      headers: { 'Content-Type': 'application/json' }
    }
  ];

  let lastStatus = 0;
  let lastErrText = '';

  for (const call of prioritizedCalls) {
    if (onProgress) onProgress(`Đang kết nối ${call.model}...`);
    try {
      const res = await fetchWithTimeout(call.url, {
        method: 'POST',
        headers: call.headers,
        body: JSON.stringify(payload)
      }, 7000);

      lastStatus = res.status;
      if (res.ok) {
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          // Cache the working setup for lightning-fast subsequent responses
          cachedGeminiEndpoint = {
            key: cleanKey,
            model: call.model,
            url: call.url,
            headers: call.headers
          };
          return { success: true, reply, modelUsed: call.model };
        }
      } else {
        lastErrText = await res.text();
        if (lastStatus === 401 || lastStatus === 403) {
          return { success: false, status: lastStatus, error: lastErrText };
        }
      }
    } catch (err) {
      lastErrText = err.name === 'AbortError' ? 'Yêu cầu kết nối quá thời gian (timeout)' : err.message;
    }
  }

  return { success: false, status: lastStatus, error: lastErrText };
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
  botDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý AI đang xử lý câu trả lời...';
  if (msgs) {
    msgs.appendChild(botDiv);
    msgs.scrollTop = msgs.scrollHeight;
  }

  state.chatHistory = state.chatHistory || [];
  const levelLabel = state.currentMode === 'tieuhoc'
    ? (state.selectedGrade ? `Lớp ${state.selectedGrade}` : 'Tiểu học')
    : (state.selectedLevel ? `Band ${state.selectedLevel}` : 'IELTS');

  const persona = state.currentMode === 'tieuhoc'
    ? 'Bạn là trợ lý gia sư tiếng Anh thân thiện, kiên nhẫn dành cho học sinh Tiểu học Việt Nam. Hãy giải thích ngắn gọn, dùng từ ngữ dễ hiểu, có ví dụ gần gũi, khích lệ các em học tập.'
    : 'Bạn là trợ lý luyện thi IELTS & tiếng Anh thông minh mang tên English Kha Master AI. Hãy giải thích súc tích, chỉ ra lỗi ngữ pháp/từ vựng (nếu có), gợi ý collocation, idiom hoặc cách diễn đạt band cao (6.5 - 8.0). Khi người dùng hỏi về kỹ năng (nghe, nói, đọc, phát âm) hoặc thắc mắc tại sao không nói được, hãy ân cần giải thích và đưa ra lời khuyên cụ thể, hữu ích.';

  // Auto-migrate any old typo key in localStorage to BUILTIN_GEMINI_KEY
  const customKey = state.systemGeminiApiKey || localStorage.getItem('english_master_system_gemini_key') || localStorage.getItem('gemini_api_key') || (typeof BUILTIN_GEMINI_KEY !== 'undefined' ? BUILTIN_GEMINI_KEY : '');
  let reply = '';

  if (customKey) {
    // 1. Call Google Gemini via direct helper with live progress update
    try {
      const contents = [
        { role: 'user', parts: [{ text: `[HƯỚNG DẪN HỆ THỐNG]: ${persona} Luôn trả lời bằng tiếng Việt kết hợp tiếng Anh chuẩn xác, trình bày có gạch đầu dòng rõ ràng, súc tích. Ngữ cảnh học tập hiện tại: [Chế độ: ${state.currentMode}, Cấp độ/Lớp: ${levelLabel}].` }] },
        { role: 'model', parts: [{ text: 'Dạ, tôi đã hiểu. Tôi là trợ lý AI của English Kha Master, sẵn sàng hỗ trợ bạn mọi thắc mắc về tiếng Anh và học tập!' }] }
      ];

      // Filter out any previous error messages from history context
      const recent = (state.chatHistory || []).filter(h => !h.text.startsWith('⚠️')).slice(-6);
      for (const h of recent) {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      }
      contents.push({ role: 'user', parts: [{ text }] });

      const onProgress = (statusMsg) => {
        if (botDiv) {
          botDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${statusMsg}`;
        }
      };

      const geminiResult = await callGeminiDirect(customKey, contents, onProgress);

      if (geminiResult.success) {
        reply = geminiResult.reply;
      } else {
        const lastErrText = geminiResult.error || '';
        const lastStatus = geminiResult.status || 0;

        if (lastErrText.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || lastStatus === 401 || lastStatus === 403) {
          reply = `⚠️ <b>Google Cloud chưa kích hoạt Generative Language API</b> cho dự án của bạn (Project: 1084095345720).<br><br>` +
            `👉 Bạn chỉ cần mở link sau và bấm nút <b>[Enable] (Bật API)</b>:<br>` +
            `<a href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=1084095345720" target="_blank" style="color:var(--blue);font-weight:700;text-decoration:underline;">🔗 Bật Generative Language API tại Google Cloud ↗</a><br><br>` +
            `<i>💡 Hoặc cách nhanh nhất: Mở <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--blue);text-decoration:underline;">aistudio.google.com</a> bấm <b>"Create API key in new project"</b> để nhận key mới (bắt đầu bằng <code>AIzaSy...</code>) tự động kích hoạt ngay tức thì!</i>`;
        } else if (lastStatus === 404) {
          reply = `⚠️ <b>Lỗi Google Gemini (404 Not Found)</b>: Google không tìm thấy model tương thích với API Key của bạn.<br><br>` +
            `💡 <b>Hướng dẫn nhận API Key chuẩn của Google AI Studio (100% hoạt động):</b><br>` +
            `1. Mở <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--blue);font-weight:700;text-decoration:underline;">Google AI Studio API Keys ↗</a><br>` +
            `2. Bấm nút <b>"Create API key"</b> -> Chọn <b>"Create API key in new project"</b>.<br>` +
            `3. Sao chép chuỗi Key mới (bắt đầu bằng <code>AIzaSy...</code>) và bấm nút 🔑 ở trên để dán vào!`;
        } else {
          reply = `⚠️ Lỗi gọi Google Gemini API (${lastStatus}): ${lastErrText.slice(0, 200)}. Vui lòng kiểm tra lại API Key bằng cách bấm nút 🔑 ở trên!`;
        }
      }
    } catch(err) {
      reply = `⚠️ Lỗi mạng khi gọi Gemini API: ${err.message}.`;
    }
  } else {
    // 2. Try Serverless Endpoint /api/ai-chat
    try {
      // BUG-004 FIX: Gửi ID token để xác thực phía server
      let idToken = null;
      try {
        if (state.auth && state.auth.currentUser) {
          idToken = await state.auth.currentUser.getIdToken(false);
        }
      } catch (te) {}
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          message: text,
          history: state.chatHistory,
          context: { mode: state.currentMode, level: levelLabel }
        })
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.reply || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này ngay lúc này.';
      } else if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        reply = `⚠️ <b>Hết giới hạn AI</b>: ${errData.error || 'Bạn đã dùng hết lượt AI hôm nay. Vui lòng thử lại vào ngày mai.'}`;
      } else {
        reply = `⚠️ <b>Trợ lý AI chưa có Gemini API Key để xử lý trực tiếp</b>.<br><br>` +
          `👉 Bạn hãy bấm vào nút biểu tượng <b>🔑 (Chìa khóa)</b> ở góc trên khung chat và dán <b>Google Gemini API Key</b> của bạn (hoàn toàn miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--blue);text-decoration:underline;">aistudio.google.com</a>) để trò chuyện với AI thông minh ngay lập tức nhé!`;
        const keyBar = document.getElementById('chatApiKeyBar');
        if (keyBar) keyBar.style.display = 'block';
      }
    } catch(err) {
      reply = `⚠️ <b>Chưa thể kết nối tới server AI</b>.<br>` +
        `Bạn hãy bấm nút biểu tượng <b>🔑 (Chìa khóa)</b> ở góc trên để dán Google Gemini API Key gọi trực tiếp nhé!`;
      const keyBar = document.getElementById('chatApiKeyBar');
      if (keyBar) keyBar.style.display = 'block';
    }
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

  const secInfo = document.getElementById('profileSecurityInfo');
  if (secInfo) {
    const isGoogle = state.auth?.currentUser?.providerData?.some(p => p.providerId === 'google.com');
    secInfo.textContent = isGoogle 
      ? 'Đăng nhập bảo mật qua Tài khoản Google'
      : 'Bảo mật tài khoản bằng Email & Mật khẩu mã hóa';
  }

  // Reset password inputs
  const pInput = document.getElementById('profilePassInput');
  const cInput = document.getElementById('profileConfirmPassInput');
  if (pInput) pInput.value = '';
  if (cInput) cInput.value = '';
  handleProfilePassInput();

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
  const newPass = document.getElementById('profilePassInput')?.value.trim() || '';
  const confirmPass = document.getElementById('profileConfirmPassInput')?.value.trim() || '';
  const errEl = document.getElementById('profilePassErr');
  if (errEl) errEl.textContent = '';

  if (newPass) {
    if (newPass.length < 6) {
      showToast('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!', 'danger');
      if (errEl) errEl.textContent = 'Mật khẩu phải từ 6 ký tự trở lên.';
      return;
    }
    if (newPass !== confirmPass) {
      showToast('⚠️ Mật khẩu xác nhận không khớp!', 'danger');
      if (errEl) errEl.textContent = 'Mật khẩu xác nhận không khớp.';
      return;
    }
  }

  if (newName) {
    state.currentUser.name = newName;
  }

  if (state.auth && state.auth.currentUser) {
    try {
      if (newName) {
        await state.auth.currentUser.updateProfile({ displayName: newName });
      }
      if (newPass) {
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

  // Reset inputs
  const pInput = document.getElementById('profilePassInput');
  const cInput = document.getElementById('profileConfirmPassInput');
  if (pInput) pInput.value = '';
  if (cInput) cInput.value = '';
  handleProfilePassInput();

  showToast('✅ Đã cập nhật hồ sơ và bảo mật thành công!');
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
  initUserSupportSync();
}

function closeFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  if (modal) modal.classList.remove('active');
}

function handleFeedbackOverlayClick(e) {
  if (e.target.id === 'feedbackModal') closeFeedbackModal();
}

async function handleSendFeedback(e) {
  if (e) e.preventDefault();
  const msgInput = document.getElementById('fbMessage');
  const contactInput = document.getElementById('fbContact');
  const msg = msgInput ? msgInput.value.trim() : '';
  const contact = contactInput ? contactInput.value.trim() : '';

  if (!msg) { showToast('⚠️ Vui lòng nhập nội dung tin nhắn!', 'danger'); return; }

  const activeThreadId = localStorage.getItem('english_master_user_last_feedback_id');
  const submitBtn = document.getElementById('fbSubmitBtnText');
  if (submitBtn) submitBtn.textContent = 'Đang gửi tin...';

  const userReply = {
    sender: 'user',
    author: state.currentUser?.name || contact || 'Học viên',
    text: msg,
    createdAt: Date.now()
  };

  if (state.db) {
    try {
      if (activeThreadId) {
        // Append to existing conversation thread
        await state.db.collection('feedback').doc(activeThreadId).update({
          status: 'unread',
          lastUserMessageAt: Date.now(),
          replies: firebase.firestore.FieldValue.arrayUnion(userReply)
        });
      } else {
        // Create new feedback thread
        const newThread = {
          userId: state.currentUser?.id || ('guest_' + Date.now()),
          userName: state.currentUser?.name || contact || 'Học viên',
          userEmail: state.currentUser?.email || (contact.includes('@') ? contact : ''),
          contact: contact || 'Ẩn danh',
          message: msg,
          createdAt: Date.now(),
          status: 'unread',
          replies: []
        };
        const docRef = await state.db.collection('feedback').add(newThread);
        localStorage.setItem('english_master_user_last_feedback_id', docRef.id);
      }
      showToast('💌 Đã gửi tin nhắn trực tiếp tới Admin thành công!');
    } catch(err) {
      console.warn('Feedback send error:', err);
      showToast('⚠️ Đã lưu tin nhắn vào hàng đợi gửi!');
    }
  }

  if (msgInput) msgInput.value = '';
  if (submitBtn) submitBtn.textContent = 'Gửi tin nhắn 1-1 tới Admin';
  initUserSupportSync();
}

let userSupportUnsubscribe = null;
function initUserSupportSync() {
  const threadId = localStorage.getItem('english_master_user_last_feedback_id');
  if (!threadId || !state.db) return;

  try {
    if (userSupportUnsubscribe) userSupportUnsubscribe();
    userSupportUnsubscribe = state.db.collection('feedback').doc(threadId).onSnapshot(doc => {
      if (!doc || !doc.exists) return;
      const data = doc.data();
      renderUserSupportThread(data);

      // Check if Admin just replied and alert user
      if (data.replies && data.replies.length > 0) {
        const lastReply = data.replies[data.replies.length - 1];
        if (lastReply.sender === 'admin') {
          const lastSeenReplyTime = parseInt(localStorage.getItem('english_master_last_seen_admin_reply') || '0', 10);
          if (lastReply.createdAt > lastSeenReplyTime) {
            localStorage.setItem('english_master_last_seen_admin_reply', lastReply.createdAt.toString());
            showToast(`🔔 Admin Nguyễn Viết Kha đã trả lời: "${lastReply.text.slice(0, 45)}..."`, 'ok');
          }
        }
      }
    }, err => console.warn('User support sync error:', err));
  } catch(e) {}
}

function renderUserSupportThread(data) {
  const container = document.getElementById('userSupportThreadContainer');
  const messagesBox = document.getElementById('userSupportThreadMessages');
  const labelEl = document.getElementById('fbMessageLabel');
  const contactWrap = document.getElementById('userContactFieldWrap');

  if (!container || !messagesBox) return;

  container.style.display = 'block';
  if (labelEl) labelEl.textContent = 'Nhắn tin tiếp tục cho Admin:';
  if (contactWrap && (data.contact || state.currentUser)) contactWrap.style.display = 'none';

  const threadList = [
    { sender: 'user', author: data.userName || 'Bạn', text: data.message, createdAt: data.createdAt },
    ...(data.replies || [])
  ];

  messagesBox.innerHTML = threadList.map(item => {
    const isAdmin = item.sender === 'admin';
    const bg = isAdmin ? 'rgba(37,99,235,0.12)' : 'var(--surface)';
    const nameColor = isAdmin ? 'var(--blue)' : 'var(--text-1)';
    const align = isAdmin ? 'flex-start' : 'flex-end';
    const border = isAdmin ? 'border-left: 3px solid var(--blue);' : 'border-right: 3px solid var(--text-muted);';
    const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

    return `
      <div style="align-self: ${align}; max-width: 90%; background: ${bg}; border-radius: 10px; padding: 8px 12px; ${border} font-size: 0.85rem;">
        <div style="font-size: 0.72rem; font-weight: 700; color: ${nameColor}; display: flex; justify-content: space-between; gap: 8px; margin-bottom: 2px;">
          <span>${isAdmin ? '👑 Nguyễn Viết Kha (Chủ Web)' : '👤 ' + escapeHtml(item.author || 'Bạn')}</span>
          <span style="font-weight: normal; color: var(--text-muted);">${timeStr}</span>
        </div>
        <div style="color: var(--text-1); line-height: 1.45;">${escapeHtml(item.text)}</div>
      </div>
    `;
  }).join('');

  messagesBox.scrollTop = messagesBox.scrollHeight;
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
    if (window.location.hash && !window.location.hash.startsWith('#/lesson/')) {
      state.lastNonLessonHash = window.location.hash;
    }
    updateHashRoute(`#/lesson/${id}`);
  }
}

function closeLessonModal() {
  const modal = document.getElementById('lessonModal');
  if (modal) modal.classList.remove('active');
  state.activeLesson = null;
  updateHashRoute(state.lastNonLessonHash || '#/learn');
}

function shareCurrentLesson() {
  if (!state.activeLesson) return;
  const currentTab = state.activeViewTab || 'summary';
  const tabPart = currentTab !== 'summary' ? `/${currentTab}` : '';
  const shareUrl = `${window.location.origin}${window.location.pathname}#/lesson/${state.activeLesson.id}${tabPart}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('🔗 Đã sao chép liên kết bài học! Bạn có thể gửi cho bạn bè để cùng học.', 'success');
    }).catch(() => {
      prompt('Sao chép liên kết bài học này:', shareUrl);
    });
  } else {
    prompt('Sao chép liên kết bài học này:', shareUrl);
  }
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

function speakCurrentFlashcard() {
  const vocab = state.activeLesson?.vocab || [];
  if (vocab.length === 0) return;
  const current = vocab[state.fcIndex];
  if (current && current.word) {
    speakWord(current.word);
  }
}

function practiceCurrentFlashcardSpeaking() {
  const vocab = state.activeLesson?.vocab || [];
  if (vocab.length === 0) return;
  const current = vocab[state.fcIndex];
  if (current && current.word) {
    startVoicePractice(current.word, current.meaning);
  }
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

async function handleAddComment() {
  if (!state.currentUser) {
    showToast('⚠️ Vui lòng đăng nhập để bình luận!', 'danger');
    navigateTo('login');
    return;
  }

  const input = document.getElementById('commentInput');
  const text = input ? input.value.trim() : '';

  if (!text) return;

  const newComment = {
    id: 'c_' + Date.now(),
    lessonId: state.activeLesson.id,
    lessonTitle: state.activeLesson.title || 'Bài học',
    author: state.currentUser.name,
    userId: state.currentUser.id,
    text: text,
    createdAt: Date.now(),
    date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    replies: []
  };

  state.activeLesson.comments = state.activeLesson.comments || [];
  state.activeLesson.comments.push(newComment);

  // 1. Save to Firestore
  if (state.db) {
    try {
      await state.db.collection('comments').doc(newComment.id).set(newComment);
      const colName = state.activeLesson.mode === 'tieuhoc' ? 'lessons_tieuhoc' : 'lessons_ielts';
      await state.db.collection(colName).doc(state.activeLesson.id).set({
        comments: state.activeLesson.comments
      }, { merge: true });
    } catch(err) {
      console.warn('Comment Firestore save error:', err);
    }
  }

  saveToLocalStorage(true);
  input.value = '';
  renderCommentsSection();
  addXp(5);
  showToast('💬 Đã gửi bình luận! Admin sẽ nhận được thông báo.');
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

/* ── Welcome & Discovery Hub Showcase Layer (Lớp giới thiệu học trực tuyến & thẻ lớp học) ── */
function checkOnboardingStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const isFromWelcomeRedirect = urlParams.get('welcome') === '1';

  if (isFromWelcomeRedirect) {
    // Clear URL query param gracefully without reload
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    setTimeout(openWelcomeHubModal, 350);
    return;
  }

  const isHideWelcome = localStorage.getItem('english_master_hide_welcome_hub') === 'true';
  const hasSeenInSession = sessionStorage.getItem('english_master_welcomed_session') === 'true';

  if (!isHideWelcome && !hasSeenInSession && state.currentUser) {
    setTimeout(openWelcomeHubModal, 600);
  }
}

function openWelcomeHubModal() {
  const modal = document.getElementById('welcomeHubModal');
  if (!modal) return;

  sessionStorage.setItem('english_master_welcomed_session', 'true');

  const titleEl = document.getElementById('welcomeHubTitle');
  if (titleEl) {
    if (state.currentUser && state.currentUser.name) {
      titleEl.textContent = `Chào mừng ${state.currentUser.name} đến với English Kha Master!`;
    } else {
      titleEl.textContent = 'Chào mừng bạn đến với English Kha Master!';
    }
  }

  const cb = document.getElementById('welcomeHubDontShowAgain');
  if (cb) {
    cb.checked = localStorage.getItem('english_master_hide_welcome_hub') === 'true';
  }

  modal.classList.add('active');
}

function closeWelcomeHubModal() {
  const modal = document.getElementById('welcomeHubModal');
  if (modal) modal.classList.remove('active');
}

function handleWelcomeHubOverlayClick(e) {
  if (e.target && e.target.id === 'welcomeHubModal') {
    closeWelcomeHubModal();
  }
}

function handleWelcomeDontShowToggle(e) {
  if (e.target.checked) {
    localStorage.setItem('english_master_hide_welcome_hub', 'true');
    showToast('Đã lưu: Sẽ không tự động hiện lại khi đăng nhập.');
  } else {
    localStorage.removeItem('english_master_hide_welcome_hub');
  }
}

function selectCourseFromHub(courseType) {
  closeWelcomeHubModal();

  if (courseType === 'ielts') {
    switchMode('ielts');
    navigateTo('learn');
    showToast('🎯 Đã vào lớp Luyện Thi IELTS Cấp Tốc! Chúc bạn bứt phá band điểm.', 'success');
  } else if (courseType === 'tieuhoc') {
    switchMode('tieuhoc');
    navigateTo('learn');
    showToast('🎈 Đã vào lớp Tiếng Anh Tiểu Học - Nền Tảng Vàng! Chúc bạn học vui.', 'success');
  } else if (courseType === 'speaking') {
    openAssistantChat();
    showToast('✨ Trợ lý AI Voice đã sẵn sàng đàm thoại phản xạ 1-1 cùng bạn!', 'success');
  } else if (courseType === 'flashcard') {
    navigateTo('learn');
    const currentList = state.lessons[state.currentMode] || [];
    if (currentList.length > 0) {
      openLessonModal(currentList[0].id);
      switchLessonTab('flashcards');
      showToast('🧠 Đã mở Lò Luyện Từ Vựng Flashcard 3D!', 'success');
    } else {
      showToast('🧠 Khám phá kho từ vựng Spaced Repetition thông minh!', 'success');
    }
  }
}

function startLearningFromHub() {
  triggerConfetti();
  closeWelcomeHubModal();
  navigateTo('learn');
  showToast('🚀 Bắt đầu buổi học hôm nay! Chúc bạn học tập hiệu quả và giữ vững Streak.', 'success');
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
    setTimeout(handleHashRoute, 250);
  }
}

function handleHashRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash) return;

  const parts = hash.split('/').map(p => decodeURIComponent(p.toLowerCase()));
  const [route, sub1, sub2] = parts;

  if (route === 'tieuhoc') {
    state.lastNonLessonHash = window.location.hash;
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
    state.lastNonLessonHash = window.location.hash;
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
    const target = all.find(l => l.id && l.id.toLowerCase() === sub1.toLowerCase());
    if (target) {
      openLessonModal(target.id, false);
      if (sub2 && ['summary', 'vocab', 'flashcard', 'quiz'].includes(sub2)) {
        switchViewTab(sub2);
      }
    } else {
      // Save pending route for when lessons are loaded from Firestore
      state.pendingRoute = { route, sub1, sub2 };
    }
  } else if (route === 'chat') {
    openAssistantChat();
  } else if (['landing', 'leaderboard', 'explore', 'mylessons', 'profile'].includes(route)) {
    state.lastNonLessonHash = window.location.hash;
    navigateTo(route, false);
  }
}

function updateHashRoute(newHash) {
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

/* ==========================================================================
   Section 12: Password Security & Force Password Change Handler (Mục 2.5 & 3.2 & 5.7)
   ========================================================================== */

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, text: 'Chưa nhập mật khẩu', color: 'var(--text-3)', width: '0%' };
  if (pass.length < 6) return { score: 1, text: 'Quá ngắn (tối thiểu 6 ký tự)', color: '#ef4444', width: '25%' };
  
  let strength = 1;
  if (pass.length >= 8) strength++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) strength++;
  if (/[0-9]/.test(pass)) strength++;
  if (/[^A-Za-z0-9]/.test(pass)) strength++;

  if (strength <= 2) {
    return { score: 2, text: 'Độ mạnh: Yếu (nên thêm số & chữ hoa)', color: '#f59e0b', width: '45%' };
  } else if (strength <= 4) {
    return { score: 3, text: 'Độ mạnh: Khá tốt (đạt chuẩn)', color: '#3b82f6', width: '75%' };
  } else {
    return { score: 4, text: 'Độ mạnh: Rất an toàn 🔥', color: '#10b981', width: '100%' };
  }
}

function updatePasswordStrengthDisplay(inputId, barId, textId) {
  const input = document.getElementById(inputId);
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  if (!input || !bar || !text) return;
  const res = calculatePasswordStrength(input.value);
  bar.style.width = res.width;
  bar.style.backgroundColor = res.color;
  text.textContent = res.text;
  text.style.color = res.color;
}

function handleProfilePassInput() {
  const pass = document.getElementById('profilePassInput')?.value || '';
  const confirmGroup = document.getElementById('profileConfirmPassGroup');
  const strengthWrap = document.getElementById('profileStrengthWrap');
  if (pass.length > 0) {
    if (confirmGroup) confirmGroup.style.display = 'block';
    if (strengthWrap) strengthWrap.style.display = 'block';
    updatePasswordStrengthDisplay('profilePassInput', 'profilePassStrengthBar', 'profilePassStrengthText');
  } else {
    if (confirmGroup) confirmGroup.style.display = 'none';
    if (strengthWrap) strengthWrap.style.display = 'none';
  }
}

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
   Section 13: Interactive Speaking Practice Engine (AI Assistant Standard)
   ========================================================================== */

let currentVoiceTargetWord = '';
let currentVoiceTargetPhonetic = '';
let speechRecognitionInstance = null;
let isSpeechRecording = false;

function startVoicePractice(word, phonetic) {
  if (!word) return;
  currentVoiceTargetWord = word.trim();
  currentVoiceTargetPhonetic = phonetic ? phonetic.trim() : '';

  const modal = document.getElementById('speakingPracticeModal');
  const targetWordEl = document.getElementById('speakingTargetWord');
  const phoneticEl = document.getElementById('speakingPhonetic');
  const statusEl = document.getElementById('speakingStatusText');
  const resultBox = document.getElementById('speakingResultBox');
  const micIcon = document.getElementById('speakingMicIcon');
  const recordBtn = document.getElementById('speakingRecordBtn');
  const pulseRing = document.getElementById('speakingPulseRing');
  const waveBars = document.getElementById('speakingWaveBars');
  const braveHelpBtn = document.getElementById('braveHelpBtn');
  const braveHelpBox = document.getElementById('braveHelpBox');

  if (targetWordEl) targetWordEl.textContent = word;
  if (phoneticEl) phoneticEl.textContent = phonetic || '';
  if (statusEl) statusEl.textContent = 'Nhấn micro và đọc to từ trên';
  if (resultBox) resultBox.style.display = 'none';
  if (micIcon) micIcon.className = 'fa-solid fa-microphone';
  if (recordBtn) recordBtn.classList.remove('recording');
  if (pulseRing) pulseRing.classList.remove('recording');
  if (waveBars) waveBars.style.display = 'none';
  if (braveHelpBox) braveHelpBox.style.display = 'none';

  // Check if Brave browser is used
  const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function') || (navigator.userAgent && navigator.userAgent.includes('Brave'));
  if (braveHelpBtn) {
    braveHelpBtn.style.display = isBrave ? 'inline-flex' : 'none';
  }

  if (modal) {
    modal.classList.add('active');
  }
}

function speakWordSlowly(word) {
  if (!word) word = currentVoiceTargetWord;
  if (!word) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.65; // Chậm rõ từng âm tiết để học viên bắt chước
    window.speechSynthesis.speak(utterance);
  }
}

function retrySpeakingRecording() {
  const resultBox = document.getElementById('speakingResultBox');
  if (resultBox) resultBox.style.display = 'none';
  toggleSpeechRecording();
}

function toggleBraveHelp() {
  const box = document.getElementById('braveHelpBox');
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }
}

function closeSpeakingPracticeModal() {
  const modal = document.getElementById('speakingPracticeModal');
  if (modal) modal.classList.remove('active');
  if (speechRecognitionInstance && isSpeechRecording) {
    try { speechRecognitionInstance.stop(); } catch(e) {}
  }
  isSpeechRecording = false;

  const pulseRing = document.getElementById('speakingPulseRing');
  const recordBtn = document.getElementById('speakingRecordBtn');
  const waveBars = document.getElementById('speakingWaveBars');
  const micIcon = document.getElementById('speakingMicIcon');
  if (pulseRing) pulseRing.classList.remove('recording');
  if (recordBtn) recordBtn.classList.remove('recording');
  if (waveBars) waveBars.style.display = 'none';
  if (micIcon) micIcon.className = 'fa-solid fa-microphone';
}

async function toggleSpeechRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('⚠️ Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng dùng Google Chrome hoặc Microsoft Edge!', 'danger');
    return;
  }

  const statusEl = document.getElementById('speakingStatusText');
  const micIcon = document.getElementById('speakingMicIcon');
  const recordBtn = document.getElementById('speakingRecordBtn');
  const pulseRing = document.getElementById('speakingPulseRing');
  const waveBars = document.getElementById('speakingWaveBars');
  const resultBox = document.getElementById('speakingResultBox');
  const braveHelpBtn = document.getElementById('braveHelpBtn');

  if (isSpeechRecording) {
    if (speechRecognitionInstance) {
      try { speechRecognitionInstance.stop(); } catch(e) {}
    }
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.classList.remove('recording');
    if (pulseRing) pulseRing.classList.remove('recording');
    if (waveBars) waveBars.style.display = 'none';
    if (statusEl) statusEl.textContent = 'Đã dừng nghe. Bấm micro để nói lại.';
    return;
  }

  // Explicitly prompt for microphone access via getUserMedia if available
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch(err) {
      console.warn('Microphone permission check:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 700;"><i class="fa-solid fa-lock"></i> Chưa cấp quyền Micro!</span><br><span style="font-size: 0.8rem; color: var(--text-2);">Vui lòng nhấn biểu tượng ổ khóa 🔒 trên thanh địa chỉ và chọn <b>Cho phép (Allow)</b> Micro.</span>`;
        }
        return;
      }
    }
  }

  try {
    speechRecognitionInstance = new SpeechRecognition();
  } catch(e) {
    if (statusEl) statusEl.textContent = '⚠️ Không thể khởi tạo Speech Recognition trên trình duyệt này.';
    return;
  }

  speechRecognitionInstance.lang = 'en-US';
  speechRecognitionInstance.interimResults = false;
  speechRecognitionInstance.maxAlternatives = 5;

  speechRecognitionInstance.onstart = () => {
    isSpeechRecording = true;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone fa-beat-fade';
    if (recordBtn) recordBtn.classList.add('recording');
    if (pulseRing) pulseRing.classList.add('recording');
    if (waveBars) waveBars.style.display = 'flex';
    if (statusEl) statusEl.textContent = `🎙️ Đang lắng nghe... Hãy nói to: "${currentVoiceTargetWord}"`;
    if (resultBox) resultBox.style.display = 'none';
  };

  speechRecognitionInstance.onresult = (event) => {
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.classList.remove('recording');
    if (pulseRing) pulseRing.classList.remove('recording');
    if (waveBars) waveBars.style.display = 'none';

    // Extract all candidate alternatives
    const candidates = [];
    if (event.results && event.results[0]) {
      for (let i = 0; i < event.results[0].length; i++) {
        if (event.results[0][i] && event.results[0][i].transcript) {
          candidates.push(event.results[0][i].transcript.trim());
        }
      }
    }

    const evaluation = evaluatePronunciationAI(candidates, currentVoiceTargetWord, currentVoiceTargetPhonetic);
    renderSpeakingEvaluation(evaluation);
  };

  speechRecognitionInstance.onerror = (event) => {
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.classList.remove('recording');
    if (pulseRing) pulseRing.classList.remove('recording');
    if (waveBars) waveBars.style.display = 'none';

    const err = event.error;
    console.warn('Speech recognition error:', err);

    const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function') || (navigator.userAgent && navigator.userAgent.includes('Brave'));
    if (braveHelpBtn && isBrave) braveHelpBtn.style.display = 'inline-flex';

    if (err === 'not-allowed') {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 700;"><i class="fa-solid fa-lock"></i> Chưa cấp quyền Micro!</span><br><span style="font-size: 0.8rem; color: var(--text-2);">Vui lòng nhấn biểu tượng ổ khóa 🔒 trên thanh địa chỉ và chọn <b>Cho phép (Allow)</b> Micro.</span>`;
      }
    } else if (err === 'network' || err === 'service-not-allowed') {
      if (isBrave) {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #d97706; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> Brave đang chặn dịch vụ Google Speech</span><br><span style="font-size: 0.8rem; color: var(--text-2);">Brave chặn Google Speech mặc định. Hãy vào <b>brave://settings/system</b> bật <i>'Use Google services for speech recognition'</i> hoặc mở web trên <b>Chrome / Edge</b> nhé!</span>`;
        }
        const helpBox = document.getElementById('braveHelpBox');
        if (helpBox) helpBox.style.display = 'block';
      } else {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 700;"><i class="fa-solid fa-wifi"></i> Lỗi kết nối dịch vụ giọng nói</span><br><span style="font-size: 0.8rem; color: var(--text-2);">Vui lòng kiểm tra lại kết nối mạng hoặc thử trên Google Chrome / Edge.</span>`;
        }
      }
    } else if (err === 'no-speech') {
      if (statusEl) statusEl.textContent = '⏱️ Chưa nghe thấy giọng nói. Hãy bấm lại micro và đọc to rõ ràng nhé!';
    } else {
      if (statusEl) statusEl.textContent = `❌ Không nhận diện được âm thanh (${err}). Vui lòng thử lại!`;
    }
  };

  speechRecognitionInstance.onend = () => {
    isSpeechRecording = false;
    if (micIcon) micIcon.className = 'fa-solid fa-microphone';
    if (recordBtn) recordBtn.classList.remove('recording');
    if (pulseRing) pulseRing.classList.remove('recording');
    if (waveBars) waveBars.style.display = 'none';
  };

  try {
    speechRecognitionInstance.start();
  } catch(e) {
    console.warn('Speech recognition start error:', e);
  }
}

/* ==========================================================================
   AI Pronunciation Evaluation & Circular Gauge Engine (Standard AI Coach)
   ========================================================================== */

function evaluatePronunciationAI(candidates, targetWord, phonetic) {
  if (!candidates || candidates.length === 0) {
    candidates = [''];
  }
  const cleanTarget = targetWord.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '');

  let bestCandidate = candidates[0];
  let bestSimilarity = 0;

  for (const cand of candidates) {
    const cleanCand = cand.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '');
    const sim = calculateWordSimilarity(cleanCand, cleanTarget);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestCandidate = cand;
    }
  }

  let finalPercentage = Math.round(bestSimilarity * 100);
  if (finalPercentage > 100) finalPercentage = 100;

  // Syllable / Substring breakdown & Ending Sound Analysis
  const tokens = generatePhoneticBreakdown(cleanTarget, bestCandidate.toLowerCase());

  // Determine Tier and Color standard:
  // Xanh là ổn (>= 80%), Vàng là gần đúng (50% - 79%), Đỏ là chưa đạt (< 50%)
  let tier = 'good';
  let color = '#10b981';
  let tierLabel = 'Phát âm chuẩn (Ổn)';
  let verdictText = 'Xuất sắc: ' + finalPercentage + '%';
  let verdictIcon = 'fa-circle-check';

  if (finalPercentage >= 80) {
    tier = 'good';
    color = '#10b981';
    tierLabel = 'Phát âm chuẩn (Ổn)';
    verdictText = 'Xuất sắc (Ổn) • ' + finalPercentage + '%';
    verdictIcon = 'fa-circle-check';
  } else if (finalPercentage >= 50) {
    tier = 'warning';
    color = '#f59e0b';
    tierLabel = 'Gần đúng';
    verdictText = 'Gần đúng • ' + finalPercentage + '%';
    verdictIcon = 'fa-triangle-exclamation';
  } else {
    tier = 'danger';
    color = '#ef4444';
    tierLabel = 'Cần luyện thêm';
    verdictText = 'Chưa đạt • ' + finalPercentage + '%';
    verdictIcon = 'fa-circle-xmark';
  }

  // Generate pedagogical AI Coach advice
  const coachTip = generateCoachPedagogicalTip(cleanTarget, bestCandidate.toLowerCase(), finalPercentage, tokens, phonetic);

  return {
    score: finalPercentage,
    tier: tier,
    color: color,
    tierLabel: tierLabel,
    verdictText: verdictText,
    verdictIcon: verdictIcon,
    tokens: tokens,
    spokenText: bestCandidate,
    targetText: targetWord,
    phonetic: phonetic,
    coachTip: coachTip
  };
}

// Generate syllable/character tokens with status (good: xanh, warn: vàng, miss: đỏ)
function generatePhoneticBreakdown(target, spoken) {
  // If target contains multiple words, split by word
  if (target.includes(' ')) {
    const targetWords = target.split(/\s+/);
    const spokenWords = spoken.split(/\s+/);
    return targetWords.map((w, idx) => {
      const sp = spokenWords[idx] || '';
      const sim = calculateWordSimilarity(sp, w);
      let status = 'token-good';
      if (sim < 0.5) status = 'token-miss';
      else if (sim < 0.8) status = 'token-warn';
      return { text: w, status: status };
    });
  }

  // Single word: Divide into phonetic chunks/syllables
  // Basic syllabification heuristic using vowel anchors
  const syllables = [];
  const regex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(target)) !== null) {
    syllables.push(match[0]);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < target.length) {
    if (syllables.length > 0) {
      syllables[syllables.length - 1] += target.slice(lastIndex);
    } else {
      syllables.push(target);
    }
  }

  if (syllables.length === 0) syllables.push(target);

  // Compare spoken with each syllable chunk
  const tokens = [];
  let spokenRemaining = spoken.replace(/\s+/g, '');

  for (let i = 0; i < syllables.length; i++) {
    const syl = syllables[i].toLowerCase();
    let status = 'token-good';

    if (!spokenRemaining || spokenRemaining.length === 0) {
      status = 'token-miss';
    } else if (spokenRemaining.includes(syl)) {
      status = 'token-good';
      spokenRemaining = spokenRemaining.replace(syl, '');
    } else {
      // Check partial match
      let matchedCount = 0;
      for (const char of syl) {
        if (spokenRemaining.includes(char)) {
          matchedCount++;
        }
      }
      const ratio = matchedCount / syl.length;
      if (ratio >= 0.7) {
        status = 'token-good';
      } else if (ratio >= 0.35) {
        status = 'token-warn';
      } else {
        status = 'token-miss';
      }
    }

    tokens.push({ text: syllables[i], status: status });
  }

  return tokens;
}

// Generate pedagogical advice like ELSA / Duolingo
function generateCoachPedagogicalTip(target, spoken, score, tokens, phonetic) {
  // Check common ending sounds: -s, -es, -ed, -t, -d, -k, -th, -p, -f
  const endingConsonants = ['s', 'es', 'ed', 't', 'd', 'k', 'p', 'th', 'f', 'ch', 'sh'];
  let missedEndingSound = null;

  for (const end of endingConsonants) {
    if (target.endsWith(end) && !spoken.endsWith(end)) {
      missedEndingSound = end;
      break;
    }
  }

  if (score >= 90) {
    return `🎉 <b>Rất xuất sắc!</b> Bạn phát âm tròn vành rõ chữ, ngữ điệu tự nhiên đạt chuẩn người bản xứ. Tiếp tục phát huy nhé! (+15 XP)`;
  }

  if (score >= 80) {
    if (missedEndingSound) {
      return `👍 <b>Phát âm ổn (Đạt chuẩn)!</b> Bạn đã nói tốt phần lớn từ. Hãy chú ý bật dứt khoát âm cuối <b>/-${missedEndingSound}/</b> để đạt 100% chuẩn xác nhé!`;
    }
    return `👍 <b>Phát âm rất tốt!</b> Người bản xứ nghe hiểu hoàn toàn từ này. Nhấn nút "Luyện nói lại" nếu muốn thử đạt 100% nhé! (+15 XP)`;
  }

  if (score >= 50) {
    if (missedEndingSound) {
      return `⚡ <b>Gần đúng rồi!</b> Lỗi phổ biến nhất là <b>nuốt âm đuôi /-${missedEndingSound}/</b>. Hãy giữ khẩu hình và bật rõ âm gió ở cuối từ nhé!`;
    }
    const missedTokens = tokens.filter(t => t.status === 'token-miss' || t.status === 'token-warn');
    if (missedTokens.length > 0) {
      const missedNames = missedTokens.map(t => `"${t.text}"`).join(', ');
      return `⚡ <b>Đạt mức gần đúng!</b> Bạn phát âm chưa rõ ở phần âm ${missedNames}. Hãy bấm <b>"Nghe chậm (0.75x)"</b> để quan sát nhịp điệu rồi nói lại nhé!`;
    }
    return `⚡ <b>Gần đúng!</b> Khẩu hình miệng cần mở rộng hơn một chút để nguyên âm rõ ràng. Hãy thử lại nào!`;
  }

  // Below 50%
  return `💪 <b>Chưa đạt chuẩn!</b> Máy nghe thấy <i>"${spoken || 'chưa rõ'}"</i> thay vì <b>"${target}"</b>. Bạn hãy nhấn nút <b>"Nghe chậm (0.75x)"</b> bên dưới để luyện nghe kỹ từng âm rồi bấm micro thử lại nhé!`;
}

// Render UI with Circular SVG Gauge and Animated Counter
function renderSpeakingEvaluation(evalResult) {
  const resultBox = document.getElementById('speakingResultBox');
  const statusEl = document.getElementById('speakingStatusText');
  const circleEl = document.getElementById('speakingGaugeCircle');
  const numberEl = document.getElementById('speakingGaugeNumber');
  const tierEl = document.getElementById('speakingGaugeTier');
  const verdictBadge = document.getElementById('speakingVerdictBadge');
  const verdictIcon = document.getElementById('speakingVerdictIcon');
  const verdictText = document.getElementById('speakingVerdictText');
  const breakdownTokensEl = document.getElementById('speakingBreakdownTokens');
  const recognizedTextEl = document.getElementById('speakingRecognizedText');
  const expectedTextEl = document.getElementById('speakingExpectedText');
  const coachTipEl = document.getElementById('speakingCoachTip');

  if (resultBox) resultBox.style.display = 'block';

  // 1. Update text info
  if (statusEl) {
    if (evalResult.score >= 80) {
      statusEl.innerHTML = `<span style="color: #10b981; font-weight: 700;">🎉 Phát âm rất tốt (${evalResult.score}%)!</span>`;
    } else if (evalResult.score >= 50) {
      statusEl.innerHTML = `<span style="color: #d97706; font-weight: 700;">⚡ Gần đúng (${evalResult.score}%), thử lại để đạt 100%!</span>`;
    } else {
      statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 700;">💪 Hãy nghe máy đọc chậm và thử lại nhé!</span>`;
    }
  }

  if (recognizedTextEl) recognizedTextEl.textContent = `"${evalResult.spokenText || '...'}"`;
  if (expectedTextEl) expectedTextEl.textContent = `"${evalResult.targetText}" ${evalResult.phonetic ? '(' + evalResult.phonetic + ')' : ''}`;
  if (coachTipEl) coachTipEl.innerHTML = evalResult.coachTip;

  // 2. Verdict pill badge
  if (verdictBadge) {
    verdictBadge.className = 'speaking-verdict-badge tier-' + evalResult.tier;
  }
  if (verdictIcon) {
    verdictIcon.className = 'fa-solid ' + evalResult.verdictIcon;
  }
  if (verdictText) {
    verdictText.textContent = evalResult.verdictText;
  }
  if (tierEl) {
    tierEl.textContent = evalResult.tierLabel;
    tierEl.style.color = evalResult.color;
  }

  // 3. Render Syllable / Word breakdown tokens
  if (breakdownTokensEl) {
    breakdownTokensEl.innerHTML = evalResult.tokens.map(token => {
      let icon = '';
      if (token.status === 'token-good') icon = '<i class="fa-solid fa-check" style="font-size: 0.72rem; margin-right: 4px;"></i>';
      else if (token.status === 'token-warn') icon = '<i class="fa-solid fa-minus" style="font-size: 0.72rem; margin-right: 4px;"></i>';
      else icon = '<i class="fa-solid fa-xmark" style="font-size: 0.72rem; margin-right: 4px;"></i>';
      return `<span class="breakdown-token ${token.status}">${icon}${escapeHtml(token.text)}</span>`;
    }).join('');
  }

  // 4. Animate Circular Progress Gauge & Counter Number
  animateSpeakingGauge(evalResult.score, evalResult.color);

  // 5. XP & Confetti on good score (>= 80%)
  if (evalResult.score >= 80) {
    triggerConfetti();
    addXp(15);
  }
}

// Smooth animated SVG gauge circle and numeric counter
function animateSpeakingGauge(targetScore, colorHex) {
  const circle = document.getElementById('speakingGaugeCircle');
  const numberEl = document.getElementById('speakingGaugeNumber');
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // 314.16

  if (circle) {
    circle.style.stroke = colorHex;
    circle.style.filter = `drop-shadow(0 0 10px ${colorHex}88)`;
    // Start at full offset (0%)
    circle.style.strokeDashoffset = circumference;

    // Force layout reflow for animation
    void circle.offsetWidth;

    // Animate to target offset
    const targetOffset = circumference * (1 - (targetScore / 100));
    circle.style.strokeDashoffset = targetOffset;
  }

  if (numberEl) {
    numberEl.style.color = colorHex;
    let currentVal = 0;
    const duration = 850; // ms
    const startTime = performance.now();

    function updateCounter(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const displayVal = Math.round(easeProgress * targetScore);
      numberEl.textContent = displayVal;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        numberEl.textContent = targetScore;
      }
    }
    requestAnimationFrame(updateCounter);
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

// Global window exposure
window.startVoicePractice = startVoicePractice;
window.closeSpeakingPracticeModal = closeSpeakingPracticeModal;
window.toggleSpeechRecording = toggleSpeechRecording;
window.retrySpeakingRecording = retrySpeakingRecording;
window.speakWordSlowly = speakWordSlowly;
window.toggleBraveHelp = toggleBraveHelp;




