import fs from "fs";

// api/ai.js
// Serverless proxy for Gemini (keeps API key server-side)
const GEMINI_CONFIG = {
  model: "gemini-2.5-flash",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/",
  retries: 3,
  retryDelayMs: 3000,
};

function sanitizeAndParseText(text) {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.replace(/```json\s*/gi, "").replace(/\s*```/g, "").trim();
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, " ");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (err) {
    return null;
  }
  return null;
}

async function callGeminiServer(apiKey, prompt) {
  const model = GEMINI_CONFIG.model;
  const url = `${GEMINI_CONFIG.baseUrl}${model}:generateContent?key=${apiKey}`;

  for (let attempt = 1; attempt <= GEMINI_CONFIG.retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, topP: 0.9 },
        }),
      });

      // Prefer JSON; fallback to text
      let bodyJson;
      try {
        bodyJson = await res.json();
      } catch {
        const txt = await res.text().catch(() => "");
        bodyJson = { _text: txt };
      }

      if (!res.ok) {
        const message = bodyJson?.error?.message || JSON.stringify(bodyJson) || "no body";
        const err = new Error(`Gemini responded ${res.status}: ${message}`);
        err.status = res.status;
        throw err;
      }

      const candidateText = bodyJson?.candidates?.[0]?.content?.parts?.[0]?.text || bodyJson?._text || null;
      const parsed = sanitizeAndParseText(candidateText);
      return { parsed, raw: candidateText, rawApiResponse: bodyJson };
    } catch (err) {
      // Rate-limit backoff
      if (err.status === 429) {
        const wait = Math.min(attempt * 20000, 90000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (attempt === GEMINI_CONFIG.retries) throw err;
      await new Promise((r) => setTimeout(r, GEMINI_CONFIG.retryDelayMs * attempt));
    }
  }

  throw new Error("Failed after retries");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: GEMINI_API_KEY missing" });
  }

  let body = {};
  try {
    // Try runtime-friendly parse, fallback to raw stream parse
    if (typeof req.json === "function") {
      try { body = await req.json(); } catch {}
    } else {
      body = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
          try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
        });
        req.on("error", () => resolve({}));
      });
    }
  } catch {
    body = {};
  }

  const prompt = body.prompt || body.articleText || "";
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing 'prompt' string in request body" });
  }

  try {
    const { parsed, raw, rawApiResponse } = await callGeminiServer(apiKey, prompt);
    if (parsed) return res.status(200).json({ insights: parsed });
    return res.status(200).json({ insights: null, rawText: raw || null, rawApiResponse });
  } catch (err) {
    const status = err.status || 502;
    return res.status(status).json({ error: err.message });
  }
}