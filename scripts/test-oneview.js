const assert = require('assert');
const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

assert(index.includes('Owner-only view-once recovery'), 'owner-only oneview handler missing');
assert(index.includes('quotedMessage?.viewOnceMessage'), 'view-once quoted wrapper missing');
assert(index.includes('quotedMessage?.viewOnceMessageV2'), 'view-once V2 quoted wrapper missing');
assert(index.includes('const unwrapQuoted = (value)'), 'nested quoted wrapper unwrapping missing');
assert(index.includes('quotedMedia?.viewOnce === true'), 'direct media view-once flag missing');
assert(index.includes("quotedContent?.imageMessage ? 'image' : quotedContent?.videoMessage ? 'video'"), 'image/video detection missing');
assert(index.includes('downloadContentFromMessage(quotedMedia, quotedMediaType)'), 'view-once download missing');
assert(index.includes('ownerNumbers[0] ? `${ownerNumbers[0]}@s.whatsapp.net` : sender'), 'owner inbox routing missing');
assert(index.includes('if (isOwner && emojiTrigger && quotedIsViewOnce && quotedMediaType && quotedMedia)'), 'owner-only emoji gate missing');
assert(index.includes('try { await this.sock.sendMessage(from, { delete: msg.key }); }'), 'trigger cleanup missing');
assert(index.includes('const emojiText = String('), 'emoji text normalization missing');
assert(index.includes('const emojiTrigger = Boolean('), 'unicode emoji trigger missing');

console.log('oneview owner-only recovery checks: OK');
console.log('oneview privacy routing checks: OK');
console.log('oneview image/video checks: OK');
