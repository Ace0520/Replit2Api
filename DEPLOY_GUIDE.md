# Replit2Api — 一键部署指南（改进版）

## 项目简介
在 Replit pnpm monorepo 中部署一套 OpenAI + Anthropic 双兼容 AI 反代网关，并附带可视化门户页面。无需任何第三方 API Key，全程通过 Replit AI Integrations 自动注入凭据。

## 功能清单
- `/v1/chat/completions` — OpenAI 兼容接口，支持 GPT 全系、Claude 全系（Gemini、OpenRouter 需子节点）
- `/v1/messages` — Anthropic Messages 原生接口，支持跨厂商路由
- `/v1/models` — 模型列表
- `/v1/stats` — 使用统计（调用量、Token 数、TTFT、错误率）
- Claude ↔ OpenAI 双向 Tool Calling 协议转换（tools、tool_choice、tool_calls、tool_result）
- 流式与非流式全支持（非流式内部强制使用 `stream().finalMessage()` 绕过 10 分钟超时限制）
- `cache_control.scope` 等 Vertex AI 不支持字段自动过滤（白名单机制 + 递归清理）
- Bearer Token（`Authorization: Bearer`）和 Anthropic 原生（`x-api-key`）双认证格式
- 云端 GCS 持久化存储（配置数据发布后不丢失）
- 可视化 API 门户（深色主题，显示 Base URL、端点说明、模型列表、CherryStudio 接入指引）

---

## 部署步骤

### 第一步：环境准备

#### 1.1 添加 Secret — PROXY_API_KEY
通过 Replit Secrets 面板添加以下 Secret：

| Key | 说明 |
|-----|------|
| `PROXY_API_KEY` | 自定义访问密钥，任意字符串，客户端用 `Authorization: Bearer <值>` 携带 |

> ⚠️ 绝对禁止：不得向用户索取 OpenAI API Key 或 Anthropic API Key。这两项由 Replit AI Integrations 自动注入。

#### 1.2 开通 Replit AI Integrations
在 code_execution 工具中依次执行（必须顺序执行，不可并发）：

```javascript
// 开通 OpenAI Integration
const openaiResult = await setupReplitAIIntegrations({
  providerSlug: "openai",
  providerUrlEnvVarName: "AI_INTEGRATIONS_OPENAI_BASE_URL",
  providerApiKeyEnvVarName: "AI_INTEGRATIONS_OPENAI_API_KEY"
});
console.log(openaiResult);

// 开通 Anthropic Integration
const anthropicResult = await setupReplitAIIntegrations({
  providerSlug: "anthropic",
  providerUrlEnvVarName: "AI_INTEGRATIONS_ANTHROPIC_BASE_URL",
  providerApiKeyEnvVarName: "AI_INTEGRATIONS_ANTHROPIC_API_KEY"
});
console.log(anthropicResult);
```

成功后平台自动写入 4 个环境变量，无需手动操作。

#### 1.3 开通云端持久化存储
```javascript
const result = await setupObjectStorage();
console.log(JSON.stringify(result));
```

成功后自动写入 `DEFAULT_OBJECT_STORAGE_BUCKET_ID` 等环境变量。

---

### 第二步：API Server

文件路径：`artifacts/api-server/src/routes/proxy.ts`

#### 2.1 依赖安装
确保 `artifacts/api-server/package.json` 的 dependencies 包含：
```json
{
  "openai": "^6",
  "@anthropic-ai/sdk": "^0.82"
}
```

#### 2.2 核心路由实现

**模型列表：**
```
GET /v1/models
Authorization: Bearer <PROXY_API_KEY>
```

返回以下模型（过滤已禁用的）：
- **OpenAI**：gpt-5.2、gpt-5.1、gpt-5、gpt-5-mini、gpt-5-nano、gpt-4.1、gpt-4.1-mini、gpt-4.1-nano、gpt-4o、gpt-4o-mini、o4-mini、o3、o3-mini（及 -thinking 别名）
- **Anthropic**：claude-opus-4-6、claude-opus-4-5、claude-opus-4-1、claude-sonnet-4-6、claude-sonnet-4-5、claude-haiku-4-5（及 -thinking、-thinking-visible 别名）
- **Gemini**：gemini-3.1-pro-preview、gemini-3-flash-preview、gemini-2.5-pro、gemini-2.5-flash（及思考别名）
- **OpenRouter**：x-ai/grok-4.20、meta-llama/llama-4-maverick、deepseek/deepseek-v3.2、deepseek/deepseek-r1 等

