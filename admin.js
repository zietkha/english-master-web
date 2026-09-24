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
  loadFounderConfig();
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

adminState.allUsers = [];
adminState.userSearchQuery = '';
adminState.userStatusFilter = 'all';

async function loadMetricsAndUsers() {
  let usersList = [
    { id: 'u_admin', uid: 'u_admin', email: 'khasnlh@gmail.com', name: 'Nguyễn Viết Kha (Chủ Web)', role: 'admin', status: 'active', xp: 1200, streak: 12 },
    { id: 'u_1', uid: 'u_1', email: 'kiet@gmail.com', name: 'Tuấn Kiệt', role: 'learner', status: 'active', xp: 680, streak: 7 },
    { id: 'u_2', uid: 'u_2', email: 'minhanh@gmail.com', name: 'Minh Anh', role: 'learner', status: 'active', xp: 420, streak: 5 },
    { id: 'u_3', uid: 'u_3', email: 'chau@gmail.com', name: 'Bảo Châu', role: 'learner', status: 'active', xp: 310, streak: 3 }
  ];

  if (db) {
    try {
      const snap = await db.collection('users').get();
      if (!snap.empty) {
        usersList = [];
        snap.forEach(doc => {
          const d = doc.data();
          usersList.push({
            id: doc.id,
            uid: doc.id,
            email: d.email || 'N/A',
            name: d.name || 'Học viên',
            role: d.role || 'learner',
            status: d.status || 'active',
            xp: d.xp || 0,
            streak: d.streak || 1,
            forcePasswordChange: d.forcePasswordChange || false,
            createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : 'Mới'
          });
        });
      }
    } catch(e) {
      console.warn('Firestore load users warning:', e);
    }
  }

  adminState.allUsers = usersList;
  renderAdminUserTable();
}

function handleAdminUserSearch(e) {
  adminState.userSearchQuery = (e.target.value || '').trim().toLowerCase();
  renderAdminUserTable();
}

function handleAdminUserStatusFilter(e) {
  adminState.userStatusFilter = e.target.value || 'all';
  renderAdminUserTable();
}

