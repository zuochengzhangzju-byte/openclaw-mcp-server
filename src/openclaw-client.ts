/**
 * OpenClaw Gateway HTTP client — talks to /v1/chat/completions
 */

export interface OpenClawChatResponse {
  response: string;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface OpenClawHealthResponse {
  status: 'ok' | 'error';
  message: string;
}

interface ChatCompletionChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenClawClient {
  private baseUrl: string;
  private gatewayToken: string;
  private timeoutMs: number;
  private model: string;

  constructor(
    baseUrl: string,
    gatewayToken: string,
    timeoutMs: number = 120_000,
    model: string = 'openclaw'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.gatewayToken = gatewayToken;
    this.timeoutMs = timeoutMs;
    this.model = model;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.gatewayToken) {
      h['Authorization'] = `Bearer ${this.gatewayToken}`;
    }
    return h;
  }

  async health(): Promise<OpenClawHealthResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 10_000));

    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: this.headers(),
        body: JSON.stringify({ model: 'health-check', messages: [], max_tokens: 1 }),
      });
      if (res.status >= 200 && res.status < 500) {
        return { status: 'ok', message: `Gateway responding (HTTP ${res.status})` };
      }
      return { status: 'error', message: `Gateway error (HTTP ${res.status})` };
    } catch (err) {
      return {
        status: 'error',
        message: `Cannot reach Gateway: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async chat(message: string, sessionId?: string): Promise<OpenClawChatResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [{ role: 'user', content: message }],
      max_tokens: 4096,
    };
    if (sessionId) {
      body.session_id = sessionId;
    }

    const headers: Record<string, string> = { ...this.headers() };
    if (sessionId) {
      headers['x-openclaw-session-key'] = sessionId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Gateway HTTP ${res.status}: ${text.slice(0, 500)}`);
      }

      const data = (await res.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content ?? '';

      return {
        response: content,
        model: data.model,
        usage: data.usage,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
