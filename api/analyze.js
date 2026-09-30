function parseJsonText(text) {
  const cleaned = String(text || "")
    .replace(/^\`\`\`json\s*/i, "")
    .replace(/^\`\`\`\s*/i, "")
    .replace(/\`\`\`$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function getGeminiText(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || "")
    .join("\n")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });
  }

  try {
    const body = req.body || {};

    const prompt = `
당신은 CSV 데이터 품질 분석기입니다.
전체 파일을 수정하지 말고, 열 이름과 샘플을 보고 '의미상 형식 불일치'만 찾아주세요.

예:
- 남 / 남자 / M / Male 같이 같은 의미인데 표현이 다른 값
- 12000 / ₩12,000 / 12000원 같이 같은 종류의 값인데 형식이 다른 경우
- 2026-01-02 / 2026.1.2 / 01/02/2026 같이 날짜 형식이 섞인 경우

결측값과 완전 중복은 프런트엔드가 이미 검사하므로 반복하지 마세요.
확실하지 않은 경우 문제라고 단정하지 마세요.

반드시 JSON 하나만 반환하세요.
형식:
{
  "summary": "짧은 요약",
  "suggestions": [
    {
      "column": "열 이름",
      "type": "category_format | number_format | date_format | other",
      "problem": "무슨 문제가 있는지",
      "recommendation": "어떻게 통일하면 좋은지"
    }
  ]
}

데이터:
${JSON.stringify({
  fileName: body.fileName,
  rowCount: body.rowCount,
  headers: body.headers,
  samples: body.samples
})}
    `.trim();

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const gemini = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    const data = await gemini.json();

    if (!gemini.ok) {
      return res.status(gemini.status).json({
        error: data?.error?.message || "Gemini API 요청에 실패했습니다."
      });
    }

    const text = getGeminiText(data);

    try {
      return res.status(200).json({ analysis: parseJsonText(text) });
    } catch {
      return res.status(200).json({ raw: text });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}