**聊天补全接口（OpenAI 兼容）：**
```
POST /v1/chat/completions
Authorization: Bearer <PROXY_API_KEY>
Content-Type: application/json
```

按 model 前缀路由：
- `gpt-` / `o` 开头 → OpenAI Integration (`AI_INTEGRATIONS_OPENAI_BASE_URL`)
- `claude-` 开头 → Anthropic Integration（自动做双向 Tool Calling 协议转换）
- `gemini-` 开头 或 含 `/` → 必须通过子节点（friend proxy）路由，本地节点不支持。若无可用子节点，返回 502 错误并提示用户添加子节点。

**Anthropic 原生接口：**
```
POST /v1/messages
Authorization: Bearer <PROXY_API_KEY>   # 或 x-api-key: <PROXY_API_KEY>
Content-Type: application/json
```

接受 Anthropic Messages API 格式，同样支持 Claude ↔ OpenAI 模型跨厂商路由。

#### 2.3 Claude Tool Calling 双向转换

**OpenAI → Anthropic（请求转换）：**

| OpenAI 字段 | Anthropic 等价 |
|---|---|
| `tools[].function.parameters` | `tools[].input_schema` |
| `tool_choice: "required"` | `tool_choice: {type: "any"}` |
| `tool_choice: {type:"function", function:{name}}` | `tool_choice: {type:"tool", name}` |
| `messages[role="tool"]` | `messages[role="user"][content=[{type:"tool_result"}]]` |
| `messages[role="assistant"][tool_calls]` | `messages[role="assistant"][content=[{type:"tool_use"}]]` |

**Anthropic → OpenAI（响应转换）：**

| Anthropic 响应 | OpenAI 等价 |
|---|---|
| `content[].type="tool_use"` | `choices[0].message.tool_calls[{id,type:"function",function:{name,arguments}}]` |
| `stop_reason: "tool_use"` | `finish_reason: "tool_calls"` |
| 流式 `content_block_start(tool_use)` | `delta.tool_calls[{index,id,type,function:{name,arguments:""}}]` |
| 流式 `content_block_delta(input_json_delta)` | `delta.tool_calls[{index,function:{arguments: partial_json}}]` |

> ⚠️ **关键：连续 tool_result 消息必须合并**
>
> Anthropic API 严格要求 user/assistant 交替出现。当 OpenAI 格式中有多条连续 `role:"tool"` 消息时（Claude Code 多工具调用场景），**必须合并为单条 `role:"user"` 消息**，其 `content` 为 `tool_result` 数组。
>
> 同理，任何连续的同角色消息都应合并到同一条消息中。转换完成后的消息序列必须严格 user/assistant 交替。
>
> **错误做法（会导致 400 报错）：**
> ```json
> [
>   {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "1", "content": "..."}]},
>   {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "2", "content": "..."}]}
> ]
> ```
>
> **正确做法：**
> ```json
> [
>   {"role": "user", "content": [
>     {"type": "tool_result", "tool_use_id": "1", "content": "..."},
>     {"type": "tool_result", "tool_use_id": "2", "content": "..."}
>   ]}
> ]
> ```

#### 2.4 关键修复点（必须实现）

**1. 白名单参数过滤（防 Vertex AI 400 错误）：**
```typescript
const ANTHROPIC_ALLOWED_PARAMS = new Set([
  "model", "messages", "system", "stream", "max_tokens",
  "temperature", "top_p", "top_k", "stop_sequences",
  "thinking", "tools", "tool_choice", "metadata",
]);
// 其余顶层参数全部丢弃（output_config、context_management、betas 等）
```

**2. cache_control 递归清理（防 scope 字段报错）：**
```typescript
// 递归遍历 system 数组和 messages 内容块
// 对任何 cache_control 对象，剔除 scope、ttl 等 Vertex AI 不支持的子字段
// 仅保留 type: "ephemeral" 等合法字段
```

**3. 非流式请求强制内部流式（防 10 分钟超时）：**
```typescript
// ❌ 错误做法（会触发 Replit 10 分钟请求超时，或报 "Streaming is required"）：
// const result = await client.messages.create(params);

// ✅ 正确做法（内部走流式，对外仍返回非流式格式）：
const result = await client.messages.stream(params).finalMessage();
```

