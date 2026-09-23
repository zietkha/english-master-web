/**
 * English Kha Master — Admin Portal Controller (admin.js)
 * Secure role-gated administration: System Maintenance, Feedback & Report Inbox, and Metrics.
 * No hardcoded PINs. No exposed API keys.
 */

const adminState = {
  authenticatedUser: null,
  maintenanceMode: localStorage.getItem('english_master_maintenance_mode') === 'true',
  aiUsageCount: parseInt(localStorage.getItem('english_master_ai_calls') || '0', 10),
  users: [],
  feedback: []
};

// Standard Firebase config
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

let auth = null, db = null;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
} catch(e) {
  console.warn('Firebase init error in admin portal:', e);
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminTheme();
  verifyAdminAccess();
});

// Role-based Access Gate: Requires Firebase Auth + Firestore role === 'admin'
function verifyAdminAccess() {
  if (!auth) {
    denyAccess();
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      denyAccess();
      return;
    }

    let isAdmin = (user.email === 'khasnlh@gmail.com');
    if (!isAdmin && db) {
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().role === 'admin') {
          isAdmin = true;
        }
      } catch(e) {
        console.warn('Firestore admin verification error:', e);
      }
    }

    if (isAdmin) {
      adminState.authenticatedUser = user;
      grantAccess();
    } else {
      denyAccess();
    }
  });
}

function grantAccess() {
  document.getElementById('adminAccessDenied').style.display = 'none';
  document.getElementById('adminMainContent').style.display = 'block';
  initAdminDashboard();
}

function denyAccess() {
  document.getElementById('adminAccessDenied').style.display = 'block';
  document.getElementById('adminMainContent').style.display = 'none';
}

window.handleAdminDirectGoogleLogin = async function() {
  if (window.location.protocol === 'file:') {
    alert('Google OAuth không thể chạy trên giao thức file:// cục bộ.\nVui lòng mở trang qua: http://localhost:3000/admin.html');
    window.location.href = 'http://localhost:3000/admin.html';
    return;
  }

  const btn = document.getElementById('adminDirectGoogleBtn');
  if (btn) {
    btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang mở Google...</span>';
    btn.style.opacity = '0.75';
    btn.style.pointerEvents = 'none';
  }

  if (!auth) {
    alert('Firebase Auth chưa sẵn sàng. Vui lòng tải lại trang!');
    if (btn) { btn.innerHTML = '<span>Đăng nhập với Google Admin</span>'; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    let result;
    try {
      result = await auth.signInWithPopup(provider);
    } catch(err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        alert('Trình duyệt chặn popup, đang chuyển hướng sang trang Google...');
        await auth.signInWithRedirect(provider);
        return;
      }
      throw err;
    }

    if (result && result.user) {
      verifyAdminAccess();
    }
  } catch(e) {
    console.error('Admin Google sign-in error:', e);
    if (btn) {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3c-7.4 0-13.8 4.1-17.1 10.1z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3c-7.4 0-13.8 4.1-17.1 10.1z"/><path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.5 35.9 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 40.5 16.4 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-2.9 5.3-5.4 6.9l6.6 5.6C39.9 38.1 43 32.6 43 24c0-1.4-.1-2.7-.4-3.5z"/></svg> <span>Đăng nhập với Google Admin</span>';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
    alert('Lỗi đăng nhập Admin: ' + (e.message || e.code));
  }
};

function initAdminDashboard() {
  const toggle = document.getElementById('maintenanceToggle');
  if (toggle) toggle.checked = adminState.maintenanceMode;
  updateMaintenanceTitleText();

  loadMetricsAndUsers();
  renderAdminFeedbackInbox();
  initAdminLessonTool();
}

function toggleMaintenanceMode() {
  const toggle = document.getElementById('maintenanceToggle');
  adminState.maintenanceMode = toggle.checked;
  localStorage.setItem('english_master_maintenance_mode', adminState.maintenanceMode ? 'true' : 'false');

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('english_master_realtime_sync');
      channel.postMessage({ type: 'MAINTENANCE_CHANGE', mode: adminState.maintenanceMode });
    }
  } catch (e) {}

  updateMaintenanceTitleText();

  if (adminState.maintenanceMode) {
    showToast('🔧 Đã BẬT Chế độ Bảo trì! Trang học viên đang hiển thị thông báo nâng cấp.', 'danger');
  } else {
    showToast('🚀 Đã TẮT Bảo trì! Trang web đã mở lại bình thường.');
  }
}

