import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppState, OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS, OPENROUTER_MODELS, PROVIDER_GROUPS, type Provider } from "@/hooks/use-app-state";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const el = document.createElement("textarea"); el.value = text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-1.5 shrink-0">
      {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3 text-muted-foreground" />}
    </Button>
  );
}

function CodeBlock({ code, copyText }: { code: string; copyText?: string }) {
  return (
    <div className="relative group">
      <pre className="rounded-lg border bg-muted/30 p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={copyText ?? code} />
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cls = method === "GET"
    ? "bg-green-500/10 text-green-500 border-green-500/30"
    : method === "DELETE"
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-blue-500/10 text-blue-500 border-blue-500/30";
  return <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 shrink-0 font-mono ${cls}`}>{method}</span>;
}

const PROVIDER_COLORS: Record<Provider, string> = {
  openai: "text-green-400",
  anthropic: "text-orange-400",
  gemini: "text-blue-400",
  openrouter: "text-purple-400",
};

function ModelBadge({ variant }: { variant: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    thinking: { label: "思考", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
    "thinking-visible": { label: "思考(可见)", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
    tools: { label: "工具", cls: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
    reasoning: { label: "推理", cls: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  };
  const m = map[variant];
  if (!m) return null;
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${m.cls}`}>{m.label}</span>;
}

// ---------------------------------------------------------------------------
// Endpoints Page
// ---------------------------------------------------------------------------
export default function EndpointsPage() {
  const { displayUrl, totalModels } = useAppState();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    openai: false, anthropic: false, gemini: false, openrouter: false,
  });

  return (
    <div className="space-y-6">
      {/* Endpoint list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">API 端点列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {([
            { method: "GET", path: "/v1/models", desc: "列出所有可用模型" },
            { method: "POST", path: "/v1/chat/completions", desc: "OpenAI 格式补全（支持工具调用 + 流式）" },
            { method: "POST", path: "/v1/messages", desc: "Claude Messages 原生格式" },
            { method: "POST", path: "/v1/models/:model:generateContent", desc: "Gemini 原生格式（非流式）" },
            { method: "POST", path: "/v1/models/:model:streamGenerateContent", desc: "Gemini 原生格式（流式 SSE）" },
            { method: "GET", path: "/v1/stats", desc: "查看各后端用量统计（需 API Key）" },
            { method: "GET", path: "/v1/admin/backends", desc: "列出所有后端节点（需 API Key）" },
            { method: "POST", path: "/v1/admin/backends", desc: "动态添加新节点（需 API Key）" },
            { method: "DELETE", path: "/v1/admin/backends/:label", desc: "移除动态节点（需 API Key）" },
          ]).map((ep) => (
            <div key={`${ep.method}:${ep.path}`} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <MethodBadge method={ep.method} />
              <code className="font-mono text-xs flex-1">{ep.path}</code>
              <span className="text-xs text-muted-foreground shrink-0 max-w-[260px] text-right hidden sm:inline">{ep.desc}</span>
              <CopyButton text={`${displayUrl}${ep.path}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Auth */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">认证方式（三选一）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Bearer Token（推荐）", code: `Authorization: Bearer YOUR_PROXY_API_KEY` },
            { label: "x-goog-api-key Header", code: `x-goog-api-key: YOUR_PROXY_API_KEY` },
            { label: "URL 查询参数", code: `${displayUrl}/v1/models?key=YOUR_PROXY_API_KEY` },
          ].map((auth) => (
            <div key={auth.label}>
              <div className="text-xs text-muted-foreground mb-1">{auth.label}</div>
              <CodeBlock code={auth.code} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tool Calling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">工具 / 函数调用示例</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            使用 OpenAI 标准 <code className="text-primary bg-primary/10 px-1 rounded">tools</code> 格式，代理自动转换到各后端格式。
          </p>
          <CodeBlock
            code={`curl ${displayUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "北京天气怎么样?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get weather for a city",
        "parameters": {
          "type": "object",
          "properties": { "city": {"type": "string"} },
          "required": ["city"]
        }
      }
    }],
    "tool_choice": "auto"
  }'`}
          />
          <div className="flex flex-wrap gap-2">
            {["OpenAI ✓ pass-through", "Anthropic ✓ tool_use", "Gemini ✓ functionDeclarations", "OpenRouter ✓ pass-through"].map((s) => (
              <Badge key={s} variant="outline" className="text-[11px] text-green-500 border-green-500/20">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Test */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">快速测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock code={`curl ${displayUrl}/v1/models \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY"`} />
          <div className="text-xs text-muted-foreground mb-1">流式输出测试：</div>
          <CodeBlock code={`curl ${displayUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"Hello!"}],"stream":true}'`} />
        </CardContent>
      </Card>

      {/* Models */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            可用模型（{totalModels} 个）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {(["thinking", "thinking-visible", "tools", "reasoning"] as const).map((v) => (
              <div key={v} className="flex items-center gap-1.5">
                <ModelBadge variant={v} />
                <span className="text-[11px] text-muted-foreground">
                  {v === "thinking" ? "扩展思考（隐藏）" : v === "thinking-visible" ? "扩展思考（可见）" : v === "tools" ? "支持工具调用" : "原生推理"}
                </span>
              </div>
            ))}
          </div>

          {PROVIDER_GROUPS.map(({ key, title, models, provider }) => {
            const isExpanded = expandedGroups[key];
            return (
              <div key={key}>
                <button
                  onClick={() => setExpandedGroups((p) => ({ ...p, [key]: !p[key] }))}
                  className={`flex items-center gap-2 w-full rounded-lg border p-2.5 cursor-pointer bg-card hover:bg-accent transition-colors text-left ${PROVIDER_COLORS[provider]}`}
                >
                  <span className="font-semibold text-sm flex-1">{title}</span>
                  <span className="text-xs text-muted-foreground">{models.length} 个模型</span>
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {isExpanded && (
                  <div className="mt-1 space-y-0.5">
                    {models.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 rounded-md border bg-muted/20 p-2 text-xs">
                        <code className={`font-mono flex-1 break-all ${PROVIDER_COLORS[provider]}`}>{m.id}</code>
                        <span className="text-muted-foreground shrink-0 hidden sm:inline">{m.desc}</span>
                        {m.context && <span className="text-[10px] text-muted-foreground border rounded px-1 shrink-0 hidden lg:inline">{m.context}</span>}
                        {m.badge && <ModelBadge variant={m.badge} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground mt-2">
            💡 任何包含 <code className="text-primary">/</code> 的模型名均自动路由到 OpenRouter，不限于上方列表。
          </p>
        </CardContent>
      </Card>

      {/* CherryStudio Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CherryStudio 接入指南</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { step: 1, title: "打开设置 → 模型服务商", desc: "在 CherryStudio 中，点击左侧设置，选择「模型服务商」。" },
            { step: 2, title: "新增服务商，类型选「OpenAI Compatible」", desc: "点击「添加服务商」，类型选「OpenAI 兼容」。" },
            { step: 3, title: "填写 Base URL 和 API Key", desc: `Base URL 填入 ${displayUrl}，API Key 填入 PROXY_API_KEY。` },
            { step: 4, title: "点击「检测」或「添加模型」", desc: `CherryStudio 会自动调用 /v1/models 加载 ${totalModels} 个模型列表。` },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="flex items-center justify-center size-7 rounded-full bg-primary/20 border border-primary/40 text-sm font-bold text-primary shrink-0 mt-0.5">
                {item.step}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">{item.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
