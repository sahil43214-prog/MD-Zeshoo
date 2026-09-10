module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiContactGroups) botData.antiContactGroups = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiContactGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `📇 *ANTI-CONTACT SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.anticontact on - block contacts, delete & warn\n.anticontact warn - delete, warn & keep warnings\n.anticontact kick - delete & kick on warn limit\n.anticontact off - disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'warn', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .anticontact on/off/warn/kick' }, { quoted: msg });
    botData.antiContactGroups[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-contact system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
