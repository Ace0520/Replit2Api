import { useState, useCallback, useEffect } from "react";
import { Copy, Check, RefreshCw, Plus, Trash2, Power, PowerOff, Upload, Download, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppState, normalizeBackendUrl } from "@/hooks/use-app-state";

// ---------------------------------------------------------------------------
// Fleet Manager types (kept local to this page)
// ---------------------------------------------------------------------------
interface FleetInstance {
  id: string; name: string; url: string; key: string;
  status: "unknown" | "checking" | "ok" | "updating" | "error" | "restarting";
  version: string | null; latestVersion: string | null;
  updateAvailable: boolean; lastChecked: number | null; updateLog: string | null;
}

const FLEET_STORE_KEY = "fleet_instances_v2";
function loadFleet(): FleetInstance[] {
  try { return JSON.parse(localStorage.getItem(FLEET_STORE_KEY) ?? "[]"); } catch { return []; }
}
function saveFleet(data: FleetInstance[]) { localStorage.setItem(FLEET_STORE_KEY, JSON.stringify(data)); }
function genId() { return Math.random().toString(36).slice(2, 9); }

// ---------------------------------------------------------------------------
// Stats Page
// ---------------------------------------------------------------------------
export default function StatsPage() {
  const {
    baseUrl, apiKey, stats, statsError, refreshStats,
    addUrl, setAddUrl, addState, addMsg, addBackend,
    removeBackend, toggleBackend, batchToggleBackends, batchRemoveBackends,
  } = useAppState();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [envPromptCopied, setEnvPromptCopied] = useState(false);

  const allSubNodes = stats ? Object.entries(stats).filter(([l]) => l !== "local") : [];
  const dynamicNodes = allSubNodes.filter(([, s]) => s.dynamic);
  const allSelected = allSubNodes.length > 0 && allSubNodes.every(([l]) => selected.has(l));
  const someSelected = selected.size > 0;

  const toggleSelect = (label: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(allSubNodes.map(([l]) => l)));

  const ENV_NODE_PROMPT =
    `请在当前 Replit 项目中添加一个环境变量，将子节点注册为永久 ENV 节点（Publish 后不会丢失）：\n\n` +
    `步骤 1：检查以下环境变量名，按顺序找到第一个尚未设置的空位：\n` +
    `   FRIEND_PROXY_URL → FRIEND_PROXY_URL_2 → … → FRIEND_PROXY_URL_20\n\n` +
    `步骤 2：通过 Replit Secrets 面板为该空位添加 Secret，值填写子节点 Publish 后的站点地址\n\n` +
    `步骤 3：重启服务器`;

  const copyEnvPrompt = () => {
    navigator.clipboard.writeText(ENV_NODE_PROMPT).then(() => {
      setEnvPromptCopied(true);
      setTimeout(() => setEnvPromptCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">用量统计</CardTitle>
            <Button variant="outline" size="sm" onClick={refreshStats} className="gap-1.5">
              <RefreshCw className="size-3" /> 刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!apiKey ? (
            <p className="text-sm text-muted-foreground">请先在首页填入 API Key 后查看统计。</p>
          ) : statsError === "server" ? (
            <p className="text-sm text-destructive">服务器未配置 PROXY_API_KEY — 请运行配置助手完成初始化。</p>
          ) : statsError === "auth" ? (
            <p className="text-sm text-destructive">认证失败，请检查首页填入的 API Key 是否与服务器一致。</p>
          ) : !stats ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {(() => {
                  const total = Object.values(stats).reduce((acc, s) => ({
                    calls: acc.calls + s.calls,
                    tokens: acc.tokens + s.totalTokens,
                    errors: acc.errors + s.errors,
                  }), { calls: 0, tokens: 0, errors: 0 });
                  return [
                    { label: "总请求数", value: total.calls.toString(), cls: "text-primary" },
                    { label: "总 Tokens", value: `${(total.tokens / 1000).toFixed(1)}K`, cls: "text-green-500" },
                    { label: "错误数", value: total.errors.toString(), cls: total.errors > 0 ? "text-destructive" : "text-green-500" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border bg-muted/30 p-4">
                      <div className={`text-2xl font-bold font-mono ${s.cls}`}>{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </div>
                  ));
                })()}
              </div>

              {/* Per-backend rows */}
              <div className="space-y-2">
                {Object.entries(stats).map(([label, s]) => {
                  const isEnabled = s.enabled !== false;
                  const isHealthy = s.health === "healthy";
                  return (
                    <div key={label} className={`rounded-lg border p-3 transition-opacity ${
                      isEnabled ? "bg-card" : "bg-muted/20 opacity-60"
                    }`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className={`size-2 rounded-full shrink-0 ${
                          !isEnabled ? "bg-muted-foreground" : isHealthy ? "bg-green-500 shadow-[0_0_5px_theme(colors.green.500)]" : "bg-destructive"
                        }`} />
                        <span className="text-sm font-semibold font-mono">{label}</span>
                        {s.dynamic && <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/30">动态</Badge>}
                        {!isEnabled && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">已禁用</Badge>}
                        {s.url && <span className="text-xs text-muted-foreground font-mono truncate flex-1">{s.url}</span>}
                      </div>
                      <div className="flex gap-4 flex-wrap text-xs">
                        {[
                          { label: "请求", value: s.calls },
                          { label: "错误", value: s.errors, cls: s.errors > 0 ? "text-destructive" : undefined },
                          { label: "Prompt", value: `${(s.promptTokens / 1000).toFixed(1)}K` },
                          { label: "输出", value: `${(s.completionTokens / 1000).toFixed(1)}K` },
                          { label: "总 Token", value: `${(s.totalTokens / 1000).toFixed(1)}K` },
                          { label: "均耗时", value: `${s.avgDurationMs}ms` },
                          ...(s.avgTtftMs ? [{ label: "首 Token", value: `${s.avgTtftMs}ms` }] : []),
                        ].map((item) => (
                          <div key={item.label} className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className={`font-semibold font-mono ${(item as {cls?:string}).cls ?? ""}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Node */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">添加节点</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">即时生效，无需重启或重新发布。节点间自动负载均衡。</p>

          {!apiKey ? (
            <p className="text-sm text-muted-foreground">请先在首页填入 API Key 后操作。</p>
          ) : (
            <>
              <form onSubmit={addBackend} className="flex gap-2">
                <Input
                  type="url"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://friend-proxy.replit.app"
                  className="flex-1 font-mono"
                />
                <Button type="submit" disabled={addState === "loading"} className="shrink-0">
                  {addState === "loading" ? "添加中…" : "添加节点"}
                </Button>
              </form>

              {/* URL normalization hint */}
              {(() => {
                const raw = addUrl.trim();
                const normed = normalizeBackendUrl(raw);
                return raw && normed !== raw.replace(/\/+$/, "") ? (
                  <p className="text-xs text-muted-foreground">
                    将保存为：<code className="text-primary font-mono">{normed}</code>
                  </p>
                ) : null;
              })()}

              {addState === "ok" && <p className="text-xs text-green-500">{addMsg}</p>}
              {addState === "err" && <p className="text-xs text-destructive">{addMsg}</p>}

              {/* ENV node */}
              <Separator />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-semibold mb-1">通过环境变量添加（永久节点）</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    ENV 节点写入 Secrets，Publish 后不会丢失。复制提示词发给 Replit Agent 自动完成配置。
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={copyEnvPrompt} className="gap-1.5 shrink-0">
                  {envPromptCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {envPromptCopied ? "已复制！" : "复制提示词"}
                </Button>
              </div>

              {/* Sub-node list */}
              {allSubNodes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                        onChange={toggleSelectAll}
                        className="size-3.5 accent-primary cursor-pointer"
                      />
                      {allSelected ? "取消全选" : "全选"}（{someSelected && !allSelected ? `已选 ${selected.size} / ` : ""}{allSubNodes.length} 个节点）
                    </label>
                    {someSelected && (
                      <>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] text-green-500 border-green-500/30"
                          onClick={() => { batchToggleBackends([...selected], true); setSelected(new Set()); }}>
                          启用选中
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] text-yellow-500 border-yellow-500/30"
                          onClick={() => { batchToggleBackends([...selected], false); setSelected(new Set()); }}>
                          禁用选中
                        </Button>
                        {[...selected].some((l) => dynamicNodes.find(([dl]) => dl === l)) && (
                          <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] text-destructive border-destructive/30"
                            onClick={() => {
                              const dynamicSelected = [...selected].filter((l) => dynamicNodes.find(([dl]) => dl === l));
                              batchRemoveBackends(dynamicSelected);
                              setSelected(new Set());
                            }}>
                            移除动态节点
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    {allSubNodes.map(([label, s]) => {
                      const isEnabled = s.enabled !== false;
                      const isChecked = selected.has(label);
                      const isDynamic = !!s.dynamic;
                      return (
                        <div
                          key={label}
                          onClick={() => toggleSelect(label)}
                          className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-all ${
                            isChecked ? "border-primary/40 bg-primary/5" : "bg-card"
                          } ${isEnabled ? "" : "opacity-50"}`}
                        >
                          <input
                            type="checkbox" checked={isChecked}
                            onChange={() => toggleSelect(label)}
                            onClick={(e) => e.stopPropagation()}
                            className="size-3.5 accent-primary cursor-pointer shrink-0"
                          />
                          <div className={`size-1.5 rounded-full shrink-0 ${
                            isEnabled ? (s.health === "healthy" ? "bg-green-500" : "bg-destructive") : "bg-muted-foreground"
                          }`} />
                          {!isDynamic && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">ENV</Badge>
                          )}
                          <span className="flex-1 text-xs font-mono truncate">{s.url ?? label}</span>
                          {!isEnabled && <Badge variant="outline" className="text-[10px]">已禁用</Badge>}
                          <span className="text-xs text-muted-foreground shrink-0">{s.calls} 次</span>
                          <Button variant="outline" size="sm" className={`h-5 px-1.5 text-[10px] ${isEnabled ? "text-yellow-500" : "text-green-500"}`}
                            onClick={(e) => { e.stopPropagation(); toggleBackend(label, !isEnabled); }}>
                            {isEnabled ? "禁用" : "启用"}
                          </Button>
                          {isDynamic && (
                            <Button variant="ghost" size="sm" className="h-5 px-1 text-destructive"
                              onClick={(e) => { e.stopPropagation(); removeBackend(label); }}>
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Fleet Manager */}
      <FleetManager />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fleet Manager (self-contained)
// ---------------------------------------------------------------------------
function FleetManager() {
  const [instances, setInstances] = useState<FleetInstance[]>(() => loadFleet());
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addKey, setAddKey] = useState("");
  const [logTarget, setLogTarget] = useState<string | null>(null);

  const persist = (next: FleetInstance[]) => { setInstances(next); saveFleet(next); };

  const addInst = () => {
    const url = addUrl.trim().replace(/\/+$/, "");
    const key = addKey.trim();
    if (!url || !key) return;
    const inst: FleetInstance = {
      id: genId(), name: addName.trim() || url, url, key,
      status: "unknown", version: null, latestVersion: null,
      updateAvailable: false, lastChecked: null, updateLog: null,
    };
    persist([...instances, inst]);
    setAddName(""); setAddUrl(""); setAddKey("");
  };

  const removeInst = (id: string) => persist(instances.filter((i) => i.id !== id));

  const patchInst = (id: string, patch: Partial<FleetInstance>) => {
    const next = instances.map((i) => i.id === id ? { ...i, ...patch } : i);
    persist(next); return next;
  };

  const checkOne = async (id: string) => {
    const inst = instances.find((i) => i.id === id);
    if (!inst) return;
    patchInst(id, { status: "checking" });
    try {
      const r = await fetch(`${inst.url}/api/update/version`, {
        headers: { Authorization: `Bearer ${inst.key}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json() as { version?: string; hasUpdate?: boolean; latestVersion?: string };
      patchInst(id, {
        status: "ok", version: d.version ?? null,
        latestVersion: d.latestVersion ?? null,
        updateAvailable: d.hasUpdate ?? false, lastChecked: Date.now(),
      });
    } catch { patchInst(id, { status: "error", lastChecked: Date.now() }); }
  };

  const checkAll = () => Promise.all(instances.map((i) => checkOne(i.id)));

  const updateOne = async (id: string) => {
    const inst = instances.find((i) => i.id === id);
    if (!inst) return;
    patchInst(id, { status: "updating", updateLog: null });
    try {
      const r = await fetch(`${inst.url}/api/update/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${inst.key}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60000),
      });
      const d = await r.json() as { message?: string };
      patchInst(id, {
        status: r.ok ? "restarting" : "error",
        updateLog: d.message ?? (r.ok ? "更新指令已发送" : "更新请求失败"),
        lastChecked: Date.now(),
      });
      setLogTarget(id);
    } catch (e) {
      patchInst(id, { status: "error", updateLog: `错误: ${(e as Error).message}`, lastChecked: Date.now() });
      setLogTarget(id);
    }
  };

  const updateAll = async () => {
    for (const inst of instances.filter((i) => i.updateAvailable)) await updateOne(inst.id);
  };

  const exportJson = () => {
    const data = instances.map(({ name, url, key }) => ({ name, url, key }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fleet.json"; a.click();
  };

  const importJson = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const arr = JSON.parse(await file.text()) as Array<{ name?: string; url?: string; key?: string }>;
        let added = 0;
        const next = [...instances];
        for (const item of arr) {
          if (!item.url || !item.key) continue;
          if (next.some((i) => i.url === item.url)) continue;
          next.push({
            id: genId(), name: item.name || item.url,
            url: item.url.replace(/\/+$/, ""), key: item.key,
            status: "unknown", version: null, latestVersion: null,
            updateAvailable: false, lastChecked: null, updateLog: null,
          });
          added++;
        }
        persist(next);
        if (added === 0) alert("没有新节点被导入（URL 重复或格式错误）");
      } catch (err) { alert(`导入失败: ${(err as Error).message}`); }
    };
    input.click();
  };

  const statusTag = (inst: FleetInstance) => {
    if (inst.status === "checking") return { label: "检测中", cls: "text-muted-foreground bg-muted" };
    if (inst.status === "updating") return { label: "更新中", cls: "text-yellow-500 bg-yellow-500/10" };
    if (inst.status === "restarting") return { label: "重启中", cls: "text-primary bg-primary/10" };
    if (inst.status === "error") return { label: "连接失败", cls: "text-destructive bg-destructive/10" };
    if (inst.status === "ok") {
      if (inst.updateAvailable) return { label: `有新版本 v${inst.latestVersion ?? ""}`, cls: "text-yellow-500 bg-yellow-500/10" };
      return { label: "已是最新", cls: "text-green-500 bg-green-500/10" };
    }
    return { label: "未检测", cls: "text-muted-foreground bg-muted" };
  };

  const hasUpdates = instances.some((i) => i.updateAvailable);
  const logInst = instances.find((i) => i.id === logTarget);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">子节点管理</CardTitle>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={importJson}><Upload className="size-3 mr-1" />导入</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportJson}><Download className="size-3 mr-1" />导出</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={checkAll} disabled={instances.length === 0}>
              <RefreshCw className="size-3 mr-1" />全部检测
            </Button>
            {hasUpdates && (
              <Button size="sm" className="h-7 text-xs" onClick={updateAll}>全部更新</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">管理多个部署实例 · 数据保存在本地浏览器</p>

        {/* Add form */}
        <div className="flex gap-1.5 flex-wrap">
          <Input className="flex-[0_0_100px] text-xs" placeholder="名称" value={addName} onChange={(e) => setAddName(e.target.value)} />
          <Input className="flex-[2_1_180px] text-xs font-mono" placeholder="https://your-proxy.replit.app" value={addUrl} onChange={(e) => setAddUrl(e.target.value)} />
          <Input type="password" className="flex-[1_1_120px] text-xs font-mono" placeholder="PROXY_API_KEY" value={addKey} onChange={(e) => setAddKey(e.target.value)} />
          <Button onClick={addInst} disabled={!addUrl || !addKey} size="sm" className="shrink-0">添加</Button>
        </div>

        {/* Instances */}
        {instances.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">暂无节点，请在上方添加</div>
        ) : (
          <div className="space-y-2">
            {instances.map((inst) => {
              const tag = statusTag(inst);
              const busy = inst.status === "checking" || inst.status === "updating";
              const timeStr = inst.lastChecked ? new Date(inst.lastChecked).toLocaleTimeString() : null;
              return (
                <div key={inst.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`size-2 rounded-full shrink-0 ${tag.cls.split(" ")[0]?.replace("text-", "bg-") ?? "bg-muted"}`} />
                    <span className="text-sm font-semibold min-w-[80px]">{inst.name}</span>
                    <span className="text-xs text-muted-foreground font-mono truncate flex-1 max-w-[240px]">{inst.url}</span>
                    {inst.version && <span className="text-xs text-muted-foreground font-mono shrink-0">v{inst.version}</span>}
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${tag.cls}`}>{tag.label}</Badge>
                    {timeStr && <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>}
                    <div className="flex gap-1 shrink-0 ml-auto">
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => checkOne(inst.id)} disabled={busy}>检测</Button>
                      <Button variant={inst.updateAvailable ? "default" : "outline"} size="sm" className="h-6 px-2 text-[11px]"
                        onClick={() => updateOne(inst.id)} disabled={busy}>更新</Button>
                      {inst.updateLog && (
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]"
                          onClick={() => setLogTarget(logTarget === inst.id ? null : inst.id)}>日志</Button>
                      )}
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] text-destructive"
                        onClick={() => removeInst(inst.id)}>删除</Button>
                    </div>
                  </div>
                  {logTarget === inst.id && logInst?.updateLog && (
                    <div className="mt-2 rounded-md border bg-muted/50 p-3 font-mono text-xs text-green-500 whitespace-pre-wrap break-all">
                      {logInst.updateLog}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
