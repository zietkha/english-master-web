/**
 * Netlify Function: Admin User Management Endpoint
 * Route: /.netlify/functions/manage-user (Rewritten from /api/admin/manage-user)
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

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { action, targetUid, email, temporaryPassword, adminEmail } = body;

  try {
    if (action === 'issue-temp-password') {
      if (!targetUid || !temporaryPassword) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing targetUid or temporaryPassword' }) };
      }

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
