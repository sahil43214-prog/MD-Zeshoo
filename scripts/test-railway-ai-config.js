const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('index.js', 'utf8');
assert(source.includes('process.env.OPENAI_API_KEY || process.env.AI_API_KEY'), 'AI key aliases missing');
assert(source.includes('process.env.AI_BASE_URL || process.env.OPENAI_API_BASE'), 'AI base URL aliases missing');
assert(source.includes("status === 401"), '401 mapping missing');
assert(source.includes("status === 404"), '404 mapping missing');
assert(source.includes("status === 429"), '429 mapping missing');
assert(source.includes('aiQuotaUntil'), 'quota cooldown state missing');
assert(source.includes('AI_QUOTA_COOLDOWN_MS'), 'quota cooldown configuration missing');
assert(source.includes('configuredAIModel'), 'runtime model config missing');
assert(source.includes('max_completion_tokens: 500'), 'GPT-5 token parameter missing');
assert(source.includes('max_tokens: 500'), 'legacy token parameter missing');
assert(source.includes('AI_FALLBACK_MODEL'), 'fallback model setting missing');
assert(source.includes('attempts.push({})'), 'provider token-field retry missing');
function normalize(value) {
  let baseURL = String(value || '').trim().replace(/^['"]|['"]$/g, '');
  baseURL = baseURL.replace(/\/+$/, '');
  try {
    const parsed = new URL(baseURL || 'https://api.openai.com/v1');
    if (!parsed.pathname || parsed.pathname === '/') parsed.pathname = '/v1';
    return parsed.toString().replace(/\/$/, '');
  } catch (_) { return baseURL; }
}
assert.strictEqual(normalize('https://api.openai.com'), 'https://api.openai.com/v1');
assert.strictEqual(normalize('https://api.openai.com/v1/'), 'https://api.openai.com/v1');
console.log('Railway AI configuration checks: OK');