**4. SSE 流式配置：**
```typescript
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache, no-transform");
res.setHeader("Connection", "keep-alive");
res.setHeader("X-Accel-Buffering", "no");
res.flushHeaders();
// 每 5 秒发送 keepalive 心跳，req.on("close") 时 clearInterval
```

**5. Thinking 模式闭合标签：**
```typescript
// 在 message_delta 事件中，发出 finish_reason 之前，
// 必须检查 thinkingStarted 标志，如仍为 true 则先发出 </thinking> 闭合标签。
// 否则当消息仅包含 thinking 内容时，客户端收到残缺的 XML。
```

**6. claude-haiku-4-5 的 max_tokens 应为 8192（非 8096）。**

#### 2.5 app.ts 配置
```typescript
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api", router);   // 健康检查、设置、统计等管理路由
app.use(proxyRouter);      // /v1/* 路由直接挂在根路径
```

#### 2.6 artifact.toml 路径配置
```toml
[[services]]
paths = ["/api", "/v1"]   # /v1 必须包含，否则生产环境无法访问
```

---

### 第三步：API Portal 前端

通过 createArtifact 创建，slug 为 `api-portal`，previewPath 为 `/`。

文件：`artifacts/api-portal/src/App.tsx`

要求（纯内联样式，深色主题 `hsl(222,47%,11%)`，无外部 UI 库依赖）：
- **Header**：图标 + 标题 "Replit2Api" + 副标题 + 实时在线检测（`fetch("/api/healthz")`，15 秒轮询，绿点脉冲动画）
- **Connection Details**：Base URL + Auth Header 说明，各含复制按钮
- **API Endpoints**：端点卡片，含 METHOD badge（GET 绿/POST 紫/DELETE 红）
- **Available Models**：Grid 布局，分组展示核心模型
- **CherryStudio 接入指引**：渐变圆形序号（1-4）+ 标题 + 描述
- **Quick Test**：带语法高亮色的 curl 示例代码块
- **Footer**：技术栈说明

---

### 第四步：重启与验证
```bash
# 重启 API Server
restart_workflow("artifacts/api-server: API Server")

# 验证 — 有 Token 返回模型列表
curl http://localhost:80/v1/models \
  -H "Authorization: Bearer $PROXY_API_KEY"

# 验证 — 无 Token 返回 401
curl -o /dev/null -w "%{http_code}" http://localhost:80/v1/models
# 期望输出：401

# 验证 — 非流式 Claude 请求
curl -X POST http://localhost:80/v1/messages \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":30,"messages":[{"role":"user","content":"hi"}]}'
# 期望返回 200

# 验证 — Tool Calling（多工具场景）
curl -X POST http://localhost:80/v1/chat/completions \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{"role": "user", "content": "查询东京天气和汇率"}],
    "tools": [
      {"type":"function","function":{"name":"get_weather","description":"获取天气","parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}},
      {"type":"function","function":{"name":"get_exchange_rate","description":"获取汇率","parameters":{"type":"object","properties":{"currency":{"type":"string"}},"required":["currency"]}}}
    ]
  }'
# 期望：返回 OpenAI 格式 tool_calls 数组，包含两个工具调用
```

---

### 第五步：发布
```javascript
// 展示门户
await presentArtifact({ artifactId: "artifacts/api-portal" });
// 建议发布
suggestDeploy();
```

发布后获得固定的 `.replit.app` 生产域名。

---

## 连接信息

| 项目 | 值 |
|------|-----|
| Base URL（生产） | `https://<your-repl>.replit.app` |
| API Key | Replit Secrets 中 `PROXY_API_KEY` 的值 |
| Auth 方式 | `Authorization: Bearer <PROXY_API_KEY>` |
| 备用 Auth | `x-api-key: <PROXY_API_KEY>`（Anthropic 客户端格式） |

---

## 注意事项

1. 不得向用户索取 OpenAI 或 Anthropic 的 API Key
2. AI Integrations 费用计入 Replit Credits，由平台统一管理
3. 生产环境 `.replit.app` 域名固定不变，开发域名每次重启可能变化
4. 所有配置数据（子节点列表、禁用模型）通过 GCS 持久化，发布后不丢失
5. **Gemini / OpenRouter 模型仅能通过子节点（friend proxy）提供服务**，本地节点只有 OpenAI 和 Anthropic Integration
6. SillyTavern 兼容模式设置建议也使用 `cloudPersist` 存储，避免 publish 后丢失
