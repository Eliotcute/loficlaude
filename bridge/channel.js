#!/usr/bin/env node
// MCP channel server started by the terminal Claude Code (`loficlaude`).
// stdout carries MCP only; diagnostics go to stderr.
const net = require('node:net');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { channelSocketPath } = require('./config');
const { safeParse } = require('./protocol');
const { MAX_REPLY_CHARS } = require('./channelHub');

const mcp = new Server({ name: 'loficlaude', version: '1.0.0' }, {
  capabilities: { experimental: { 'claude/channel': {} }, tools: {} },
  instructions: [
    'LoFiClaude 房间（网页或手机）里用户发来的消息以 <channel source="loficlaude" sender="..."> 到达。',
    '回答房间消息时必须调用 reply 工具，只传回复正文，它会显示在房间里；不要只在终端里回答。',
    '用户在终端里直接输入的消息照常在终端回答。'
  ].join('\n')
});

const socket = net.connect(channelSocketPath);
let buffer = '';
let connected = false;
socket.setEncoding('utf8');
socket.on('connect', () => {
  connected = true;
  socket.write(`${JSON.stringify({ type: 'attach' })}\n`);
});
socket.on('data', (chunk) => {
  buffer += chunk;
  let index = buffer.indexOf('\n');
  while (index >= 0) {
    const data = safeParse(buffer.slice(0, index));
    buffer = buffer.slice(index + 1);
    if (data?.type === 'message' && typeof data.text === 'string') {
      mcp.notification({
        method: 'notifications/claude/channel',
        params: { content: data.text, meta: { sender: typeof data.sender === 'string' ? data.sender : 'browser' } }
      }).catch((error) => console.error(`LoFiClaude channel notify failed: ${error.message}`));
    } else if (data?.type === 'denied') {
      console.error(`LoFiClaude channel rejected: ${data.reason}`);
    }
    index = buffer.indexOf('\n');
  }
});
socket.on('error', (error) => console.error(`LoFiClaude channel socket error: ${error.message}`));
socket.on('close', () => { connected = false; });

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'reply',
    description: '把回复发送到 LoFiClaude 房间（网页/手机）',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: '回复正文' } }, required: ['text'] }
  }]
}));

mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'reply') throw new Error(`Unknown tool: ${request.params.name}`);
  const text = typeof request.params.arguments?.text === 'string' ? request.params.arguments.text.trim() : '';
  if (!text || text.length > MAX_REPLY_CHARS) return { isError: true, content: [{ type: 'text', text: 'reply text is empty or too long' }] };
  if (!connected) return { isError: true, content: [{ type: 'text', text: 'LoFiClaude Bridge is not connected' }] };
  socket.write(`${JSON.stringify({ type: 'reply', text })}\n`);
  return { content: [{ type: 'text', text: 'sent' }] };
});

mcp.connect(new StdioServerTransport()).catch((error) => {
  console.error(`LoFiClaude channel failed to start: ${error.message}`);
  process.exit(1);
});
