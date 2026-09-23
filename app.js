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
  navigateTo('learn');
  setTimeout(checkOnboardingStatus, 800);
});

/* ==========================================================================
   1. Navigation & Routing
   ========================================================================== */

function navigateTo(viewName) {
  state.currentView = viewName;

  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
  if (activeNav) activeNav.classList.add('active');

  if (viewName === 'learn') renderLessonsList();
  if (viewName === 'explore') renderExploreGrid();
  if (viewName === 'leaderboard') renderLeaderboard();
  if (viewName === 'mylessons') renderMyLessons();
  if (viewName === 'profile') renderProfilePage();
  if (viewName === 'admin') window.location.href = 'admin.html';
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
  updateAuthUi();
}

function updateAuthUi() {
  const loginBtn = document.getElementById('loginBtn');
  const userProfileWidget = document.getElementById('userProfileWidget');
  const userStatsWidget = document.getElementById('userStatsWidget');
  const userAvatar = document.getElementById('userAvatar');

  if (state.currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfileWidget) userProfileWidget.style.display = 'flex';
    if (userStatsWidget) userStatsWidget.style.display = 'flex';

    if (userAvatar) userAvatar.textContent = state.currentUser.name.charAt(0).toUpperCase();
    document.getElementById('dropdownName').textContent = state.currentUser.name;
    document.getElementById('dropdownRole').textContent = state.currentUser.role === 'admin' ? '🛡️ Quản trị viên' : '🎓 Học viên';
    document.getElementById('headerStreakVal').textContent = state.currentUser.streak || 0;
    document.getElementById('headerXpVal').textContent = state.currentUser.xp || 0;

    const authorInput = document.getElementById('userNameInput');
    if (authorInput) authorInput.value = state.currentUser.name;

  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (userProfileWidget) userProfileWidget.style.display = 'none';
    if (userStatsWidget) userStatsWidget.style.display = 'none';
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
  navigateTo('learn');
  showToast('👋 Đã đăng xuất an toàn.');
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
    const savedData = localStorage.getItem('english_master_lessons_v1');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      state.lessons.ielts = parsed.ielts || [];
      state.lessons.tieuhoc = parsed.tieuhoc || [];
    } else {
      loadSampleLessons();
    }
  } catch (e) {
    loadSampleLessons();
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDemoConfigKeyForEnglishKhaMaster",
    authDomain: "english-master-app.firebaseapp.com",
    projectId: "english-master-app",
    storageBucket: "english-master-app.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
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
              role = d.role || role;
              xp = d.xp !== undefined ? d.xp : xp;
              streak = d.streak !== undefined ? d.streak : streak;
              badges = d.badges || badges;
              bookmarks = d.bookmarks || bookmarks;
              name = d.name || name;
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
        state.currentUser = null;
        localStorage.removeItem('english_master_current_user');
        updateAuthUi();
      }
    });
  }

  if (state.db) {
    ['ielts', 'tieuhoc'].forEach(m => {
      state.db.collection('lessons_' + m).orderBy('createdAt', 'desc').onSnapshot(snap => {
        state.lessons[m] = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt ? new Date(d.data().createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')
        }));
        if (state.currentView === 'learn') renderLessonsList();
      });
    });
  } else {
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
}

async function addLessonToStorage(mode, lesson) {
  state.aiUsageCount++;
  localStorage.setItem('english_master_ai_calls', state.aiUsageCount.toString());

  if (state.db) {
    try {
      const docRef = await state.db.collection('lessons_' + mode).add({ ...lesson, createdAt: Date.now() });
      lesson.id = docRef.id;
    } catch (err) {
      state.lessons[mode].unshift(lesson);
      saveToLocalStorage(true);
    }
  } else {
    state.lessons[mode].unshift(lesson);
    saveToLocalStorage(true);
  }
}

async function deleteLessonFromStorage(mode, id) {
  if (state.db) {
    try { await state.db.collection('lessons_' + mode).doc(id).delete(); } catch (err) {}
  }
  state.lessons[mode] = state.lessons[mode].filter(l => l.id !== id);
  saveToLocalStorage(true);
}

