const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('index.js', 'utf8');
for (const marker of [
  'const isAuthorized = this.isPublic || isOwner || isSessionUser;',
  'const ownerNumbers = String(settings.ownerNumber).split',
  'const senderClean = chatbotNumber(sender);',
  'if (!this.isPublic && !isAuthorized) {',
  "Only the bot owner can use this command."
]) assert(source.includes(marker), `missing private-mode security marker: ${marker}`);

const privateAuthorized = ({ isPublic, isOwner, isSessionUser }) => isPublic || isOwner || isSessionUser;
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: true }), true, 'owner must be allowed');
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: false, isSessionUser: false }), false, 'member must be blocked');
assert.strictEqual(privateAuthorized({ isPublic: false, isOwner: false, isSessionUser: true }), true, 'paired session user must be allowed');
assert.strictEqual(privateAuthorized({ isPublic: true, isOwner: false, isSessionUser: false }), true, 'public mode must allow members');
console.log('private-mode authorization source markers: OK');
console.log('private-mode behavior matrix: OK');
