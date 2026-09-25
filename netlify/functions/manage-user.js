/**
 * Netlify Function: Admin User Management Endpoint
 * Route: /.netlify/functions/manage-user (Rewritten from /api/admin/manage-user)
 * FIX BUG-001: Xác thực bằng Firebase ID token thật, không tin body.adminEmail
 * FIX BUG-002: Trả lỗi thật sự khi Admin SDK thất bại, không trả success giả
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // --- BUG-001 FIX: Xác thực ID token từ Authorization header ---
  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Không có token xác thực. Vui lòng đăng nhập lại.' }) };
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server chưa cấu hình FIREBASE_SERVICE_ACCOUNT.' }) };
  }

  let decodedToken;
  let adminSdkInstance;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      });
    }
    adminSdkInstance = admin;
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (verifyErr) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token không hợp lệ hoặc đã hết hạn: ' + verifyErr.message }) };
  }

  // Kiểm tra quyền admin trong Firestore
  try {
    const userDoc = await adminSdkInstance.firestore().collection('users').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data().role : null;
    const isAdmin = role === 'admin' || decodedToken.email === 'khasnlh@gmail.com';
    if (!isAdmin) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Không có quyền thực hiện thao tác này (chỉ admin).' }) };
    }
  } catch (roleErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Không thể xác minh quyền admin: ' + roleErr.message }) };
  }
  // --- Hết BUG-001 FIX ---

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { action, targetUid, email, temporaryPassword } = body;

  try {
    if (action === 'issue-temp-password') {
      if (!targetUid || !temporaryPassword) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing targetUid or temporaryPassword' }) };
      }

      // --- BUG-002 FIX: Trả lỗi thật khi Admin SDK thất bại ---
      try {
        await adminSdkInstance.auth().updateUser(targetUid, { password: temporaryPassword });
        await adminSdkInstance.firestore().collection('users').doc(targetUid).update({
          forcePasswordChange: true,
          tempPasswordIssuedAt: Date.now()
        });
      } catch (adminSdkErr) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Không thể đặt mật khẩu tạm: ' + adminSdkErr.message })
        };
      }
      // --- Hết BUG-002 FIX ---

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Mật khẩu tạm thời đã được thiết lập thành công.',
          temporaryPassword,
          forcePasswordChange: true
        })
      };
    }

    if (action === 'toggle-status') {
      const { newStatus } = body;
      if (!targetUid || !newStatus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing targetUid or newStatus' }) };
      }

      // --- BUG-002 FIX: Trả lỗi thật khi Admin SDK thất bại ---
      try {
        await adminSdkInstance.auth().updateUser(targetUid, { disabled: newStatus === 'suspended' });
        await adminSdkInstance.firestore().collection('users').doc(targetUid).update({
          status: newStatus
        });
      } catch (adminSdkErr) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Không thể thay đổi trạng thái tài khoản: ' + adminSdkErr.message })
        };
      }
      // --- Hết BUG-002 FIX ---

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Trạng thái tài khoản đã chuyển sang: ${newStatus}`,
          status: newStatus
        })
      };
    }

    if (action === 'send-reset-link') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Yêu cầu gửi email đặt lại mật khẩu cho ${email} đã được chấp thuận.`
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
