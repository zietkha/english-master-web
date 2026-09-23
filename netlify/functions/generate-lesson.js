// Netlify Serverless Function for English Kha Master AI Generation
// Runs securely on Netlify backend, protects GEMINI_API_KEY

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch(e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { material, mode } = body;
  if (!material || typeof material !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Thiếu nội dung tài liệu (material).' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server chưa cấu hình GEMINI_API_KEY.' })
    };
  }

  const levelDesc = mode === 'ielts'
    ? 'trình độ IELTS (band 5.5-7.5): tóm tắt học thuật, từ vựng nâng cao/học thuật, câu hỏi kiểu đọc hiểu IELTS'
    : 'trình độ tiểu học Việt Nam (lớp 1-5): tóm tắt đơn giản dễ hiểu, từ vựng cơ bản thường gặp trong SGK, câu hỏi trắc nghiệm đơn giản';

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
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gemini API lỗi: ' + errText.slice(0, 300) })
      };
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gemini không trả về nội dung hợp lệ.' })
      };
    }

    const parsed = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Lỗi server: ' + err.message })
    };
  }
};
