// Vercel serverless function — Dedicated AI Chat Tutor endpoint
// Separate from /api/generate-lesson to avoid prompt/rate-limit mixing (Roadmap 10.10A)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: 'Gemini API lỗi: ' + errText.slice(0, 300) });
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này ngay lúc này.';

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server AI Chat: ' + err.message });
  }
}
