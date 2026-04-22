# OpenClaw MCP Server

MCP (Model Context Protocol) server that bridges Codex CLI to OpenClaw Gateway.

## Architecture

```
Codex CLI  ←MCP (stdio)→  openclaw-mcp-server  ←HTTP→  OpenClaw Gateway
```

## Layer 1: Delegation Mode (Current)

Codex sends messages to OpenClaw agent → agent decides which tools to use → returns result.

**Available Tools:**

| Tool | Description |
|------|-------------|
| `openclaw_chat` | Send message to OpenClaw assistant |
| `openclaw_status` | Check Gateway health |

## Quick Start

### 1. Prerequisites

- Node.js 20+
- OpenClaw Gateway running with chat completions enabled

Enable chat completions in OpenClaw:
```bash
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
openclaw gateway restart
```

### 2. Install

```bash
cd /Users/zhang/.openclaw/workspace/projects/openclaw-mcp-server
npm install
npm run build
```

### 3. Configure Codex

```bash
# Add MCP server to Codex
codex mcp add openclaw -- node /path/to/openclaw-mcp-server/dist/index.js
```

Or edit `~/.codex/config.toml`:
```toml
[mcp_servers.openclaw]
command = "node"
args = ["/Users/zhang/.openclaw/workspace/projects/openclaw-mcp-server/dist/index.js"]

[mcp_servers.openclaw.env]
OPENCLAW_URL = "http://127.0.0.1:18789"
OPENCLAW_GATEWAY_TOKEN = "your-gateway-token"
OPENCLAW_MODEL = "openclaw"
OPENCLAW_TIMEOUT_MS = "120000"
```

### 4. Verify

```bash
codex mcp list
codex mcp get openclaw
```

### 5. Use in Codex

```bash
codex
# Then ask: "Use openclaw_chat to search for recent AI news"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_URL` | `http://127.0.0.1:18789` | Gateway URL |
| `OPENCLAW_GATEWAY_TOKEN` | - | Gateway auth token |
| `OPENCLAW_MODEL` | `openclaw` | Model name |
| `OPENCLAW_TIMEOUT_MS` | `120000` | Request timeout |

## Development

```bash
npm run dev    # Watch mode
npm run build  # Compile
```

## Roadmap

- [x] Layer 1: Delegation mode (chat completion)
- [ ] Layer 2: Direct tool calling (web_search, exec, browser, etc.)
- [ ] Async task support
- [ ] Multi-instance support
- [ ] SSE transport for remote access
- [ ] OAuth authentication

## License

MIT