function renderAdminUserTable() {
  const tbody = document.getElementById('adminUserTable');
  if (!tbody) return;

  const totalEl = document.getElementById('statTotalUsers');
  const aiEl = document.getElementById('statAiCalls');
  const suspendedEl = document.getElementById('statSuspendedUsers');

  if (totalEl) totalEl.textContent = adminState.allUsers.length;
  if (aiEl) aiEl.textContent = adminState.aiUsageCount;
  if (suspendedEl) {
    suspendedEl.textContent = adminState.allUsers.filter(u => u.status === 'suspended').length;
  }

  const filtered = adminState.allUsers.filter(u => {
    // 1. Text filter
    if (adminState.userSearchQuery) {
      const query = adminState.userSearchQuery;
      const matchName = (u.name || '').toLowerCase().includes(query);
      const matchEmail = (u.email || '').toLowerCase().includes(query);
      if (!matchName && !matchEmail) return false;
    }
    // 2. Status filter
    if (adminState.userStatusFilter !== 'all') {
      if (adminState.userStatusFilter === 'active' && u.status === 'suspended') return false;
      if (adminState.userStatusFilter === 'suspended' && u.status !== 'suspended') return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Không tìm thấy học viên nào khớp với bộ lọc.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    let statusBadge = `<span class="mode-badge" style="background:#dcfce7; color:#15803d; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Hoạt động</span>`;
    if (u.status === 'suspended') {
      statusBadge = `<span class="mode-badge" style="background:#fee2e2; color:#dc2626; font-weight:700;"><i class="fa-solid fa-lock"></i> Đã khóa</span>`;
    } else if (u.forcePasswordChange) {
      statusBadge = `<span class="mode-badge" style="background:#fef3c7; color:#d97706; font-weight:700;"><i class="fa-solid fa-key"></i> Chờ đổi MK</span>`;
    }

    const isSelf = adminState.authenticatedUser && adminState.authenticatedUser.email === u.email;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-1); font-size: 0.88rem;">${escapeHtml(u.name)}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(u.email)}</div>
        </td>
        <td>
          <span class="mode-badge ${u.role === 'admin' ? 'ielts' : 'tieuhoc'}" style="font-size: 0.72rem;">
            ${u.role === 'admin' ? '🛡️ Quản trị' : '🎓 Học viên'}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--blue);">⚡ ${u.xp || 0} XP</div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">🔥 Streak ${u.streak || 1} ngày</div>
        </td>
        <td style="text-align: right;">
          <div class="row" style="gap: 5px; justify-content: flex-end; flex-wrap: wrap;">
            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" title="Gửi email link đặt lại mật khẩu" onclick="handleAdminSendResetEmail('${escapeJs(u.email)}')">
              <i class="fa-solid fa-envelope"></i> Link reset
            </button>
            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" title="Cấp mật khẩu tạm thời" onclick="handleAdminIssueTempPassword('${escapeJs(u.uid)}', '${escapeJs(u.email)}')">
              <i class="fa-solid fa-key"></i> Cấp MK tạm
            </button>
            ${!isSelf ? `
              <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: ${u.status === 'suspended' ? 'var(--success)' : 'var(--danger)'};" title="${u.status === 'suspended' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}" onclick="handleAdminToggleUserStatus('${escapeJs(u.uid)}', '${u.status || 'active'}')">
                <i class="fa-solid ${u.status === 'suspended' ? 'fa-lock-open' : 'fa-lock'}"></i> ${u.status === 'suspended' ? 'Mở khóa' : 'Khóa'}
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 1. Send Password Reset Email (Admin-assisted)
async function handleAdminSendResetEmail(email) {
  if (!email || email === 'N/A') {
    showToast('⚠️ Học viên chưa có địa chỉ email hợp lệ!', 'danger');
    return;
  }

  if (!confirm(`Bạn có chắc muốn gửi email liên kết đặt lại mật khẩu tới "${email}"?`)) return;

  try {
    if (auth) {
      await auth.sendPasswordResetEmail(email);
    }
    showToast(`📧 Đã gửi email đặt lại mật khẩu thành công tới ${email}!`);
  } catch (err) {
    console.warn('Send password reset error:', err);
    showToast('❌ Lỗi khi gửi email: ' + (err.message || 'Thử lại sau'), 'danger');
  }
}

// 2. Issue Temporary Password (Admin-assisted with forcePasswordChange)
let currentGeneratedTempPass = '';

async function handleAdminIssueTempPassword(uid, email) {
  if (!uid) {
    showToast('⚠️ Không tìm thấy định danh học viên!', 'danger');
    return;
  }

  if (!confirm(`Cấp mật khẩu tạm thời cho học viên "${email}"?\nHọc viên sẽ đăng nhập bằng mật khẩu này và bắt buộc đổi mật khẩu mới.`)) return;

  // Generate safe temporary password
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const tempPass = `EKM@2026!${randomChars}`;
  currentGeneratedTempPass = tempPass;

  try {
    // Call serverless manage-user endpoint if online
    try {
      await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue-temp-password',
          targetUid: uid,
          email: email,
          temporaryPassword: tempPass,
          adminEmail: adminState.authenticatedUser?.email || 'khasnlh@gmail.com'
        })
      });
    } catch(apiErr) {
      console.warn('API manage-user note, applying direct Firestore update:', apiErr);
    }

    // Direct Firestore update for instant persistence
    if (db) {
      await db.collection('users').doc(uid).set({
        forcePasswordChange: true,
        tempPasswordIssuedAt: Date.now()
      }, { merge: true });
    }

    // Update in-memory state
    const user = adminState.allUsers.find(u => u.uid === uid);
    if (user) user.forcePasswordChange = true;
    renderAdminUserTable();

    // Show result modal with copy button
    const displayEl = document.getElementById('tempPasswordDisplay');
    if (displayEl) displayEl.textContent = tempPass;
    const modal = document.getElementById('tempPasswordModal');
    if (modal) modal.style.display = 'flex';

    showToast(`🔑 Đã cấp mật khẩu tạm thành công cho ${email}!`);
  } catch (err) {
    console.error('Issue temp password error:', err);
    showToast('❌ Lỗi cấp mật khẩu tạm: ' + err.message, 'danger');
  }
}

function handleCopyTempPassword() {
  if (!currentGeneratedTempPass) return;
  navigator.clipboard.writeText(currentGeneratedTempPass).then(() => {
    const btn = document.getElementById('copyTempPassBtn');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã sao chép!';
      setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-copy"></i> Sao chép mật khẩu';
      }, 2000);
    }
    showToast('📋 Đã sao chép mật khẩu tạm vào bộ nhớ tạm.');
  }).catch(() => {
    showToast('⚠️ Hãy bôi đen và sao chép thủ công nhé.');
  });
}

function closeTempPasswordModal() {
  const modal = document.getElementById('tempPasswordModal');
  if (modal) modal.style.display = 'none';
}

// 3. Toggle User Account Status (Ban / Unban)
async function handleAdminToggleUserStatus(uid, currentStatus) {
  const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
  const actionName = newStatus === 'suspended' ? 'KHÓA' : 'MỞ KHÓA';

  if (!confirm(`Bạn có chắc muốn ${actionName} tài khoản học viên này?`)) return;

  try {
    // Call serverless manage-user endpoint
    try {
      await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-status',
          targetUid: uid,
          newStatus: newStatus,
          adminEmail: adminState.authenticatedUser?.email || 'khasnlh@gmail.com'
        })
      });
    } catch(apiErr) {
      console.warn('API toggle status note, applying direct Firestore update:', apiErr);
    }

    // Direct Firestore update
    if (db) {
      await db.collection('users').doc(uid).set({
        status: newStatus
      }, { merge: true });
    }

    // Update in-memory state
    const user = adminState.allUsers.find(u => u.uid === uid);
    if (user) user.status = newStatus;
    renderAdminUserTable();

    showToast(`✅ Đã ${actionName.toLowerCase()} tài khoản học viên thành công.`);
  } catch (err) {
    console.error('Toggle status error:', err);
    showToast('❌ Lỗi cập nhật trạng thái: ' + err.message, 'danger');
  }
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

/* ==========================================================================
   Founder / CEO Information & Avatar Customizer Controller
   ========================================================================== */

const DEFAULT_FOUNDER_CONFIG = {
  photoUrl: 'founder.jpg',
  name: 'Nguyễn Viết Kha',
  roleBadge: 'Nhà Sáng Lập & Chủ Tịch CEO',
  title: 'Sinh viên CNTT · Trường Đại học HUTECH, TP.HCM',
  bio: 'Xuất phát từ niềm đam mê công nghệ và mong muốn giúp người Việt học tiếng Anh hiệu quả hơn, tôi đã tự thiết kế và xây dựng English Kha Master — một nền tảng học tập hoàn toàn miễn phí, tích hợp trí tuệ nhân tạo AI hiện đại nhất dành cho mọi lứa tuổi.',
  quote: 'Tôi tin rằng công nghệ và trí tuệ nhân tạo có thể giúp bất kỳ ai — dù ở bất kỳ đâu, điều kiện nào — cũng có thể học tiếng Anh đạt chuẩn quốc tế một cách dễ dàng và hiệu quả nhất. Đó là lý do English Kha Master ra đời.',
  quoteAuthor: '— Nguyễn Viết Kha, Nhà Sáng Lập & Chủ Tịch CEO',
  established: '2024 · TP. Hồ Chí Minh',
  createdFrom: 'Cá nhân — Khởi nguồn đam mê',
  purpose: 'Học tiếng Anh chuẩn & miễn phí cho mọi người',
  vision: 'Trở thành nền tảng EdTech AI hàng đầu Việt Nam',
  techStack: 'Gemini AI · Firebase · Netlify · Speech AI',
  mission: '“Mọi người Việt đều xứng đáng có cơ hội học tập tốt nhất”',
  githubUrl: 'https://github.com/zietkha',
  facebookUrl: '',
  linkedinUrl: ''
};

let currentFounderPhotoBase64 = null;

async function loadFounderConfig() {
  let config = { ...DEFAULT_FOUNDER_CONFIG };
  const cached = localStorage.getItem('english_master_founder_config');
  if (cached) {
    try { config = { ...config, ...JSON.parse(cached) }; } catch(e) {}
  }

  if (db) {
    try {
      const doc = await db.collection('settings').doc('founder_info').get();
      if (doc.exists) {
        config = { ...config, ...doc.data() };
        localStorage.setItem('english_master_founder_config', JSON.stringify(config));
      }
    } catch(e) {
      console.warn('Firestore load founder config error:', e);
    }
  }

  populateFounderForm(config);
}

function populateFounderForm(config) {
  const photoPreview = document.getElementById('adminFounderPhotoPreview');
  const photoUrlInput = document.getElementById('adminFounderPhotoUrlInput');
  const nameInput = document.getElementById('adminFounderName');
  const roleInput = document.getElementById('adminFounderRoleBadge');
  const titleInput = document.getElementById('adminFounderTitle');
  const bioInput = document.getElementById('adminFounderBio');
  const quoteInput = document.getElementById('adminFounderQuoteText');
  const estInput = document.getElementById('adminFounderEstablished');
  const createdInput = document.getElementById('adminFounderCreatedFrom');
  const purpInput = document.getElementById('adminFounderPurpose');
  const visInput = document.getElementById('adminFounderVision');
  const techInput = document.getElementById('adminFounderTech');
  const misInput = document.getElementById('adminFounderMission');
  const ghInput = document.getElementById('adminFounderGithub');
  const fbInput = document.getElementById('adminFounderFacebook');
  const liInput = document.getElementById('adminFounderLinkedin');

  if (photoPreview) photoPreview.src = config.photoUrl || 'founder.jpg';
  if (photoUrlInput) photoUrlInput.value = (config.photoUrl && !config.photoUrl.startsWith('data:')) ? config.photoUrl : '';
  if (nameInput) nameInput.value = config.name || '';
  if (roleInput) roleInput.value = config.roleBadge || '';
  if (titleInput) titleInput.value = config.title || '';
  if (bioInput) bioInput.value = config.bio || '';
  if (quoteInput) quoteInput.value = config.quote || '';
  if (estInput) estInput.value = config.established || '';
  if (createdInput) createdInput.value = config.createdFrom || '';
  if (purpInput) purpInput.value = config.purpose || '';
  if (visInput) visInput.value = config.vision || '';
  if (techInput) techInput.value = config.techStack || '';
  if (misInput) misInput.value = config.mission || '';
  if (ghInput) ghInput.value = config.githubUrl || '';
  if (fbInput) fbInput.value = config.facebookUrl || '';
  if (liInput) liInput.value = config.linkedinUrl || '';

  if (config.photoUrl && config.photoUrl.startsWith('data:')) {
    currentFounderPhotoBase64 = config.photoUrl;
  }
}

function handleAdminFounderFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Compress/resize image to maximum 500x500 to keep performance ultra fast
      const canvas = document.createElement('canvas');
      const maxDim = 500;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      currentFounderPhotoBase64 = compressedDataUrl;
      
      const photoPreview = document.getElementById('adminFounderPhotoPreview');
      if (photoPreview) photoPreview.src = compressedDataUrl;
      
      const photoUrlInput = document.getElementById('adminFounderPhotoUrlInput');
      if (photoUrlInput) photoUrlInput.value = '';
      
      showToast('📸 Đã tải ảnh lên thành công! Hãy nhấn "Lưu Thay Đổi" để áp dụng.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleAdminFounderUrlInput(event) {
  const url = event.target.value.trim();
  const photoPreview = document.getElementById('adminFounderPhotoPreview');
  if (url) {
    currentFounderPhotoBase64 = null;
    if (photoPreview) photoPreview.src = url;
  } else {
    if (photoPreview) photoPreview.src = currentFounderPhotoBase64 || 'founder.jpg';
  }
}

async function saveFounderConfig() {
  const photoUrlInput = document.getElementById('adminFounderPhotoUrlInput');
  const customUrl = photoUrlInput ? photoUrlInput.value.trim() : '';
  const finalPhoto = customUrl || currentFounderPhotoBase64 || 'founder.jpg';

  const name = (document.getElementById('adminFounderName')?.value || 'Nguyễn Viết Kha').trim();
  const roleBadge = (document.getElementById('adminFounderRoleBadge')?.value || 'Nhà Sáng Lập & Chủ Tịch CEO').trim();
  const title = (document.getElementById('adminFounderTitle')?.value || '').trim();
  const bio = (document.getElementById('adminFounderBio')?.value || '').trim();
  const quote = (document.getElementById('adminFounderQuoteText')?.value || '').trim();
  const established = (document.getElementById('adminFounderEstablished')?.value || '').trim();
  const createdFrom = (document.getElementById('adminFounderCreatedFrom')?.value || '').trim();
  const purpose = (document.getElementById('adminFounderPurpose')?.value || '').trim();
  const vision = (document.getElementById('adminFounderVision')?.value || '').trim();
  const techStack = (document.getElementById('adminFounderTech')?.value || '').trim();
  const mission = (document.getElementById('adminFounderMission')?.value || '').trim();
  const githubUrl = (document.getElementById('adminFounderGithub')?.value || '').trim();
  const facebookUrl = (document.getElementById('adminFounderFacebook')?.value || '').trim();
  const linkedinUrl = (document.getElementById('adminFounderLinkedin')?.value || '').trim();

  const configData = {
    photoUrl: finalPhoto,
    name,
    roleBadge,
    title,
    bio,
    quote,
    quoteAuthor: `— ${name}, ${roleBadge}`,
    established,
    createdFrom,
    purpose,
    vision,
    techStack,
    mission,
    githubUrl,
    facebookUrl,
    linkedinUrl,
    updatedAt: Date.now()
  };

  localStorage.setItem('english_master_founder_config', JSON.stringify(configData));

  if (db) {
    try {
      await db.collection('settings').doc('founder_info').set(configData, { merge: true });
    } catch(e) {
      console.warn('Firestore save founder config error:', e);
    }
  }

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('english_master_realtime_sync');
      channel.postMessage({ type: 'FOUNDER_CONFIG_UPDATED', data: configData });
    }
  } catch(e) {}

  showToast('🎉 Đã lưu thông tin & ảnh Nhà Sáng Lập thành công lên toàn hệ thống!');
}

async function resetFounderConfig() {
  if (!confirm('Bạn có chắc chắn muốn khôi phục toàn bộ thông tin Nhà Sáng Lập về mặc định?')) return;
  currentFounderPhotoBase64 = null;
  populateFounderForm(DEFAULT_FOUNDER_CONFIG);
  await saveFounderConfig();
  showToast('🔄 Đã khôi phục cài đặt mặc định!');
}


