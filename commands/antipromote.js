// antipromote — reverse unauthorized promotions in groups (mode: on/kick/off)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiPromote) botData.antiPromote = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiPromote[from] || 'off';
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n⬆️ *ANTI-PROMOTE SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.on — reverse promotion, keep action taker\n.kick — reverse promotion & kick action taker\n.off — disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .antipromote on/off/kick' }, { quoted: msg });
    botData.antiPromote[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-promote system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
