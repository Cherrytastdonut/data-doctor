function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  return { url: url.replace(/\\\/$/, ""), key };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  try {
    const { url, key } = supabaseConfig();
    const body = req.body || {};

    const row = {
      file_name: String(body.file_name || "unknown.csv").slice(0, 255),
      original_rows: Number(body.original_rows || 0),
      cleaned_rows: Number(body.cleaned_rows || 0),
      issue_count: Number(body.issue_count || 0),
      actions: Array.isArray(body.actions) ? body.actions : []
    };

    const response = await fetch(`${url}/rest/v1/analysis_runs`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(row)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message || "Supabase 저장 실패"
      });
    }

    return res.status(200).json({ ok: true, row: data[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}
