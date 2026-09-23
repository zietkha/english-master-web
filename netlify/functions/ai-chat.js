// Netlify serverless function — Dedicated AI Chat Tutor endpoint
// Separate from generate-lesson to avoid mixing limits/prompts (Roadmap 10.10A)

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { message, history = [], context = {} } = body;
  if (!message || typeof message !== 'string') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Thiếu tin nhắn người dùng (message).' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server chưa cấu hình GEMINI_API_KEY.' })
    };
  }

  const mode = context.mode || 'ielts';
  const level = context.level || (mode === 'tieuhoc' ? 'Tiểu học' : 'IELTS');
  const persona = mode === 'tieuhoc'
    ? 'Bạn là trợ lý gia sư tiếng Anh thân thiện, kiên nhẫn dành cho học sinh Tiểu học Việt Nam. Hãy giải thích ngắn gọn, dùng từ ngữ dễ hiểu, có ví dụ gần gũi, khích lệ các em học tập.'
    : 'Bạn là trợ lý luyện thi IELTS thông minh mang tên English Kha Master AI. Hãy giải thích súc tích, chỉ ra lỗi ngữ pháp/từ vựng (nếu có), gợi ý collocation, idiom hoặc cách diễn đạt band cao (6.5 - 8.0).';

  const systemInstruction = `${persona} Luôn trả lời bằng tiếng Việt kết hợp tiếng Anh chuẩn xác, trình bày có gạch đầu dòng rõ ràng, không dài dòng. Ngữ cảnh học tập hiện tại: [Chế độ: ${mode}, Cấp độ/Lớp: ${level}].`;

  const contents = [
    { role: 'user', parts: [{ text: `[HƯỚNG DẪN HỆ THỐNG]: ${systemInstruction}` }] },
    { role: 'model', parts: [{ text: 'Dạ, tôi đã hiểu. Tôi sẵn sàng hỗ trợ bạn học và ôn luyện tiếng Anh!' }] }
  ];

  if (Array.isArray(history)) {
    const recent = history.slice(-6);
    for (const h of recent) {
      if (h.sender === 'user' || h.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: String(h.text || h.content || '') }] });
      } else if (h.sender === 'ai' || h.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: String(h.text || h.content || '') }] });
      }
    }
  }

  contents.push({ role: 'user', parts: [{ text: message }] });

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
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Gemini API lỗi: ' + errText.slice(0, 300) })
      };
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này ngay lúc này.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Lỗi server AI Chat: ' + err.message })
    };
  }
};
