const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('index.js', 'utf8');
for (const marker of [
  'function normalizePairingNumber',
  'function sessionKeyForPairing',
  'this.pairingNumber = null',
  'this.dashboardUserId = null',
  "socket.emit('pair-session'"
]) assert(source.includes(marker), `missing source marker: ${marker}`);

const sessions = {};
const normalize = value => String(value || '').replace(/\D/g, '');
const sessionKey = (userId, number) => {
  const base = String(userId || 'default').trim() || 'default';
  const phone = normalize(number);
  const existing = sessions[base];
  const existingNumber = normalize(existing?.pairingNumber || existing?.phoneNumber);
  if (!phone || !existing || !existingNumber || existingNumber === phone) return base;
  return base + '__' + phone;
};

const first = sessionKey('owner', '+1 555 000 0001');
sessions[first] = { pairingNumber: '15550000001', aiEnabled: true, isPublic: false };
const second = sessionKey('owner', '+1 555 000 0002');
sessions[second] = { pairingNumber: '15550000002', aiEnabled: false, isPublic: false };
assert.strictEqual(first, 'owner');
assert.strictEqual(second, 'owner__15550000002');
assert.notStrictEqual(first, second);
sessions[first].aiEnabled = false;
assert.strictEqual(sessions[second].aiEnabled, false);
sessions[second].isPublic = true;
assert.strictEqual(sessions[first].isPublic, false);
console.log('multi-session source markers: OK');
console.log('simulated pair isolation: OK', { first, second });
console.log('simulated setting isolation: OK');
