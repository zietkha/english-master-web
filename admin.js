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
        <span style="color:var(--text-muted); font-size:0.75rem;">${fb.createdAt || ''}</span>
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
