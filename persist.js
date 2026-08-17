const KEY = "pg-cardbazaar:progress";

export async function loadProgress(kv = globalThis.PG?.kv) {
  try {
    if (kv) {
      const raw = await kv.get(KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    }
    const res = await fetch(`/api/kv/${KEY}`);
    if (!res.ok) return {};
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function saveProgress(data, kv = globalThis.PG?.kv) {
  const body = JSON.stringify(data);
  try {
    if (kv) await kv.put(KEY, body);
    else await fetch(`/api/kv/${KEY}`, { method: "PUT", body });
  } catch {
    // 靜態預覽可降級續玩
  }
  return data;
}