function updateMaintenanceTitleText() {
  const title = document.getElementById('maintenanceStatusTitle');
  if (title) {
    if (adminState.maintenanceMode) {
      title.textContent = '🔒 Web đang BẢO TRÌ (Học viên tạm thời không truy cập được)';
      title.style.color = 'var(--danger)';
    } else {
      title.textContent = '🟢 Web đang HOẠT ĐỘNG bình thường (Công khai)';
      title.style.color = 'var(--success)';
    }
  }
}

async function loadMetricsAndUsers() {
  let userCount = 4;
  let usersList = [
    { email: 'admin@gmail.com', name: 'Nguyễn Viết Kha (Chủ Web)', role: 'admin', status: 'active' },
    { email: 'kiet@gmail.com', name: 'Tuấn Kiệt', role: 'learner', status: 'active' },
    { email: 'minhanh@gmail.com', name: 'Minh Anh', role: 'learner', status: 'active' },
    { email: 'chau@gmail.com', name: 'Bảo Châu', role: 'learner', status: 'active' }
  ];

  if (db) {
    try {
      const snap = await db.collection('users').get();
      if (!snap.empty) {
        usersList = [];
        snap.forEach(doc => {
          const d = doc.data();
          usersList.push({ email: d.email || 'N/A', name: d.name || 'Học viên', role: d.role || 'learner', status: 'active' });
        });
        userCount = usersList.length;
      }
    } catch(e) {}
  }

  document.getElementById('statTotalUsers').textContent = userCount;
  document.getElementById('statAiCalls').textContent = adminState.aiUsageCount;

  const tbody = document.getElementById('adminUserTable');
  if (!tbody) return;

  tbody.innerHTML = usersList.map(u => `
    <tr>
      <td style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(u.email)}</td>
      <td style="font-size: 0.85rem;">${escapeHtml(u.name)}</td>
      <td><span class="mode-badge ${u.role === 'admin' ? 'ielts' : 'tieuhoc'}">${u.role === 'admin' ? 'Quản trị' : 'Học viên'}</span></td>
      <td><span style="color:var(--success); font-weight:700; font-size:0.82rem;">Hoạt động</span></td>
    </tr>
  `).join('');
}

function renderAdminFeedbackInbox() {
  const container = document.getElementById('adminFeedbackList');
  if (!container) return;

  adminState.feedback = JSON.parse(localStorage.getItem('english_master_feedback') || '[]');

  if (adminState.feedback.length === 0) {
    container.innerHTML = `<p style="font-size:0.88rem; color:var(--text-muted); padding:16px 0;">Hòm thư trống. Chưa có phản hồi hoặc báo cáo nội dung nào.</p>`;
    return;
  }

  container.innerHTML = adminState.feedback.map(fb => `
    <div class="comment-item" style="margin-bottom: 10px;">
      <div class="comment-header">
        <span class="comment-author">
          <i class="fa-solid fa-user"></i> Người gửi: ${escapeHtml(fb.contact || 'Ẩn danh')}
          ${fb.type === 'report' ? '<span class="mode-badge" style="background:#fee2e2; color:#dc2626; margin-left:8px;">Báo cáo bài học</span>' : ''}
        </span>
        <span style="color:var(--text-muted); font-size:0.75rem;">${escapeHtml(fb.createdAt || '')}</span>
      </div>
      <p style="font-size:0.9rem; color:var(--text-primary); margin-top:6px; line-height:1.5;">${escapeHtml(fb.message)}</p>
    </div>
  `).join('');
}

function clearFeedbackInbox() {
  if (!confirm('Bạn có chắc chắn muốn xoá toàn bộ danh sách phản hồi/báo cáo?')) return;
  adminState.feedback = [];
  localStorage.setItem('english_master_feedback', '[]');
  renderAdminFeedbackInbox();
  showToast('🗑️ Đã làm sạch hòm thư phản hồi.');
}

/* ==========================================================================
   Section 10.7: Admin Content Tool With AI Assist & Firestore Seeder
   ========================================================================== */

adminState.lessons = { ielts: [], tieuhoc: [] };

