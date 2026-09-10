module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiLocationGroups) botData.antiLocationGroups = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiLocationGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `📍 *ANTI-LOCATION SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.antilocation on - block location shares, delete & warn\n.antilocation warn - block locations, delete, warn & keep 3 warnings\n.antilocation kick - block locations, delete & kick on warn limit\n.antilocation off - disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'warn', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .antilocation on/off/warn/kick' }, { quoted: msg });
    botData.antiLocationGroups[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-location system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
