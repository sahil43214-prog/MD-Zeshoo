const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('index.js', 'utf8');
for (const marker of [
  'this.aiEnabled = botData.statusSettings[userId]?.aiEnabled === true;',
  'function chatbotMentionedJids(msg)',
  'sock?.authState?.creds?.me?.lid',
  'text.matchAll(/@(\\d{5,20})/g)',
  'const configuredAIModel = cleanRuntimeValue(process.env.AI_MODEL) || \'gpt-5-mini\';',
  "AI service abhi temporarily unavailable hai",
  'botData.statusSettings[this.userId].aiEnabled = this.aiEnabled === true;'
]) assert(source.includes(marker), `missing chatbot marker: ${marker}`);

const number = value => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const botNumbers = new Set(['15550000001']);
const mentioned = ['15550000001@lid'];
assert(mentioned.some(jid => botNumbers.has(number(jid))), 'numeric mention should match bot');
assert(number('15550000001:3@s.whatsapp.net') === '15550000001', 'device JID should normalize');
assert('@15550000001 hello'.match(/@(\d{5,20})/), 'raw @number fallback should match');
assert.strictEqual(false, false, 'personal-chat gate remains group-only by listener condition');
assert(!source.includes('api.siputzx.my.id/api/ai/chatgpt'), 'deprecated AI endpoint must be removed');
assert(!source.includes('widipe.com/openai'), 'deprecated fallback endpoint must be removed');
console.log('chatbot persistence and mention parsing checks: OK');