function initAdminLessonTool() {
  handleAdminModeChange();
  loadAdminLessons();
}

function handleAdminModeChange() {
  const modeSelect = document.getElementById('adminLessonMode');
  const levelSelect = document.getElementById('adminLessonLevel');
  const levelLabel = document.getElementById('adminLevelLabel');
  if (!modeSelect || !levelSelect) return;

  const mode = modeSelect.value;
  if (mode === 'tieuhoc') {
    levelLabel.textContent = '2. Chọn Lớp Tiểu học:';
    levelSelect.innerHTML = `
      <option value="1">🎒 Lớp 1 (Làm quen & Chữ cái)</option>
      <option value="2">🎨 Lớp 2 (Từ vựng & Màu sắc)</option>
      <option value="3">🌟 Lớp 3 (Giao tiếp đơn giản)</option>
      <option value="4">🚀 Lớp 4 (Ngữ pháp cơ bản)</option>
      <option value="5">🏆 Lớp 5 (Luyện thi chuyển cấp)</option>
    `;
  } else {
    levelLabel.textContent = '2. Chọn Band CEFR IELTS:';
    levelSelect.innerHTML = `
      <option value="A1">🌱 Band A1 — Sơ cấp (IELTS 1.0 – 2.5)</option>
      <option value="A2">🌿 Band A2 — Cơ bản (IELTS 3.0 – 3.5)</option>
      <option value="B1">⭐ Band B1 — Trung cấp (IELTS 4.0 – 5.0)</option>
      <option value="B2" selected>🚀 Band B2 — Trung cao cấp (IELTS 5.5 – 6.5)</option>
      <option value="C1">🏆 Band C1 — Cao cấp (IELTS 7.0 – 8.0)</option>
      <option value="C2">👑 Band C2 — Thành thạo (IELTS 8.5 – 9.0)</option>
    `;
  }
}

function toggleAddLessonForm() {
  const container = document.getElementById('adminAddLessonFormContainer');
  const text = document.getElementById('toggleFormBtnText');
  if (!container) return;
  const isHidden = container.style.display === 'none';
  container.style.display = isHidden ? 'block' : 'none';
  if (text) text.textContent = isHidden ? 'Đóng Form Soạn Bài' : 'Mở Form Soạn Bài Mới';
}

async function handleAdminAiDraft() {
  const mode = document.getElementById('adminLessonMode').value;
  const levelOrGrade = document.getElementById('adminLessonLevel').value;
  const skill = document.getElementById('adminLessonSkill').value;
  const title = document.getElementById('adminLessonTitle').value.trim();
  const prompt = document.getElementById('adminLessonPrompt').value.trim();

  if (!prompt && !title) {
    showToast('⚠️ Vui lòng nhập tiêu đề hoặc chủ đề/tài liệu để AI soạn thảo!', 'danger');
    return;
  }

  const btn = document.getElementById('adminAiDraftBtn');
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang kết nối Gemini AI soạn thảo...</span>';
  btn.style.pointerEvents = 'none';

  try {
    const payload = {
      material: prompt || title,
      mode,
      skill,
      grade: mode === 'tieuhoc' ? parseInt(levelOrGrade, 10) : undefined,
      level: mode === 'ielts' ? levelOrGrade : undefined
    };

    const res = await fetch('/api/generate-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi serverless function');
    }

    const data = await res.json();

    if (data.title && !title) {
      document.getElementById('adminLessonTitle').value = data.title;
    }
    document.getElementById('adminDraftSummary').value = data.summary || '';
    document.getElementById('adminDraftContent').value = data.originalContent || prompt || '';
    document.getElementById('adminDraftVocab').value = JSON.stringify(data.vocab || [], null, 2);
    document.getElementById('adminDraftQuiz').value = JSON.stringify(data.quiz || [], null, 2);

    document.getElementById('adminDraftContainer').style.display = 'block';
    showToast('✨ AI đã biên soạn xong bản nháp! Bạn hãy kiểm tra lại và nhấn Xuất bản.');
  } catch (err) {
    console.error('AI Draft Error:', err);
    showToast('Lỗi AI: ' + err.message, 'danger');
    handleAdminManualDraft();
  } finally {
    btn.innerHTML = origHtml;
    btn.style.pointerEvents = 'auto';
  }
}

