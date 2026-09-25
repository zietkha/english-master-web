// Vercel serverless function — runs on server, keeps API key secure.
// Supports mode, grade (1-5), level (A1-C2), skill (reading, listening, writing, speaking)
// FIX BUG-004: Rate limiting — max 30 lần/ngày/user, xác thực bằng Firebase ID token

const AI_DAILY_LIMIT = 30;

async function verifyTokenAndCheckRateLimit(req) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return { error: 'Không có token xác thực.', status: 401 };

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
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
  const today = new Date().toISOString().slice(0, 10);

  try {
    const userRef = admin.default.firestore().collection('users').doc(uid);
    const doc = await userRef.get();
    const data = doc.exists ? doc.data() : {};

    const lastCallDate = data.aiLastCallDate || '';
    const callsToday = lastCallDate === today ? (data.aiCallsToday || 0) : 0;

    if (callsToday >= AI_DAILY_LIMIT) {
      return { error: `Bạn đã dùng hết ${AI_DAILY_LIMIT} lượt AI hôm nay. Vui lòng thử lại vào ngày mai.`, status: 429 };
    }

    await userRef.set({
      aiCallsToday: callsToday + 1,
      aiLastCallDate: today
    }, { merge: true });
  } catch (e) {
    console.warn('Rate limit check error:', e.message);
  }

  return { uid };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // BUG-004 FIX
  const rateLimitResult = await verifyTokenAndCheckRateLimit(req);
  if (rateLimitResult.error && !rateLimitResult.skipRateLimit) {
    return res.status(rateLimitResult.status || 400).json({ error: rateLimitResult.error });
  }

  const { material, mode = 'ielts', grade, level, skill = 'reading' } = req.body || {};
  if (!material || typeof material !== 'string') {
    return res.status(400).json({ error: 'Thiếu nội dung tài liệu hoặc chủ đề (material).' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server chưa cấu hình GEMINI_API_KEY.' });
  }

  let levelDesc = '';
  if (mode === 'tieuhoc') {
    const g = grade ? `Lớp ${grade}` : 'Tiểu học (Lớp 1-5)';
    levelDesc = `dành cho học sinh Tiểu học Việt Nam (${g}), kỹ năng ${skill.toUpperCase()}. Từ vựng quen thuộc, giải nghĩa tiếng Việt đơn giản, câu hỏi ngắn gọn thân thiện`;
  } else {
    const l = level ? `Band ${level}` : 'IELTS (B1-C1)';
    levelDesc = `dành cho học viên luyện thi IELTS (${l}), kỹ năng ${skill.toUpperCase()}. Bài đọc/nghe chuẩn format học thuật, từ vựng theo chủ đề kèm loại từ và phiên âm IPA, câu hỏi đọc hiểu tư duy`;
  }

  const prompt = `Bạn là chuyên gia giảng dạy tiếng Anh của nền tảng English Kha Master.
Dựa trên tài liệu/chủ đề sau, hãy biên soạn một bài học chuẩn theo yêu cầu: ${levelDesc}.

TÀI LIỆU / CHỦ ĐỀ:
"""
${material.slice(0, 6000)}
"""

Trả về DUY NHẤT một JSON object hợp lệ (không markdown backticks, không giải thích ngoài JSON) theo đúng cấu trúc sau:
{
  "title": "Tiêu đề bài học ngắn gọn súc tích",
  "originalContent": "Đoạn văn đọc hiểu hoặc bài transcript nghe tiếng Anh hoàn chỉnh (khoảng 120-250 từ cho tiểu học, 250-450 từ cho IELTS)",
  "summary": "Tóm tắt nội dung bài học bằng tiếng Việt (3-5 câu)",
  "vocab": [
    {
      "word": "từ vựng tiếng Anh",
      "pos": "n/v/adj/adv",
      "phonetics": "/phiên âm IPA/",
      "meaning": "nghĩa tiếng Việt chính xác",
      "example": "ví dụ câu ngắn gọn có chứa từ vựng"
    }
  ],
  "quiz": [
    {
      "question": "Câu hỏi trắc nghiệm kiểm tra độ hiểu bài",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "answer": 0,
      "explanation": "Giải thích ngắn gọn tại sao chọn đáp án này bằng tiếng Việt"
    }
  ]
}
(Yêu cầu: chính xác 5 mục vocab chất lượng và 4-5 câu hỏi quiz; "answer" là số nguyên từ 0 đến 3 tương ứng vị trí trong options)`;

  try {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.5
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: 'Gemini API lỗi: ' + errText.slice(0, 300) });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Gemini không trả về nội dung hợp lệ.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: 'Không parse được JSON từ Gemini.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
}
