const assert = require('assert');
const { buildCommandCategories } = require('../commands/menu-registry');
const tagadmin = require('../commands/tagadmin');
const repo = require('../commands/repo');
const pair = require('../commands/pair');

const categories = buildCommandCategories({ tagadmin, repo, pair });
assert(categories['👥 GROUP'].some(entry => entry.name === 'tagadmin'));
assert(categories['🛠️ TOOLS'].some(entry => entry.name === 'repo'));
assert(categories['👑 OWNER'].some(entry => entry.name === 'pair'));
assert.strictEqual(typeof tagadmin, 'function');
assert.strictEqual(typeof repo, 'function');
assert.strictEqual(typeof pair, 'function');

let sent;
const sock = { sendMessage: async (chatId, payload) => { sent = { chatId, payload }; return sent; } };
(async () => {
    await tagadmin(sock, '12345@s.whatsapp.net', { key: {} }, true);
    assert(sent.payload.text.includes('only in groups'));
    await tagadmin(sock, '12345@g.us', { key: {} }, false);
    assert(sent.payload.text.includes('Only group admins'));
    console.log('new command tests passed');
})().catch(error => { console.error(error); process.exit(1); });
