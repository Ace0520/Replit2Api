import { useState } from "react";
import { RefreshCw, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAppState, PROVIDER_GROUPS, type ModelEntry, type Provider } from "@/hooks/use-app-state";

const PROVIDER_COLORS: Record<Provider, { text: string; bg: string; border: string; dot: string }> = {
  openai:     { text: "text-green-400", bg: "bg-green-500/5",  border: "border-green-500/20", dot: "bg-green-500" },
  anthropic:  { text: "text-orange-400", bg: "bg-orange-500/5", border: "border-orange-500/20", dot: "bg-orange-500" },
  gemini:     { text: "text-blue-400",  bg: "bg-blue-500/5",   border: "border-blue-500/20",  dot: "bg-blue-500" },
  openrouter: { text: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/20", dot: "bg-purple-500" },
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

export default function ModelsPage() {
  const { apiKey, modelStatus, modelSummary, refreshModels, toggleModelProvider, toggleModelById } = useAppState();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    openai: true, anthropic: true, gemini: true, openrouter: true,
  });
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");

  const statusMap = new Map(modelStatus.map((m) => [m.id, m.enabled]));
  const totalEnabled = modelStatus.filter((m) => m.enabled).length;
  const totalCount = modelStatus.length;

  if (!apiKey) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <Lock className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">请先在首页填写 API Key 才能管理模型开关</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <Card className="flex items-center gap-4 p-4 flex-wrap">
        <div className="flex-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">模型开关管理</h2>
          <p className="text-sm text-muted-foreground">
            已启用 <span className="text-primary font-bold">{totalEnabled}</span> / {totalCount} 个模型
            · 禁用的模型不会出现在 <code className="font-mono text-xs text-primary">/v1/models</code> 响应中
          </p>
        </div>
        <div className="flex gap-1">
          {(["all", "enabled", "disabled"] as const).map((f) => (
            <Button
              key={f} variant={filter === f ? "default" : "outline"} size="sm"
              onClick={() => setFilter(f)} className="text-xs"
            >
              {f === "all" ? "全部" : f === "enabled" ? "已启用" : "已禁用"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={refreshModels} className="gap-1.5">
          <RefreshCw className="size-3" /> 刷新
        </Button>
      </Card>

      {/* Provider groups */}
      {PROVIDER_GROUPS.map(({ key, title, models, provider }) => {
        const c = PROVIDER_COLORS[provider];
        const grpSummary = modelSummary[key] ?? { total: models.length, enabled: models.length };
        const isExpanded = expandedGroups[key];
        const groupEnabled = grpSummary.enabled > 0;
        const allEnabled = grpSummary.enabled === grpSummary.total;

        const filteredModels = models.filter((m) => {
          const en = statusMap.get(m.id) ?? true;
          if (filter === "enabled") return en;
          if (filter === "disabled") return !en;
          return true;
        });

        return (
          <div key={key}>
            {/* Group header */}
            <div className={`flex items-center gap-3 rounded-lg ${c.bg} border ${c.border} p-3`}>
              <div className={`size-2 rounded-full shrink-0 ${c.dot}`} />
              <button
                onClick={() => setExpandedGroups((p) => ({ ...p, [key]: !p[key] }))}
                className={`font-semibold text-sm flex-1 text-left bg-transparent border-none cursor-pointer ${c.text}`}
              >
                {title}
              </button>
              <span className="text-xs text-muted-foreground">{grpSummary.enabled}/{grpSummary.total} 已启用</span>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] text-green-500 border-green-500/30"
                onClick={() => toggleModelProvider(key, true)}>全部启用</Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] text-destructive border-destructive/30"
                onClick={() => toggleModelProvider(key, false)}>全部禁用</Button>
              <Switch
                checked={groupEnabled}
                onCheckedChange={() => toggleModelProvider(key, !allEnabled)}
              />
              <button
                onClick={() => setExpandedGroups((p) => ({ ...p, [key]: !p[key] }))}
                className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer"
              >
                {isExpanded ? "▲" : "▼"}
              </button>
            </div>

            {/* Model list */}
            {isExpanded && filteredModels.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {filteredModels.map((m) => {
                  const enabled = statusMap.get(m.id) ?? true;
                  return (
                    <div key={m.id} className={`flex items-center gap-2 rounded-md border p-2 transition-all ${
                      enabled ? "bg-card" : "bg-muted/20 opacity-50 border-destructive/10"
                    }`}>
                      <code className={`font-mono text-xs flex-1 break-all ${enabled ? c.text : "text-muted-foreground"}`}>
                        {m.id}
                      </code>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{m.desc}</span>
                      {m.context && (
                        <span className="text-[10px] text-muted-foreground border rounded px-1 shrink-0 hidden lg:inline">{m.context}</span>
                      )}
                      {m.badge && <ModelBadge variant={m.badge} />}
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleModelById(m.id, !enabled)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {isExpanded && filteredModels.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">该过滤条件下无匹配模型</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
