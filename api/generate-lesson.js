// Vercel serverless function — runs on server, keeps API key secure.
// Requires GEMINI_API_KEY environment variable on Vercel.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { material, mode } = req.body || {};
  if (!material || typeof material !== 'string') {
    return res.status(400).json({ error: 'Thiếu nội dung tài liệu (material).' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server chưa cấu hình GEMINI_API_KEY.' });
  }

  const levelDesc = mode === 'ielts'
    ? 'trình độ IELTS (band 5.5-7.5): tóm tắt học thuật, từ vựng nâng cao/học thuật, câu hỏi kiểu đọc hiểu IELTS'
    : 'trình độ tiểu học Việt Nam (lớp 3-5): tóm tắt đơn giản dễ hiểu, từ vựng cơ bản thường gặp trong SGK, câu hỏi trắc nghiệm đơn giản';

  const prompt = `Bạn là giáo viên tiếng Anh. Dựa trên tài liệu tiếng Anh sau, hãy tạo một bài học ở ${levelDesc}.

TÀI LIỆU:
"""
${material.slice(0, 6000)}
"""

Trả về CHỈ một JSON object hợp lệ (không markdown, không giải thích thêm) đúng cấu trúc:
{
  "title": "tiêu đề ngắn gọn cho bài học bằng tiếng Việt",
  "summary": "tóm tắt nội dung bằng tiếng Việt, 3-5 câu",
  "vocab": [{"word": "từ tiếng Anh", "meaning": "nghĩa tiếng Việt ngắn gọn"}],
  "quiz": [{"question": "câu hỏi", "options": ["A","B","C","D"], "correct": 0}]
}
(khoảng 6-10 mục vocab, khoảng 5 mục quiz, "correct" là chỉ số 0-3 của đáp án đúng trong options)`;

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
