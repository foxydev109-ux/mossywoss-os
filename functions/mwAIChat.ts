export default async function handler(req: Request) {
  const { messages, systemPrompt } = await req.json();
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return new Response(JSON.stringify({ error: "AI_SERVICE_UNAVAILABLE", message: "Gemini API key not configured. Set GEMINI_API_KEY to enable AI features." }), { status: 503, headers: { "Content-Type": "application/json" } });
  const contents = (messages || []).map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt || "You are a helpful assistant." }] }, contents, generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 1024 } })
    });
    if (!res.ok) { const e = await res.text(); return new Response(JSON.stringify({ error: "AI_ERROR", message: e }), { status: 502, headers: { "Content-Type": "application/json" } }); }
    const data = await res.json();
    return new Response(JSON.stringify({ text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "AI_ERROR", message: e.message }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}