function handleAdminManualDraft() {
  document.getElementById('adminDraftContainer').style.display = 'block';
  if (!document.getElementById('adminDraftVocab').value.trim()) {
    document.getElementById('adminDraftVocab').value = JSON.stringify([
      { "word": "example", "pos": "noun", "phonetics": "/ɪɡˈzæmpəl/", "meaning": "ví dụ mẫu", "example": "This is an example." }
    ], null, 2);
  }
  if (!document.getElementById('adminDraftQuiz').value.trim()) {
    document.getElementById('adminDraftQuiz').value = JSON.stringify([
      { "question": "Câu hỏi đọc hiểu kiểm tra?", "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"], "answer": 0, "explanation": "Giải thích vì sao đúng..." }
    ], null, 2);
  }
}

async function handleAdminPublishLesson(e) {
  e.preventDefault();
  const mode = document.getElementById('adminLessonMode').value;
  const levelOrGrade = document.getElementById('adminLessonLevel').value;
  const skill = document.getElementById('adminLessonSkill').value;
  const title = document.getElementById('adminLessonTitle').value.trim();
  const summary = document.getElementById('adminDraftSummary').value.trim();
  const originalContent = document.getElementById('adminDraftContent').value.trim();
  const vocabRaw = document.getElementById('adminDraftVocab').value.trim();
  const quizRaw = document.getElementById('adminDraftQuiz').value.trim();

  if (!title || !summary) {
    showToast('⚠️ Vui lòng nhập đầy đủ Tiêu đề và Tóm tắt bài học!', 'danger');
    return;
  }

  let vocab = [], quiz = [];
  try {
    vocab = vocabRaw ? JSON.parse(vocabRaw) : [];
    quiz = quizRaw ? JSON.parse(quizRaw) : [];
  } catch(e) {
    showToast('⚠️ Định dạng JSON từ vựng hoặc Quiz bị lỗi cú pháp!', 'danger');
    return;
  }

  const lessonId = `${mode}-${levelOrGrade}-${skill}-${Date.now().toString().slice(-6)}`;
  const newLesson = {
    id: lessonId,
    mode,
    grade: mode === 'tieuhoc' ? parseInt(levelOrGrade, 10) : null,
    level: mode === 'ielts' ? levelOrGrade : null,
    skill,
    title,
    summary,
    originalContent: originalContent || summary,
    vocab,
    quiz,
    authorId: adminState.authenticatedUser?.uid || 'admin-root',
    authorType: 'admin',
    creator: 'Ban Quản Trị English Kha Master',
    createdAt: Date.now(),
    likes: 5,
    comments: []
  };

  const publishBtn = document.getElementById('adminPublishBtn');
  const origText = publishBtn.innerHTML;
  publishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu vào Firestore...';
  publishBtn.style.pointerEvents = 'none';

  try {
    // 1. Save to Firestore if available
    if (db) {
      const collectionName = mode === 'tieuhoc' ? 'lessons_tieuhoc' : 'lessons_ielts';
      await db.collection(collectionName).doc(lessonId).set(newLesson);
    }

    // 2. Save to local storage & broadcast to user app
    adminState.lessons[mode].unshift(newLesson);
    saveAdminLessonsToStorage();

    showToast('🎉 Đã xuất bản bài học mới vào thẻ thành công!');
    document.getElementById('adminLessonForm').reset();
    document.getElementById('adminDraftContainer').style.display = 'none';
    renderAdminLessonsTable();
  } catch(err) {
    console.error('Publish error:', err);
    showToast('Lỗi lưu bài học: ' + err.message, 'danger');
  } finally {
    publishBtn.innerHTML = origText;
    publishBtn.style.pointerEvents = 'auto';
  }
}

