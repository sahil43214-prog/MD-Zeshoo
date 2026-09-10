module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiPollGroups) botData.antiPollGroups = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiPollGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `📊 *ANTI-POLL SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.antipoll on - block polls, delete & warn\n.antipoll warn - block polls, delete, warn & keep 3 warnings\n.antipoll kick - block polls, delete & kick on warn limit\n.antipoll off - disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'warn', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .antipoll on/off/warn/kick' }, { quoted: msg });
    botData.antiPollGroups[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-poll system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
