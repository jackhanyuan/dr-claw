#!/usr/bin/env node
/**
 * Gemini Direct API Test Script
 * =============================
 * Tests OAuth token loading, refresh, and a real streaming API call.
 *
 * Usage:
 *   node scripts/test-gemini-api.mjs                  # basic streaming test (API key)
 *   node scripts/test-gemini-api.mjs --tool            # test with function calling
 *   node scripts/test-gemini-api.mjs --prompt "hello"  # custom prompt
 *   node scripts/test-gemini-api.mjs --oauth           # force OAuth (will fail on public API)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// ─── Config ──────────────────────────────────────────────────────────────────

const OAUTH_CREDS_PATH = join(homedir(), '.gemini', 'oauth_creds.json');
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3-flash-preview';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const useToolTest = args.includes('--tool');
const forceOAuth = args.includes('--oauth');
const customPrompt = args.includes('--prompt')
  ? args[args.indexOf('--prompt') + 1]
  : null;
const model = args.includes('--model')
  ? args[args.indexOf('--model') + 1]
  : DEFAULT_MODEL;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(label, msg) {
  console.log(`\x1b[36m[${label}]\x1b[0m ${msg}`);
}
function ok(msg) {
  console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
}
function fail(msg) {
  console.log(`\x1b[31m  ✗\x1b[0m ${msg}`);
}
function dim(msg) {
  console.log(`\x1b[2m  ${msg}\x1b[0m`);
}

// ─── Step 1: Resolve authentication ──────────────────────────────────────────

log('Step 1', 'Resolving authentication method');

let authHeaders = {};
let authMethod = 'none';

// Check API key first (unless --oauth forced)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (apiKey && !forceOAuth) {
  authHeaders = { 'x-goog-api-key': apiKey };
  authMethod = 'api-key';
  ok(`API key found: ${apiKey.slice(0, 15)}...`);
  dim('Note: generativelanguage.googleapis.com requires API key, not OAuth.');
  dim('OAuth tokens (cloud-platform scope) get 403 on this endpoint.');
}

// Load OAuth tokens (for display / future Vertex AI support)
let tokens = null;
try {
  const raw = await readFile(OAUTH_CREDS_PATH, 'utf-8');
  tokens = JSON.parse(raw);
  ok(`OAuth tokens also available (${tokens.scope?.split(' ').length || 0} scopes)`);

  if (forceOAuth) {
    authHeaders = { 'Authorization': `Bearer ${tokens.access_token}` };
    authMethod = 'oauth';
    dim('Forced OAuth mode — may get 403 on public generativelanguage API');
  }
} catch {
  dim('No OAuth tokens found (optional — API key is sufficient)');
}

if (authMethod === 'none') {
  fail('No authentication available.');
  console.log('Set GEMINI_API_KEY env var or run `gemini auth login`.\n');
  process.exit(1);
}

ok(`Using: ${authMethod}`);

// ─── Step 2: Test API call ───────────────────────────────────────────────────

if (useToolTest) {
  log('Step 2', `Testing function calling with model: ${model} (auth: ${authMethod})`);

  const requestBody = {
    systemInstruction: { parts: [{ text: 'You are a helpful assistant. Use the provided tools when appropriate.' }] },
    contents: [
      { role: 'user', parts: [{ text: customPrompt || 'What is 42 * 17? Use the calculator tool.' }] },
    ],
    tools: [{
      functionDeclarations: [{
        name: 'calculator',
        description: 'Perform arithmetic calculations',
        parameters: {
          type: 'OBJECT',
          properties: {
            expression: { type: 'STRING', description: 'Math expression to evaluate' },
          },
          required: ['expression'],
        },
      }],
    }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  };

  const url = `${API_BASE}/models/${model}:generateContent`;
  dim(`POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    fail(`API error (${res.status}): ${errBody.slice(0, 500)}`);
    process.exit(1);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const usage = data.usageMetadata;

  console.log('\n\x1b[33m── Response ──\x1b[0m');
  for (const part of parts) {
    if (part.text) {
      console.log(`  Text: ${part.text}`);
    }
    if (part.functionCall) {
      console.log(`  FunctionCall: ${part.functionCall.name}(${JSON.stringify(part.functionCall.args)})`);
    }
  }

  if (usage) {
    console.log(`\n\x1b[33m── Usage ──\x1b[0m`);
    console.log(`  Prompt tokens: ${usage.promptTokenCount}`);
    console.log(`  Output tokens: ${usage.candidatesTokenCount}`);
    console.log(`  Total tokens:  ${usage.totalTokenCount}`);
  }

  ok('Function calling test passed!');

} else {
  log('Step 2', `Testing streaming with model: ${model} (auth: ${authMethod})`);

  const prompt = customPrompt || 'Count from 1 to 5, one number per line. Nothing else.';
  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  const url = `${API_BASE}/models/${model}:streamGenerateContent?alt=sse`;
  dim(`POST ${url}`);
  dim(`Prompt: "${prompt}"`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errBody = await res.text();
    fail(`API error (${res.status}): ${errBody.slice(0, 500)}`);
    process.exit(1);
  }

  console.log('\n\x1b[33m── Streaming Response ──\x1b[0m');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let lastUsage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.usageMetadata) lastUsage = parsed.usageMetadata;

        const parts = parsed.candidates?.[0]?.content?.parts;
        if (!parts) continue;

        for (const part of parts) {
          if (part.text) {
            process.stdout.write(part.text);
            fullText += part.text;
          }
        }
      } catch {}
    }
  }

  console.log('\n');

  if (lastUsage) {
    console.log(`\x1b[33m── Usage ──\x1b[0m`);
    console.log(`  Prompt tokens: ${lastUsage.promptTokenCount}`);
    console.log(`  Output tokens: ${lastUsage.candidatesTokenCount}`);
    console.log(`  Total tokens:  ${lastUsage.totalTokenCount}`);
  }

  ok(`Streaming test passed! (${fullText.length} chars received)`);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n\x1b[32m═══ All tests passed ═══\x1b[0m');
console.log(`  Auth: ${authMethod}`);
console.log(`  Model: ${model}`);
console.log(`  Endpoint: ${API_BASE}`);
if (authMethod === 'api-key') {
  console.log(`  API key: ${apiKey.slice(0, 15)}...`);
}
if (tokens) {
  console.log(`  OAuth also available (for future Vertex AI support)`);
}
console.log(`  Ready for gemini-api.js integration.\n`);