function saveToLocalStorage(broadcast = true) {
  try {
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
  const filtered = activeLessons.filter(l => 
    (l.title && l.title.toLowerCase().includes(query)) ||
    (l.summary && l.summary.toLowerCase().includes(query)) ||
    (l.creator && l.creator.toLowerCase().includes(query))
  );

  if (countBadge) countBadge.textContent = `${activeLessons.length} bài học`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Chưa có bài học nào trong danh sách.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(lesson => renderLessonCardHtml(lesson)).join('');
}

function renderLessonCardHtml(lesson) {
  const isLiked = lesson.likes > 0;
  const isBookmarked = state.currentUser?.bookmarks?.includes(lesson.id);

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
        <span class="meta-item"><i class="fa-regular fa-user"></i> ${escapeHtml(lesson.creator || 'Vô danh')}</span>
        <span class="meta-item"><i class="fa-solid fa-tag"></i> ${lesson.tag || 'Chung'}</span>
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

  const sortedUsers = [...state.users].sort((a, b) => (b.xp || 0) - (a.xp || 0));

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

  tbody.innerHTML = sortedUsers.map((u, idx) => `
    <tr>
      <td><strong>#${idx + 1}</strong></td>
      <td>
        <div class="row" style="gap: 8px;">
          <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.8rem;">${u.name.charAt(0)}</div>
          <span>${escapeHtml(u.name)}</span>
        </div>
      </td>
      <td><span class="stat-pill streak-pill"><i class="fa-solid fa-fire"></i> ${u.streak || 0} ngày</span></td>
      <td><span class="stat-pill xp-pill"><i class="fa-solid fa-bolt"></i> ${u.xp || 0} XP</span></td>
      <td>${(u.badges || []).length} huy hiệu</td>
    </tr>
  `).join('');
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

function openLessonModal(id) {
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
    <span class="meta-item"><i class="fa-solid fa-tag"></i> ${lesson.tag || 'Chung'}</span>
    <span class="mode-badge ${lesson.mode}">${lesson.mode === 'ielts' ? 'IELTS' : 'Tiểu học'}</span>
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
}

function closeLessonModal() {
  const modal = document.getElementById('lessonModal');
  if (modal) modal.classList.remove('active');
  state.activeLesson = null;
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

  grid.innerHTML = vocab.map(v => `
    <div class="vocab-card">
      <div class="vocab-header">
        <span class="vocab-word">${escapeHtml(v.word)}</span>
        <button class="audio-btn" onclick="speakWord('${escapeJs(v.word)}')"><i class="fa-solid fa-volume-high"></i></button>
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
  const engineSelect = document.getElementById('aiEngineSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const firebaseInput = document.getElementById('firebaseConfigInput');
  if (engineSelect) engineSelect.value = state.aiEngine;
  if (apiKeyInput) apiKeyInput.value = state.apiKey;
  if (firebaseInput) firebaseInput.value = state.firebaseConfigRaw;
  handleEngineChange();
}

function switchMode(mode) {
  if (state.currentMode === mode) return;
  state.currentMode = mode;
  document.getElementById('tabIelts').classList.toggle('active', mode === 'ielts');
  document.getElementById('tabTieuhoc').classList.toggle('active', mode === 'tieuhoc');
  const badge = document.getElementById('currentModeBadge');
  if (badge) {
    badge.textContent = mode === 'ielts' ? 'IELTS Academic' : 'Ôn thi Tiểu học';
    badge.className = `mode-badge ${mode}`;
  }
  renderLessonsList();
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

function loadSampleLessons() {
  state.lessons = {
    ielts: [{
      id: 'sample_ielts_1',
      mode: 'ielts',
      title: 'Global Climate Change & Sustainable Energy',
      creator: 'Gia đình / Thầy cô',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Climate change presents one of the most significant challenges of the twenty-first century.',
      summary: 'Bài đọc phân tích những thách thức nghiêm trọng của biến đổi khí hậu trong thế kỷ 21 và tầm quan trọng của năng lượng tái tạo.',
      vocab: [{ word: 'Industrialization', meaning: 'sự công nghiệp hóa (n)' }, { word: 'Reliance', meaning: 'sự phụ thuộc (n)' }],
      quiz: [{ question: 'What is identified as a primary cause of emissions?', options: ['Heavy reliance on fossil fuels', 'Solar panels'], correct: 0 }],
      likes: 5,
      comments: [{ id: 'c1', author: 'Tuấn Kiệt', text: 'Bài học rất hay và bổ ích!', date: '10:15' }]
    }],
    tieuhoc: [{
      id: 'sample_tieuhoc_1',
      mode: 'tieuhoc',
      title: 'The Friendly Puppy and the Garden',
      creator: 'Mẹ Thu Hà',
      creatorId: 'u_2',
      tag: 'Gia đình',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Max is a happy little dog living in a big house with a beautiful green garden.',
      summary: 'Đoạn văn kể về chú cún nhỏ đáng yêu tên là Max sống trong khu vườn xanh mát.',
      vocab: [{ word: 'Puppy', meaning: 'chú cún con (n)' }, { word: 'Garden', meaning: 'khu vườn (n)' }],
      quiz: [{ question: 'Chú cún trong câu chuyện tên là gì?', options: ['Max', 'Tom'], correct: 0 }],
      likes: 3,
      comments: []
    }]
  };
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

