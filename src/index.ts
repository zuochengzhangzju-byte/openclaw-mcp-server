#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { OpenClawClient } from './openclaw-client.js';

const SERVER_NAME = 'openclaw-mcp-server';
const SERVER_VERSION = '0.1.0';

// --- Config from env ---
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || 'openclaw';
const OPENCLAW_TIMEOUT_MS = parseInt(process.env.OPENCLAW_TIMEOUT_MS || '120000', 10);

const client = new OpenClawClient(OPENCLAW_URL, OPENCLAW_GATEWAY_TOKEN, OPENCLAW_TIMEOUT_MS, OPENCLAW_MODEL);

// --- Tool definitions ---

const openclawChatTool = {
  name: 'openclaw_chat',
  description:
    'Send a message to your OpenClaw assistant and get a response. The assistant has access to web search, browser control, file operations, messaging, and more. Use this for any task that benefits from OpenClaw capabilities.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string',
        description: 'The message/task to send to OpenClaw',
      },
      session_id: {
        type: 'string',
        description: 'Optional session ID for conversation continuity',
      },
    },
    required: ['message'],
  },
};

const openclawStatusTool = {
  name: 'openclaw_status',
  description: 'Check if the OpenClaw Gateway is healthy and responding.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

// --- Server setup ---

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [openclawChatTool, openclawStatusTool] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'openclaw_chat': {
        const message = args?.message;
        if (typeof message !== 'string' || !message.trim()) {
          return { content: [{ type: 'text', text: 'Error: message is required' }], isError: true };
        }
        const sessionId = typeof args?.session_id === 'string' ? args.session_id : undefined;
        const result = await client.chat(message, sessionId);
        return {
          content: [
            {
              type: 'text',
              text: result.response || '(empty response)',
            },
          ],
        };
      }

      case 'openclaw_status': {
        const health = await client.health();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
