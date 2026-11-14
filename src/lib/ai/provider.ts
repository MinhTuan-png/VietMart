/**
 * Chọn nhà cung cấp AI cho trợ lý quản trị.
 * - anthropic : Claude API (ANTHROPIC_API_KEY)
 * - gemini / groq / openrouter / ollama / custom : API tương thích OpenAI (nhiều bên có gói MIỄN PHÍ)
 * Mặc định tự nhận diện theo biến môi trường có key; ép chọn bằng AI_PROVIDER.
 */
export type ProviderName = "anthropic" | "gemini" | "groq" | "openrouter" | "ollama" | "custom" | "offline";

export type OpenAICompatConfig = { name: ProviderName; label: string; baseUrl: string; apiKey: string; model: string };

const PRESETS: Record<Exclude<ProviderName, "anthropic" | "offline">, { label: string; baseUrl: string; keyEnv: string; modelEnv: string; model: string }> = {
  gemini: { label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", model: "gemini-2.5-flash" },
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", modelEnv: "GROQ_MODEL", model: "llama-3.3-70b-versatile" },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", model: "meta-llama/llama-3.3-70b-instruct:free" },
  ollama: { label: "Ollama (máy cục bộ)", baseUrl: "http://localhost:11434/v1", keyEnv: "OLLAMA_API_KEY", modelEnv: "OLLAMA_MODEL", model: "qwen2.5:7b" },
  custom: { label: "OpenAI-compatible", baseUrl: "", keyEnv: "AI_API_KEY", modelEnv: "AI_MODEL", model: "" },
};

export function activeProvider(): ProviderName {
  const forced = process.env.AI_PROVIDER?.toLowerCase() as ProviderName | undefined;
  if (forced && (forced === "anthropic" || forced === "offline" || forced in PRESETS)) return forced;
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.AI_BASE_URL) return "custom";
  return "offline";
}

export function openAICompatConfig(name: ProviderName): OpenAICompatConfig {
  const p = PRESETS[name as keyof typeof PRESETS];
  return {
    name,
    label: p.label,
    baseUrl: (process.env.AI_BASE_URL || p.baseUrl).replace(/\/$/, ""),
    apiKey: process.env[p.keyEnv] || process.env.AI_API_KEY || (name === "ollama" ? "ollama" : ""),
    model: process.env.AI_MODEL || process.env[p.modelEnv] || p.model,
  };
}

export function providerLabel() {
  const n = activeProvider();
  if (n === "offline") return null;
  if (n === "anthropic") return `Claude (${process.env.ANTHROPIC_MODEL || "claude-opus-5-5"})`;
  const c = openAICompatConfig(n);
  return `${c.label} (${c.model})`;
}
