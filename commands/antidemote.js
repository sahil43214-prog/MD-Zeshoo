// antidemote — reverse unauthorized demotions in groups (mode: on/kick/off)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiDemote) botData.antiDemote = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiDemote[from] || 'off';
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n⬇️ *ANTI-DEMOTE SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.on — reverse demotion, keep action taker\n.kick — reverse demotion & kick action taker\n.off — disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .antidemote on/off/kick' }, { quoted: msg });
    botData.antiDemote[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-demote system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
