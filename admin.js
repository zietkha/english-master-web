/**
 * Web Owner Admin Portal Logic (admin.js)
 * Manages System Maintenance Mode, AI Keys, Firebase Config, User Lock/Unlock, and Feedback Inbox.
 */

const adminState = {
  authenticated: false,
  maintenanceMode: localStorage.getItem('english_master_maintenance_mode') === 'true',
  aiEngine: localStorage.getItem('english_master_ai_engine') || 'api',
  apiKey: localStorage.getItem('english_master_gemini_key') || '',
  firebaseConfigRaw: localStorage.getItem('english_master_firebase_config') || '',
  aiUsageCount: parseInt(localStorage.getItem('english_master_ai_calls') || '0', 10),
  users: JSON.parse(localStorage.getItem('english_master_users_v2') || '[]'),
  feedback: JSON.parse(localStorage.getItem('english_master_feedback') || '[]')
};

document.addEventListener('DOMContentLoaded', () => {
  initAdminTheme();
});

function handleAdminAuth(e) {
  e.preventDefault();
  const pin = document.getElementById('adminPinInput').value.trim();

  if (pin === 'admin123' || pin === '123') {
    adminState.authenticated = true;
    document.getElementById('adminLoginOverlay').classList.remove('active');
    document.getElementById('adminMainContent').style.display = 'block';
    initAdminDashboard();
    showToast('🔑 Đã xác thực thành công Chủ Web!');
  } else {
    showToast('❌ Mật khẩu/Mã PIN Admin không đúng!', 'danger');
  }
}

function initAdminDashboard() {
  const toggle = document.getElementById('maintenanceToggle');
  if (toggle) toggle.checked = adminState.maintenanceMode;
  updateMaintenanceTitleText();

  const engineSelect = document.getElementById('aiEngineSelect');
  const keyInput = document.getElementById('apiKeyInput');
  const firebaseInput = document.getElementById('firebaseConfigInput');

  if (engineSelect) engineSelect.value = adminState.aiEngine;
  if (keyInput) keyInput.value = adminState.apiKey;
  if (firebaseInput) firebaseInput.value = adminState.firebaseConfigRaw;

  handleEngineChange();
  renderAdminUsersList();
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
    showToast('🔧 Đã BẬT Chế độ Bảo trì! Trang người dùng đã bị khoá.', 'danger');
  } else {
    showToast('🚀 Đã TẮT Bảo trì! Trang web đã mở lại bình thường.');
  }
}

function updateMaintenanceTitleText() {
  const title = document.getElementById('maintenanceStatusTitle');
  if (title) {
    if (adminState.maintenanceMode) {
      title.textContent = '🔒 Web đang BẢO TRÌ (Người dùng không truy cập được)';
      title.style.color = 'var(--danger)';
    } else {
      title.textContent = '🟢 Web đang HOẠT ĐỘNG bình thường (Công khai)';
      title.style.color = 'var(--success)';
    }
  }
}

function handleEngineChange() {
  const select = document.getElementById('aiEngineSelect');
  const keyGroup = document.getElementById('apiKeyGroup');
  if (select && keyGroup) keyGroup.style.display = select.value === 'gemini' ? 'block' : 'none';
}

function saveAdminSettings() {
  const select = document.getElementById('aiEngineSelect');
  const keyInput = document.getElementById('apiKeyInput');
  const firebaseInput = document.getElementById('firebaseConfigInput');

  if (select) { adminState.aiEngine = select.value; localStorage.setItem('english_master_ai_engine', adminState.aiEngine); }
  if (keyInput) { adminState.apiKey = keyInput.value.trim(); localStorage.setItem('english_master_gemini_key', adminState.apiKey); }
  if (firebaseInput) { adminState.firebaseConfigRaw = firebaseInput.value.trim(); localStorage.setItem('english_master_firebase_config', adminState.firebaseConfigRaw); }

  showToast('💾 Đã lưu cấu hình hệ thống thành công!');
}

function renderAdminUsersList() {
  document.getElementById('statTotalUsers').textContent = adminState.users.length;
  document.getElementById('statAiCalls').textContent = adminState.aiUsageCount;

  const tbody = document.getElementById('adminUserTable');
  if (!tbody) return;

  tbody.innerHTML = adminState.users.map(u => `
    <tr>
      <td style="font-size: 0.85rem;">${escapeHtml(u.email)}</td>
      <td style="font-size: 0.85rem;">${escapeHtml(u.name)}</td>
      <td>${u.status === 'suspended' ? '<span style="color:var(--danger); font-weight:700;">Khoá</span>' : '<span style="color:var(--success); font-weight:700;">Hoạt động</span>'}</td>
      <td>
        <button class="btn-secondary" style="font-size: 0.75rem; padding: 2px 8px;" onclick="toggleUserStatus('${u.id}')">
          ${u.status === 'suspended' ? 'Mở khoá' : 'Khoá'}
        </button>
      </td>
    </tr>
  `).join('');
}

function toggleUserStatus(id) {
  const u = adminState.users.find(x => x.id === id);
  if (u) {
    u.status = u.status === 'suspended' ? 'active' : 'suspended';
    localStorage.setItem('english_master_users_v2', JSON.stringify(adminState.users));
    renderAdminUsersList();
    showToast(`⚙️ Đã ${u.status === 'suspended' ? 'khoá' : 'mở khoá'} ${u.name}`);
  }
}

function renderAdminFeedbackInbox() {
  const container = document.getElementById('adminFeedbackList');
  if (!container) return;

  adminState.feedback = JSON.parse(localStorage.getItem('english_master_feedback') || '[]');

  if (adminState.feedback.length === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Hòm thư trống. Chưa có phản hồi/báo lỗi mới từ học viên.</p>`;
    return;
  }

  container.innerHTML = adminState.feedback.map(fb => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author"><i class="fa-solid fa-user"></i> Liên hệ: ${escapeHtml(fb.contact || 'Ẩn danh')}</span>
        <span style="color:var(--text-muted); font-size:0.75rem;">${fb.createdAt || ''} (${fb.page || 'Web'})</span>
      </div>
      <p style="font-size:0.9rem; color:var(--text-primary); margin-top:4px;">${escapeHtml(fb.message)}</p>
    </div>
  `).join('');
}

function clearFeedbackInbox() {
  if (!confirm('Bạn có chắc chắn muốn xoá tất cả phản hồi trong hòm thư?')) return;
  adminState.feedback = [];
  localStorage.setItem('english_master_feedback', '[]');
  renderAdminFeedbackInbox();
  showToast('🗑️ Đã xoá hòm thư phản hồi.');
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
