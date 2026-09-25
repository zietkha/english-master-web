// Vercel serverless function — Dedicated AI Chat Tutor endpoint
// Separate from /api/generate-lesson to avoid prompt/rate-limit mixing (Roadmap 10.10A)
// FIX BUG-004: Rate limiting — max 30 lần/ngày/user, xác thực bằng Firebase ID token

const AI_DAILY_LIMIT = 30;

async function verifyTokenAndCheckRateLimit(req) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return { error: 'Không có token xác thực.', status: 401 };

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Nếu chưa có service account, bỏ qua rate limit (development mode)
    return { uid: 'anonymous', skipRateLimit: true };
  }

  let admin, decodedToken;
  try {
    admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      });
    }
    decodedToken = await admin.default.auth().verifyIdToken(idToken);
  } catch (e) {
    return { error: 'Token không hợp lệ: ' + e.message, status: 401 };
  }

  const uid = decodedToken.uid;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const userRef = admin.default.firestore().collection('users').doc(uid);
    const doc = await userRef.get();
    const data = doc.exists ? doc.data() : {};

    const lastCallDate = data.aiLastCallDate || '';
    const callsToday = lastCallDate === today ? (data.aiCallsToday || 0) : 0;

    if (callsToday >= AI_DAILY_LIMIT) {
      return { error: `Bạn đã dùng hết ${AI_DAILY_LIMIT} lượt AI hôm nay. Vui lòng thử lại vào ngày mai.`, status: 429 };
    }

    // Tăng biến đếm
    await userRef.set({
      aiCallsToday: callsToday + 1,
      aiLastCallDate: today
    }, { merge: true });

  } catch (e) {
    console.warn('Rate limit check error:', e.message);
    // Nếu lỗi Firestore, cho phép tiếp tục (không block user)
  }

  return { uid };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // BUG-004 FIX: Xác thực và kiểm tra rate limit
  const rateLimitResult = await verifyTokenAndCheckRateLimit(req);
  if (rateLimitResult.error && !rateLimitResult.skipRateLimit) {
    return res.status(rateLimitResult.status || 400).json({ error: rateLimitResult.error });
  }

  const { message, history = [], context = {} } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Thiếu tin nhắn người dùng (message).' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server chưa cấu hình GEMINI_API_KEY.' });
  }

  const mode = context.mode || 'ielts';
  const level = context.level || (mode === 'tieuhoc' ? 'Tiểu học' : 'IELTS');
  const persona = mode === 'tieuhoc'
    ? 'Bạn là trợ lý gia sư tiếng Anh thân thiện, kiên nhẫn, vui vẻ dành cho học sinh Tiểu học Việt Nam. Hãy giải thích ngắn gọn, dùng từ ngữ dễ hiểu, có ví dụ gần gũi, khích lệ các em học tập.'
    : 'Bạn là trợ lý học tập & luyện thi IELTS thông minh mang tên English Kha Master AI. Hãy giải thích súc tích, chỉ ra lỗi ngữ pháp/từ vựng (nếu có), gợi ý collocation, idiom hoặc cách diễn đạt band cao (6.5 - 8.0).';

  const systemInstruction = `${persona} Luôn trả lời bằng tiếng Việt kết hợp tiếng Anh chuẩn xác, trình bày có gạch đầu dòng rõ ràng, không dài dòng. Ngữ cảnh học tập hiện tại: [Chế độ: ${mode}, Cấp độ/Lớp: ${level}].`;

  // Build conversation contents for Gemini API
  const contents = [];
  contents.push({
    role: 'user',
    parts: [{ text: `[HƯỚNG DẪN HỆ THỐNG]: ${systemInstruction}` }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Dạ, tôi đã hiểu vai trò của mình. Tôi sẵn sàng hỗ trợ bạn học và ôn luyện tiếng Anh!' }]
  });

  if (Array.isArray(history)) {
    // Keep last 6 exchanges to manage context window
    const recent = history.slice(-6);
    for (const h of recent) {
      if (h.sender === 'user' || h.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: String(h.text || h.content || '') }] });
      } else if (h.sender === 'ai' || h.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: String(h.text || h.content || '') }] });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    let geminiData = null;
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });

        if (geminiRes.ok) {
          geminiData = await geminiRes.json();
          break;
        } else {
          lastError = await geminiRes.text();
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!geminiData) {
      return res.status(502).json({ error: 'Gemini API lỗi: ' + lastError.slice(0, 300) });
    }

    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này ngay lúc này.';

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server AI Chat: ' + err.message });
  }
}
