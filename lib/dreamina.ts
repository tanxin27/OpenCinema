export async function callDreamina(endpoint: string, payload?: Record<string, unknown>) {
  const res = await fetch("/api/dreamina", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, payload }),
  });
  return res.json();
}
