import { useState } from "react";
import { Copy, Check, Zap, Shuffle, Ruler, Wrench, Brain, KeyRound, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppState } from "@/hooks/use-app-state";

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs shrink-0">
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "已复制!" : (label ?? "复制")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Changelog data
// ---------------------------------------------------------------------------
const RELEASES = [
  {
    version: "v1.2.1", date: "2026-04-07",
    items: [
      "修复重复 message_stop — 删除手动追加的 message_stop 事件",
      "完整 stop_reason→finish_reason 映射（end_turn/max_tokens/stop_sequence）",
      "system-only messages 回退空 user 消息",
      "writableEnded guard for /v1/messages 流式",
      "cache token 统计（prompt_tokens_details）",
      "SSE headers 一致性",
      "防御性 base64 data URL 解析",
    ],
  },
  {
    version: "v1.1.0", date: "2026-04-06",
    items: [
      "子节点请求失败自动重试（最多 3 次）",
      "区分 HTTP 错误（5xx）与网络错误",
      "流式请求改为首个 chunk 到达后再发 SSE 头",
      "子节点未返回 usage 时按字符数自动估算 token 用量",
    ],
  },
  {
    version: "v1.0.9", date: "2026-04-06",
    items: [
      "配置助手弹窗逻辑修复",
      "更新方式改为「复制提示词给 Replit Agent」",
      "修复用量统计「刷新」按钮被遮挡",
      "统计加载失败时区分错误类型",
    ],
  },
];

// ---------------------------------------------------------------------------
// Feature cards
// ---------------------------------------------------------------------------
const FEATURES = [
  { icon: Shuffle, title: "多后端路由", desc: "按模型名称自动路由到 OpenAI、Anthropic、Gemini 或 OpenRouter。" },
  { icon: Ruler, title: "多格式兼容", desc: "同时支持 OpenAI、Claude Messages、Gemini Native 三种请求格式。" },
  { icon: Wrench, title: "工具 / 函数调用", desc: "完整支持 OpenAI tools + tool_calls，自动转换到各后端原生格式。" },
  { icon: Brain, title: "扩展思考模式", desc: "Claude、Gemini、o-series 均支持 -thinking 后缀别名。" },
  { icon: KeyRound, title: "多种认证方式", desc: "支持 Bearer Token、x-goog-api-key 请求头、?key= URL 参数。" },
  { icon: Activity, title: "流式输出 SSE", desc: "所有端点均支持 SSE 流式输出，包括 Claude 和 Gemini 原生格式。" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { displayUrl, apiKey, setApiKey, sillyTavernMode, stLoading, toggleSTMode } = useAppState();

  return (
    <div className="space-y-6">
      {/* Changelog */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Zap className="size-4 text-primary" />
            更新日志 · Changelog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {RELEASES.slice(0, 2).map((r) => (
            <div key={r.version}>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="font-mono text-xs">{r.version}</Badge>
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              <ul className="space-y-1 pl-1">
                {r.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5 shrink-0">▸</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {RELEASES.length > 2 && (
            <>
              <Separator />
              <div className="max-h-48 overflow-y-auto space-y-4 pr-2">
                {RELEASES.slice(2).map((r) => (
                  <div key={r.version}>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">{r.version}</Badge>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {r.items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-primary/60 mt-0.5 shrink-0">▸</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">核心功能</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <f.icon className="size-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">{f.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Base URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg border bg-muted/50 px-4 py-2.5 font-mono text-sm text-primary overflow-hidden text-ellipsis whitespace-nowrap">
              {displayUrl}
            </code>
            <CopyButton text={displayUrl} label="复制 URL" />
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] shrink-0">DEV</Badge>
            <p className="leading-relaxed">
              当前显示为开发预览地址。将本项目 <strong className="text-foreground">Publish</strong> 后，请以生产环境域名作为正式 Base URL。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Key + SillyTavern */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            访问密码 & 设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">API Key（PROXY_API_KEY）</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入你的 PROXY_API_KEY"
              className="font-mono"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">SillyTavern 兼容模式</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                启用后对 Claude 自动追加空 user 消息，修复角色顺序要求。
              </p>
            </div>
            <Switch
              checked={sillyTavernMode}
              onCheckedChange={() => toggleSTMode()}
              disabled={stLoading || !apiKey}
            />
          </div>
          <div className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            sillyTavernMode
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border bg-muted/30 text-muted-foreground"
          }`}>
            {sillyTavernMode
              ? '已启用 — 自动追加 {role:"user", content:"继续"} 给 Claude 模型'
              : "已禁用 — 消息原样发送"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