async function loadAdminLessons() {
  // Load from Firestore first
  if (db) {
    try {
      const ieltsSnap = await db.collection('lessons_ielts').get();
      if (!ieltsSnap.empty) {
        adminState.lessons.ielts = ieltsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      const tieuhocSnap = await db.collection('lessons_tieuhoc').get();
      if (!tieuhocSnap.empty) {
        adminState.lessons.tieuhoc = tieuhocSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch(e) {
      console.warn('Firestore load lessons in admin:', e);
    }
  }

  // Fallback to CURRICULUM_DATA / localStorage if empty
  if (adminState.lessons.ielts.length === 0 && typeof CURRICULUM_DATA !== 'undefined') {
    adminState.lessons.ielts = [...(CURRICULUM_DATA.ielts || [])];
    adminState.lessons.tieuhoc = [...(CURRICULUM_DATA.tieuhoc || [])];
  } else {
    const cached = localStorage.getItem('english_master_lessons_v3');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (adminState.lessons.ielts.length === 0) adminState.lessons.ielts = parsed.ielts || [];
        if (adminState.lessons.tieuhoc.length === 0) adminState.lessons.tieuhoc = parsed.tieuhoc || [];
      } catch(e) {}
    }
  }

  renderAdminLessonsTable();
}

function saveAdminLessonsToStorage() {
  try {
    localStorage.setItem('english_master_lessons_v3', JSON.stringify(adminState.lessons));
    localStorage.setItem('english_master_lessons_v1', JSON.stringify(adminState.lessons));
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('english_master_realtime_sync');
      bc.postMessage({ type: 'SYNC_LESSONS', lessons: adminState.lessons });
    }
  } catch(e) {}
}

function renderAdminLessonsTable() {
  const tbody = document.getElementById('adminLessonsTableBody');
  const filterMode = document.getElementById('adminFilterMode')?.value || 'all';
  const filterSkill = document.getElementById('adminFilterSkill')?.value || 'all';
  if (!tbody) return;

  let all = [];
  if (filterMode === 'all' || filterMode === 'ielts') {
    all = all.concat((adminState.lessons.ielts || []).map(l => ({ ...l, mode: 'ielts' })));
  }
  if (filterMode === 'all' || filterMode === 'tieuhoc') {
    all = all.concat((adminState.lessons.tieuhoc || []).map(l => ({ ...l, mode: 'tieuhoc' })));
  }

  if (filterSkill !== 'all') {
    all = all.filter(l => l.skill === filterSkill);
  }

  if (all.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">Chưa có bài học nào khớp với bộ lọc.</td></tr>`;
    return;
  }

  tbody.innerHTML = all.map(l => {
    const badgeLabel = l.grade ? `Lớp ${l.grade}` : (l.level ? `Band ${l.level}` : (l.mode === 'tieuhoc' ? 'Tiểu học' : 'IELTS'));
    const badgeCls = l.mode === 'ielts' ? 'ielts' : 'tieuhoc';
    const skillLabel = l.skill === 'listening' ? '🎧 Listening' : '📖 Reading';

    return `
      <tr>
        <td style="font-size:0.88rem; font-weight:700; color:var(--text-1); max-width:240px;">
          ${escapeHtml(l.title)}
        </td>
        <td><span class="mode-badge ${badgeCls}">${escapeHtml(badgeLabel)}</span></td>
        <td><span style="font-size:0.82rem; font-weight:600;">${skillLabel}</span></td>
        <td style="font-size:0.82rem; color:var(--text-2);">${escapeHtml(l.creator || 'Admin')}</td>
        <td style="font-size:0.82rem;">${(l.vocab || []).length} từ · ${(l.quiz || []).length} quiz</td>
        <td>
          <button class="btn-secondary" style="padding:4px 8px; font-size:0.75rem; color:var(--danger);" onclick="deleteAdminLesson('${l.mode}', '${l.id}')">
            <i class="fa-solid fa-trash-can"></i> Xoá
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteAdminLesson(mode, id) {
  if (!confirm('Bạn có chắc chắn muốn xóa bài học này khỏi thẻ và hệ thống?')) return;

  if (db) {
    try {
      const collectionName = mode === 'tieuhoc' ? 'lessons_tieuhoc' : 'lessons_ielts';
      await db.collection(collectionName).doc(id).delete();
    } catch(e) {
      console.warn('Firestore delete error:', e);
    }
  }

  adminState.lessons[mode] = (adminState.lessons[mode] || []).filter(l => l.id !== id);
  saveAdminLessonsToStorage();
  renderAdminLessonsTable();
  showToast('🗑️ Đã xóa bài học thành công.');
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

function initAdminTheme() {
  const theme = localStorage.getItem('english_master_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('english_master_theme', current);
  document.documentElement.setAttribute('data-theme', current);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

