// Shared OpenRouter helper for AI route handlers.
//
// Returns a discriminated union so callers can map a missing API key
// to an HTTP 503 response (the canonical "AI unavailable" status used
// across the project's AI endpoints) instead of a 500.
//
// The chat handler (src/app/api/ai/chat/route.ts) predates this helper
// and intentionally keeps its own implementation; new endpoints should
// use this helper.

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type OpenRouterResult =
  | { ok: true; content: string; model: string }
  | { ok: false; status: number; error: string };

interface OpenRouterResponse {
  model?: string;
  choices: { message: { content: string } }[];
}

export async function callOpenRouter(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: 'AI service unavailable: OPENROUTER_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'LocalServices Directory',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        ok: false,
        status: 502,
        error: `OpenRouter API error: ${response.status}${errorText ? ` ${errorText.slice(0, 200)}` : ''}`,
      };
    }

    const data: OpenRouterResponse = await response.json();
    return {
      ok: true,
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || model,
    };
  } catch (err: any) {
    return { ok: false, status: 502, error: `OpenRouter request failed: ${err?.message || 'unknown error'}` };
  }
}

// 3-strategy JSON parser (mirrors patterns used elsewhere in the audit cohort).
export function parseAIJson(text: string): any | null {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch (_) {}
  }
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch (_) {}
  }
  return null;
}
