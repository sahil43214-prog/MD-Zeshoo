module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiChannelPostGroups) botData.antiChannelPostGroups = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiChannelPostGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `📢 *ANTI-CHANNELPOST SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.antichannelpost on - block channel posts, delete & warn\n.antichannelpost warn - delete, warn & keep warnings\n.antichannelpost kick - delete & kick on warn limit\n.antichannelpost off - disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'warn', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .antichannelpost on/off/warn/kick' }, { quoted: msg });
    botData.antiChannelPostGroups[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-channelpost system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
