# OpenClaw MCP Server - 架构设计

> 目标：让 Codex CLI 通过 MCP 协议调用 OpenClaw 的能力

## 核心架构：两层模式

```
Codex CLI
    ↓ MCP (stdio)
openclaw-mcp-server
    ├── Layer 1: 委托工具 (chat completion)
    │   ├── openclaw_chat        → /v1/chat/completions
    │   ├── openclaw_status      → Gateway health check
    │   └── openclaw_task_*      → 异步任务管理
    │
    └── Layer 2: 直调工具 (Gateway WebSocket RPC)
        ├── web_search(query)     → 直接搜索
        ├── web_fetch(url)        → 直接抓取
        ├── exec(command)         → 命令执行
        ├── browser_snapshot()    → 浏览器快照
        ├── memory_search(query)  → 记忆搜索
        └── send_message(...)     → 跨平台消息
```

## Layer 1: 委托模式

Codex 发消息给 OpenClaw agent → agent 内部决定用啥工具 → 返回结果

```
Codex → openclaw_chat("帮我搜索AI新闻") → OpenClaw Agent → web_search → 返回
```

- 走 OpenAI 兼容的 `/v1/chat/completions` 端点
- 粗粒度，控制力弱，但马上能用

## Layer 2: 直调模式

Codex 直接调用 OpenClaw 的具体工具，精细控制参数

```
Codex → web_search(query="AI新闻") → Gateway WebSocket → 直接返回
```

- 走 Gateway WebSocket RPC
- 细粒度，控制力强，需要研究 RPC 协议

## 参考项目

| 项目 | 方向 | Stars | 借鉴点 |
|------|------|-------|--------|
| [freema/openclaw-mcp](https://github.com/freema/openclaw-mcp) | OpenClaw → MCP | ⭐145 | MCP Server 框架、OAuth、多实例、chat completion 调用 |
| [AIWerk/openclaw-mcp-bridge](https://github.com/AIWerk/openclaw-mcp-bridge) | MCP → OpenClaw | ⭐12 | Router 模式、registerTool 机制 |
| [CC Switch](https://github.com/farion1231/cc-switch) | 统一配置 | ⭐49001 | Codex MCP 配置格式参考 |

## 技术栈

- **语言**: TypeScript (Node.js)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **传输**: stdio (本地 Codex) / SSE (远程 Claude.ai)
- **认证**: OAuth 2.1 (借鉴 freema)
- **分发**: npm + Docker

## 实现计划

### Phase 1: Layer 1 MVP ✅ (当前)
1. 初始化项目 (TypeScript + MCP SDK)
2. 实现 `openclaw_chat` (走 /v1/chat/completions)
3. 实现 `openclaw_status` (健康检查)
4. Codex 配置 MCP server
5. 端到端验证

### Phase 2: Layer 1 完善
- 异步任务支持 (chat_async, task_status)
- 多实例支持 (InstanceRegistry)
- OAuth 认证
- 输入校验 + 错误处理

### Phase 3: Layer 2 直调工具 (⏸️ 暂停)
- **暂停原因**: 目前 OpenClaw 的 tools (web_search, exec, browser 等) 没有比 Codex 自带的能力更好，直调模式价值不大
- **恢复条件**: 等以后出现精品 tools（Codex 没有的独特能力）再完善 Layer 2
- 待办:
  - 研究 Gateway WebSocket RPC 协议
  - 实现 web_search, web_fetch, exec 等直调工具
  - Router 模式 (借鉴 AIWerk)

## Codex 配置方式

```json
// ~/.codex/config.json
{
  "mcpServers": {
    "openclaw": {
      "command": "node",
      "args": ["/path/to/openclaw-mcp-server/dist/index.js"],
      "env": {
        "OPENCLAW_URL": "http://127.0.0.1:18789",
        "OPENCLAW_GATEWAY_TOKEN": "your-token"
      }
    }
  }
}
```

## Gateway 前置要求

Layer 1 需要 Gateway 开启 HTTP chat completions 端点：

```json
// openclaw.json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  }
}
```
