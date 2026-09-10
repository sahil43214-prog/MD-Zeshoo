const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const anti = fs.readFileSync(path.join(root, 'commands', 'antistatuslink.js'), 'utf8');
const allmenu = fs.readFileSync(path.join(root, 'commands', 'allmenu.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'commands', 'menu-registry.js'), 'utf8');

for (const mode of ['delete', 'warn', 'kick']) assert(anti.includes(`'${mode}'`), `${mode} mode missing`);
assert(anti.includes('antiStatusLinkGroups'), 'anti-status persistence missing');
assert(anti.includes('Bot ko group admin'), 'admin permission guidance missing');
assert(registry.includes("'antistatuslink'"), 'anti-status command category missing');
assert(registry.includes("antistatuslink delete/warn/kick/off"), 'anti-status menu label missing');
assert(allmenu.includes('COMMAND DIRECTORY'), 'allmenu directory layout missing');
assert(allmenu.includes("require('../settings')"), 'allmenu settings import missing');
assert(allmenu.includes('TOTAL COMMANDS'), 'allmenu total header missing');
assert(allmenu.includes('Unique commands'), 'allmenu unique count missing');
assert(allmenu.includes('Menu entries'), 'allmenu entry count missing');
assert(allmenu.includes('All registered commands are listed above'), 'allmenu complete-directory footer missing');
assert(allmenu.includes('https://whatsapp.com/channel/0029Vb8vvB1Fcow4AY0NeC1p'), 'official channel URL missing');
assert(allmenu.includes("name: 'cta_url'"), 'native channel URL button missing');
assert(allmenu.includes('Official Channel'), 'channel fallback footer missing');
assert(allmenu.includes('𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧'), 'allmenu branding missing');
assert(index.includes('SESSION  : PRIVATE'), 'connection private banner missing');
assert(index.includes('𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧'), 'quick menu branding missing');
assert(index.includes('𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 : 𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧'), 'quick menu footer missing');
assert(index.includes('function generateCategoryMenuText'), 'shared category renderer missing');
for (const route of ['ownermenu', 'groupmenu', 'downloadmenu', 'aimenu', 'toolsmenu', 'funmenu', 'animemenu', 'logomenu', 'textmakermenu', 'islamicmenu', 'miscmenu']) {
    assert(index.includes(`case '${route}'`), `${route} route missing`);
}
assert(index.includes('TOTAL: *${unique} unique / ${entries} entries*'), 'total count design missing');
console.log('status/menu branding checks: OK');
