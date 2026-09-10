// autorecordtyping — auto show recording/typing presence in chats (mode: on/off/recording/typing)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.autoPresence) botData.autoPresence = 'off';
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.autoPresence || 'off';
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n🎙️ *AUTO RECORD/TYPING*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.autorecordtyping on - alternate recording & typing presence\n.autorecordtyping recording - always recording\n.autorecordtyping typing - always typing\n.autorecordtyping off - disable` }, { quoted: msg });
    }
    if (!['on', 'off', 'recording', 'typing'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .autorecordtyping on/off/recording/typing' }, { quoted: msg });
    botData.autoPresence = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Auto presence set to *${mode.toUpperCase()}* successfully!` }, { quoted: msg });
};
