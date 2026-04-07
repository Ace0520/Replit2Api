import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = "openai" | "anthropic" | "gemini" | "openrouter";

export interface ModelEntry {
  id: string;
  label: string;
  provider: Provider;
  desc: string;
  badge?: "thinking" | "thinking-visible" | "tools" | "reasoning";
  context?: string;
}

export interface ModelStatus { id: string; provider: string; enabled: boolean }
export type GroupSummary = { total: number; enabled: number };

export type BackendStat = {
  calls: number; errors: number;
  promptTokens: number; completionTokens: number; totalTokens: number;
  avgDurationMs: number; avgTtftMs: number | null;
  health: string; url?: string; dynamic?: boolean; enabled?: boolean;
};

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

export const OPENAI_MODELS: ModelEntry[] = [
  { id: "gpt-5.2", label: "GPT-5.2", provider: "openai", desc: "最新旗舰多模态模型", context: "128K", badge: "tools" },
  { id: "gpt-5.1", label: "GPT-5.1", provider: "openai", desc: "旗舰多模态模型", context: "128K", badge: "tools" },
  { id: "gpt-5", label: "GPT-5", provider: "openai", desc: "旗舰多模态模型", context: "128K", badge: "tools" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", provider: "openai", desc: "高性价比快速模型", context: "128K", badge: "tools" },
  { id: "gpt-5-nano", label: "GPT-5 Nano", provider: "openai", desc: "超轻量边缘模型", context: "128K", badge: "tools" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", desc: "稳定通用旗舰模型", context: "1M", badge: "tools" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai", desc: "均衡速度与质量", context: "1M", badge: "tools" },
  { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", provider: "openai", desc: "超高速轻量模型", context: "1M", badge: "tools" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", desc: "多模态旗舰（图文音）", context: "128K", badge: "tools" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", desc: "轻量多模态模型", context: "128K", badge: "tools" },
  { id: "o4-mini", label: "o4 Mini", provider: "openai", desc: "推理模型，快速高效", context: "200K", badge: "reasoning" },
  { id: "o4-mini-thinking", label: "o4 Mini (thinking)", provider: "openai", desc: "o4 Mini 思考别名", context: "200K", badge: "thinking" },
  { id: "o3", label: "o3", provider: "openai", desc: "强推理旗舰模型", context: "200K", badge: "reasoning" },
  { id: "o3-thinking", label: "o3 (thinking)", provider: "openai", desc: "o3 思考别名", context: "200K", badge: "thinking" },
  { id: "o3-mini", label: "o3 Mini", provider: "openai", desc: "高效推理模型", context: "200K", badge: "reasoning" },
  { id: "o3-mini-thinking", label: "o3 Mini (thinking)", provider: "openai", desc: "o3 Mini 思考别名", context: "200K", badge: "thinking" },
];

export const ANTHROPIC_MODELS: ModelEntry[] = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "anthropic", desc: "顶级推理与智能体任务", context: "200K", badge: "tools" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (thinking)", provider: "anthropic", desc: "扩展思考（隐藏）", context: "200K", badge: "thinking" },
  { id: "claude-opus-4-6-thinking-visible", label: "Claude Opus 4.6 (thinking visible)", provider: "anthropic", desc: "扩展思考（可见）", context: "200K", badge: "thinking-visible" },
  { id: "claude-opus-4-5", label: "Claude Opus 4.5", provider: "anthropic", desc: "旗舰推理模型", context: "200K", badge: "tools" },
  { id: "claude-opus-4-5-thinking", label: "Claude Opus 4.5 (thinking)", provider: "anthropic", desc: "扩展思考（隐藏）", context: "200K", badge: "thinking" },
  { id: "claude-opus-4-5-thinking-visible", label: "Claude Opus 4.5 (thinking visible)", provider: "anthropic", desc: "扩展思考（可见）", context: "200K", badge: "thinking-visible" },
  { id: "claude-opus-4-1", label: "Claude Opus 4.1", provider: "anthropic", desc: "旗舰模型（稳定版）", context: "200K", badge: "tools" },
  { id: "claude-opus-4-1-thinking", label: "Claude Opus 4.1 (thinking)", provider: "anthropic", desc: "扩展思考（隐藏）", context: "200K", badge: "thinking" },
  { id: "claude-opus-4-1-thinking-visible", label: "Claude Opus 4.1 (thinking visible)", provider: "anthropic", desc: "扩展思考（可见）", context: "200K", badge: "thinking-visible" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic", desc: "速度与智能最佳平衡", context: "200K", badge: "tools" },
  { id: "claude-sonnet-4-6-thinking", label: "Claude Sonnet 4.6 (thinking)", provider: "anthropic", desc: "扩展思考（隐藏）", context: "200K", badge: "thinking" },
  { id: "claude-sonnet-4-6-thinking-visible", label: "Claude Sonnet 4.6 (thinking visible)", provider: "anthropic", desc: "扩展思考（可见）", context: "200K", badge: "thinking-visible" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic", desc: "均衡性价比旗舰", context: "200K", badge: "tools" },
  { id: "claude-sonnet-4-5-thinking", label: "Claude Sonnet 4.5 (thinking)", provider: "anthropic", desc: "扩展思考（隐藏）", context: "200K", badge: "thinking" },
  { id: "claude-sonnet-4-5-thinking-visible", label: "Claude Sonnet 4.5 (thinking visible)", provider: "anthropic", desc: "扩展思考（可见）", context: "200K", badge: "thinking-visible" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic", desc: "超快速轻量模型", context: "200K", badge: "tools" },
  { id: "claude-haiku-4-5-thinking", label: "Claude Haiku 4.5 (thinking)", provider: "anthropic", desc: "扩展思考（隐藏）", context: "200K", badge: "thinking" },
  { id: "claude-haiku-4-5-thinking-visible", label: "Claude Haiku 4.5 (thinking visible)", provider: "anthropic", desc: "扩展思考（可见）", context: "200K", badge: "thinking-visible" },
];

export const GEMINI_MODELS: ModelEntry[] = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", provider: "gemini", desc: "最新旗舰多模态模型", context: "2M", badge: "tools" },
  { id: "gemini-3.1-pro-preview-thinking", label: "Gemini 3.1 Pro Preview (thinking)", provider: "gemini", desc: "扩展思考（隐藏）", context: "2M", badge: "thinking" },
  { id: "gemini-3.1-pro-preview-thinking-visible", label: "Gemini 3.1 Pro Preview (thinking visible)", provider: "gemini", desc: "扩展思考（可见）", context: "2M", badge: "thinking-visible" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", provider: "gemini", desc: "极速多模态模型", context: "1M", badge: "tools" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", desc: "推理旗舰，强代码能力", context: "1M", badge: "tools" },
  { id: "gemini-2.5-pro-thinking", label: "Gemini 2.5 Pro (thinking)", provider: "gemini", desc: "扩展思考（隐藏）", context: "1M", badge: "thinking" },
  { id: "gemini-2.5-pro-thinking-visible", label: "Gemini 2.5 Pro (thinking visible)", provider: "gemini", desc: "扩展思考（可见）", context: "1M", badge: "thinking-visible" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", desc: "速度与质量兼备", context: "1M", badge: "tools" },
  { id: "gemini-2.5-flash-thinking", label: "Gemini 2.5 Flash (thinking)", provider: "gemini", desc: "扩展思考（隐藏）", context: "1M", badge: "thinking" },
  { id: "gemini-2.5-flash-thinking-visible", label: "Gemini 2.5 Flash (thinking visible)", provider: "gemini", desc: "扩展思考（可见）", context: "1M", badge: "thinking-visible" },
];

export const OPENROUTER_MODELS: ModelEntry[] = [
  { id: "x-ai/grok-4.20", label: "Grok 4.20", provider: "openrouter", desc: "xAI 最新旗舰推理模型", badge: "tools" },
  { id: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast", provider: "openrouter", desc: "xAI 高速对话模型", badge: "tools" },
  { id: "x-ai/grok-4-fast", label: "Grok 4 Fast", provider: "openrouter", desc: "xAI 快速模型", badge: "tools" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "openrouter", desc: "Meta 多模态旗舰" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", provider: "openrouter", desc: "Meta 长上下文模型", context: "10M" },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2", provider: "openrouter", desc: "中文/代码强模型", badge: "tools" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", provider: "openrouter", desc: "开源强推理模型", badge: "reasoning" },
  { id: "deepseek/deepseek-r1-0528", label: "DeepSeek R1 0528", provider: "openrouter", desc: "R1 最新版本", badge: "reasoning" },
  { id: "mistralai/mistral-small-2603", label: "Mistral Small 2603", provider: "openrouter", desc: "轻量高效模型", badge: "tools" },
  { id: "qwen/qwen3.5-122b-a10b", label: "Qwen 3.5 122B", provider: "openrouter", desc: "Alibaba 大参数旗舰" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (OR)", provider: "openrouter", desc: "通过 OpenRouter 的 Gemini" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6 (OR)", provider: "openrouter", desc: "通过 OpenRouter 的 Claude", badge: "tools" },
  { id: "cohere/command-a", label: "Command A", provider: "openrouter", desc: "Cohere 企业级模型", badge: "tools" },
  { id: "amazon/nova-premier-v1", label: "Nova Premier V1", provider: "openrouter", desc: "Amazon 旗舰多模态" },
  { id: "baidu/ernie-4.5-300b-a47b", label: "ERNIE 4.5 300B", provider: "openrouter", desc: "百度 MoE 大参数模型" },
];

export const ALL_MODELS = [...OPENAI_MODELS, ...ANTHROPIC_MODELS, ...GEMINI_MODELS, ...OPENROUTER_MODELS];

export const PROVIDER_GROUPS: { key: string; title: string; models: ModelEntry[]; provider: Provider }[] = [
  { key: "openai", title: "OpenAI", models: OPENAI_MODELS, provider: "openai" },
  { key: "anthropic", title: "Anthropic Claude", models: ANTHROPIC_MODELS, provider: "anthropic" },
  { key: "gemini", title: "Google Gemini", models: GEMINI_MODELS, provider: "gemini" },
  { key: "openrouter", title: "OpenRouter", models: OPENROUTER_MODELS, provider: "openrouter" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function normalizeBackendUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, "");
  if (!url) return url;
  return /\/api$/i.test(url) ? url : url + "/api";
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppState {
  baseUrl: string;
  displayUrl: string;
  apiKey: string;
  setApiKey: (k: string) => void;
  online: boolean | null;
  sillyTavernMode: boolean;
  stLoading: boolean;
  toggleSTMode: () => void;
  showWizard: boolean;
  setShowWizard: (v: boolean) => void;

  // Stats
  stats: Record<string, BackendStat> | null;
  statsError: false | "auth" | "server";
  refreshStats: () => void;
  addUrl: string;
  setAddUrl: (u: string) => void;
  addState: "idle" | "loading" | "ok" | "err";
  addMsg: string;
  addBackend: (e: React.FormEvent) => void;
  removeBackend: (label: string) => void;
  toggleBackend: (label: string, enabled: boolean) => void;
  batchToggleBackends: (labels: string[], enabled: boolean) => void;
  batchRemoveBackends: (labels: string[]) => void;

  // Models
  modelStatus: ModelStatus[];
  modelSummary: Record<string, GroupSummary>;
  refreshModels: () => void;
  toggleModelProvider: (provider: string, enabled: boolean) => void;
  toggleModelById: (id: string, enabled: boolean) => void;

  totalModels: number;
}

const AppContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [sillyTavernMode, setSillyTavernMode] = useState(false);
  const [stLoading, setStLoading] = useState(true);
  const [apiKey, setApiKeyRaw] = useState(() => localStorage.getItem("proxy_api_key") ?? "");
  const [showWizard, setShowWizard] = useState(false);
  const [stats, setStats] = useState<Record<string, BackendStat> | null>(null);
  const [statsError, setStatsError] = useState<false | "auth" | "server">(false);
  const [addUrl, setAddUrl] = useState("");
  const [addState, setAddState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [addMsg, setAddMsg] = useState("");
  const [modelStatus, setModelStatus] = useState<ModelStatus[]>([]);
  const [modelSummary, setModelSummary] = useState<Record<string, GroupSummary>>({});

  const baseUrl = window.location.origin;
  const displayUrl: string = (import.meta.env.VITE_BASE_URL as string | undefined) ?? window.location.origin;
  const totalModels = ALL_MODELS.length;

  const setApiKey = (k: string) => {
    setApiKeyRaw(k);
    localStorage.setItem("proxy_api_key", k);
  };

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/healthz`, { signal: AbortSignal.timeout(5000) });
      setOnline(res.ok);
    } catch { setOnline(false); }
  }, [baseUrl]);

  const fetchSTMode = useCallback(async () => {
    try {
      const key = localStorage.getItem("proxy_api_key") ?? "";
      const res = await fetch(`${baseUrl}/api/settings/sillytavern`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });
      if (res.ok) { const d = await res.json(); setSillyTavernMode(d.enabled); }
    } catch {}
    setStLoading(false);
  }, [baseUrl]);

  const toggleSTMode = async () => {
    const newVal = !sillyTavernMode;
    setSillyTavernMode(newVal);
    try {
      const res = await fetch(`${baseUrl}/api/settings/sillytavern`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ enabled: newVal }),
      });
      if (!res.ok) setSillyTavernMode(!newVal);
    } catch { setSillyTavernMode(!newVal); }
  };

  const fetchStats = useCallback(async (key: string) => {
    if (!key) { setStats(null); setStatsError(false); return; }
    try {
      const r = await fetch(`${baseUrl}/v1/stats`, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) { setStatsError(r.status === 500 ? "server" : "auth"); return; }
      const d = await r.json();
      setStats(d.stats); setStatsError(false);
    } catch { setStatsError("auth"); }
  }, [baseUrl]);

  const addBackend = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeBackendUrl(addUrl);
    if (!url) return;
    setAddState("loading");
    try {
      const r = await fetch(`${baseUrl}/v1/admin/backends`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) { setAddState("err"); setAddMsg(data.error ?? "Failed"); return; }
      setAddState("ok"); setAddMsg(`已添加 ${data.label}`); setAddUrl("");
      setTimeout(() => setAddState("idle"), 3000);
      fetchStats(apiKey);
    } catch { setAddState("err"); setAddMsg("网络错误"); }
  };

  const removeBackend = async (label: string) => {
    await fetch(`${baseUrl}/v1/admin/backends/${label}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` },
    });
    fetchStats(apiKey);
  };

  const toggleBackend = async (label: string, enabled: boolean) => {
    await fetch(`${baseUrl}/v1/admin/backends/${label}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchStats(apiKey);
  };

  const batchToggleBackends = async (labels: string[], enabled: boolean) => {
    await fetch(`${baseUrl}/v1/admin/backends`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ labels, enabled }),
    });
    fetchStats(apiKey);
  };

  const batchRemoveBackends = async (labels: string[]) => {
    await Promise.all(labels.map((l) =>
      fetch(`${baseUrl}/v1/admin/backends/${l}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` },
      })
    ));
    fetchStats(apiKey);
  };

  const fetchModels = useCallback(async (key: string = apiKey) => {
    if (!key) return;
    try {
      const r = await fetch(`${baseUrl}/v1/admin/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) return;
      const d = await r.json();
      setModelStatus(d.models ?? []);
      setModelSummary(d.summary ?? {});
    } catch {}
  }, [baseUrl, apiKey]);

  const toggleModelProvider = async (provider: string, enabled: boolean) => {
    setModelStatus((prev) => prev.map((m) => m.provider === provider ? { ...m, enabled } : m));
    setModelSummary((prev) => {
      const grp = prev[provider];
      if (!grp) return prev;
      return { ...prev, [provider]: { total: grp.total, enabled: enabled ? grp.total : 0 } };
    });
    try {
      await fetch(`${baseUrl}/v1/admin/models`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ provider, enabled }),
      });
    } catch {}
    fetchModels();
  };

  const toggleModelById = async (id: string, enabled: boolean) => {
    setModelStatus((prev) => prev.map((m) => m.id === id ? { ...m, enabled } : m));
    setModelSummary((prev) => {
      const m = modelStatus.find((ms) => ms.id === id);
      if (!m) return prev;
      const grp = prev[m.provider];
      if (!grp) return prev;
      const delta = enabled ? 1 : -1;
      return { ...prev, [m.provider]: { total: grp.total, enabled: Math.max(0, Math.min(grp.total, grp.enabled + delta)) } };
    });
    try {
      await fetch(`${baseUrl}/v1/admin/models`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], enabled }),
      });
    } catch {}
    fetchModels();
  };

  useEffect(() => {
    checkHealth();
    fetchSTMode();
    fetchStats(apiKey);
    fetchModels(apiKey);
    const iv1 = setInterval(checkHealth, 30000);
    const iv2 = setInterval(() => fetchStats(apiKey), 15000);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, [checkHealth, fetchSTMode, fetchStats, fetchModels, apiKey]);

  // Auto-show wizard
  useEffect(() => {
    if (sessionStorage.getItem("wizard_dismissed") === "1") return;
    fetch(`${baseUrl}/api/setup-status`)
      .then((r) => r.ok ? r.json() : null)
      .then((status: { configured: boolean } | null) => {
        if (!status || status.configured) return;
        setShowWizard(true);
      })
      .catch(() => {});
  }, [baseUrl]);

  const value: AppState = {
    baseUrl, displayUrl, apiKey, setApiKey, online,
    sillyTavernMode, stLoading, toggleSTMode,
    showWizard, setShowWizard,
    stats, statsError, refreshStats: () => fetchStats(apiKey),
    addUrl, setAddUrl, addState, addMsg, addBackend,
    removeBackend, toggleBackend, batchToggleBackends, batchRemoveBackends,
    modelStatus, modelSummary, refreshModels: () => fetchModels(apiKey),
    toggleModelProvider, toggleModelById,
    totalModels,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
