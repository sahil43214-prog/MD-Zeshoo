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
assert(registry.includes("'antistatuslink'"), 'anti-status command category missing');
for (const marker of ['COMMAND DIRECTORY', 'TOTAL COMMANDS', 'Unique commands', 'Menu entries', 'All registered commands are listed above', 'Official Channel', '𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧']) {
    assert(allmenu.includes(marker), `allmenu marker missing: ${marker}`);
}
for (const route of ['ownermenu', 'groupmenu', 'downloadmenu', 'aimenu', 'toolsmenu', 'funmenu', 'animemenu', 'logomenu', 'textmakermenu', 'islamicmenu', 'miscmenu']) {
    assert(index.includes(`case '${route}'`), `${route} route missing`);
}
assert(index.includes('function generateCategoryMenuText'), 'shared category renderer missing');
assert(index.includes('isPublic = false'), 'private default missing');
console.log('status/menu branding checks: OK');
