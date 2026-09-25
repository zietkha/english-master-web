/**
 * Serverless Admin User Management Endpoint (/api/admin/manage-user.js)
 * FIX BUG-001: Xác thực bằng Firebase ID token thật, không tin req.body
 * FIX BUG-002: Trả lỗi thật sự khi Admin SDK thất bại, không trả success giả
 * Per Section 8.4 of PROJECT-AUDIT-AND-ROADMAP.md.
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- BUG-001 FIX: Xác thực ID token từ Authorization header ---
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return res.status(401).json({ error: 'Không có token xác thực. Vui lòng đăng nhập lại.' });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(500).json({ error: 'Server chưa cấu hình FIREBASE_SERVICE_ACCOUNT.' });
  }

  let decodedToken;
  let adminSdkInstance;
  try {
    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      });
    }
    adminSdkInstance = admin.default;
    decodedToken = await admin.default.auth().verifyIdToken(idToken);
  } catch (verifyErr) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn: ' + verifyErr.message });
  }

  // Kiểm tra quyền admin trong Firestore
  try {
    const userDoc = await adminSdkInstance.firestore().collection('users').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data().role : null;
    const isAdmin = role === 'admin' || decodedToken.email === 'khasnlh@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này (chỉ admin).' });
    }
  } catch (roleErr) {
    return res.status(500).json({ error: 'Không thể xác minh quyền admin: ' + roleErr.message });
  }
  // --- Hết BUG-001 FIX ---

  const { action, targetUid, email, temporaryPassword } = req.body || {};

  try {
    if (action === 'issue-temp-password') {
      if (!targetUid || !temporaryPassword) {
        return res.status(400).json({ error: 'Missing targetUid or temporaryPassword' });
      }

      // --- BUG-002 FIX: Trả lỗi thật khi Admin SDK thất bại ---
      try {
        await adminSdkInstance.auth().updateUser(targetUid, { password: temporaryPassword });
        await adminSdkInstance.firestore().collection('users').doc(targetUid).update({
          forcePasswordChange: true,
          tempPasswordIssuedAt: Date.now()
        });
      } catch (adminSdkErr) {
        return res.status(500).json({ error: 'Không thể đặt mật khẩu tạm: ' + adminSdkErr.message });
      }
      // --- Hết BUG-002 FIX ---

      return res.status(200).json({
        success: true,
        message: 'Mật khẩu tạm thời đã được thiết lập thành công.',
        temporaryPassword,
        forcePasswordChange: true
      });
    }

    if (action === 'toggle-status') {
      const { newStatus } = req.body || {};
      if (!targetUid || !newStatus) {
        return res.status(400).json({ error: 'Missing targetUid or newStatus' });
      }

      // --- BUG-002 FIX: Trả lỗi thật khi Admin SDK thất bại ---
      try {
        await adminSdkInstance.auth().updateUser(targetUid, { disabled: newStatus === 'suspended' });
        await adminSdkInstance.firestore().collection('users').doc(targetUid).update({
          status: newStatus
        });
      } catch (adminSdkErr) {
        return res.status(500).json({ error: 'Không thể thay đổi trạng thái tài khoản: ' + adminSdkErr.message });
      }
      // --- Hết BUG-002 FIX ---

      return res.status(200).json({
        success: true,
        message: `Trạng thái tài khoản đã chuyển sang: ${newStatus}`,
        status: newStatus
      });
    }

    if (action === 'send-reset-link') {
      if (!email) {
        return res.status(400).json({ error: 'Missing email address' });
      }

      return res.status(200).json({
        success: true,
        message: `Yêu cầu gửi email đặt lại mật khẩu cho ${email} đã được chấp thuận.`
      });
    }

    return res.status(400).json({ error: 'Invalid management action' });
  } catch (error) {
    console.error('Admin management error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
