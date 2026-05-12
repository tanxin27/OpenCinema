const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

/** Client-side: call through local proxy */
export async function callDreamina(
  endpoint: string,
  payload?: Record<string, unknown>
) {
  const res = await fetch("/api/dreamina", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, payload }),
  });
  return res.json();
}

/** Server-side: call Dreamina API directly (avoid internal fetch deadlock in dev) */
export async function callDreaminaApi({
  apiKey,
  endpoint,
  method = "GET",
  payload,
}: {
  apiKey: string;
  endpoint: string;
  method?: "GET" | "POST" | "DELETE";
  payload?: any;
}): Promise<{ ok: boolean; status: number; data: any }> {
  const url = new URL(`${BASE_URL}${endpoint}`);

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };

  if (method === "POST" && payload != null) {
    init.body = JSON.stringify(payload);
  }

  const res = await fetch(url.toString(), init);
  const data = await res.json().catch(() => ({}));

  return { ok: res.ok, status: res.status, data };
}
