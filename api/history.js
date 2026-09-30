function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  return { url: url.replace(/\\\/$/, ""), key };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET만 허용됩니다." });
  }

  try {
    const { url, key } = supabaseConfig();

    const response = await fetch(
      `${url}/rest/v1/analysis_runs?select=id,file_name,original_rows,cleaned_rows,issue_count,actions,created_at&order=created_at.desc&limit=10`,
      {
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`
        }
      }
    );

    const rows = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: rows?.message || "Supabase 조회 실패"
      });
    }

    return res.status(200).json({ rows });
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}
