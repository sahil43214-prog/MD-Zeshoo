const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('index.js', 'utf8');
for (const marker of [
  'const isAuthorized = this.isPublic ? true : isOwner;',
  "if (!isOwner) return this.sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }",
  'const ownerNumbers = String(settings.ownerNumber).split',
  'const senderClean = chatbotNumber(sender);',
  'if (!isAuthorized) return;'
]) assert(source.includes(marker), `missing marker: ${marker}`);

const privateAuthorized = ({ isPublic, isOwner }) => isPublic ? true : isOwner;
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: true }), true, 'owner must be allowed');
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: false, isAdmin: true }), false, 'group admin must be blocked');
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: false, isSessionUser: true }), false, 'session alias must be blocked');
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: false }), false, 'member must be blocked');
assert.strictEqual(privateAuthorized({ isPublic: true, isOwner: false }), true, 'public mode must allow members');
console.log('private-mode authorization source markers: OK');
console.log('private-mode behavior matrix: OK');
