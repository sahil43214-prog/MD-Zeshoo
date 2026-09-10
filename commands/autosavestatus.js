// autosavestatus — permanently save all viewed statuses before they expire (mode: on/off)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.autoSaveStatusEnabled === true ? 'on' : 'off';
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n💾 *AUTO SAVE STATUS*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.autosavestatus on - save every status permanently (media & text)\n.autosavestatus off - disable auto save` }, { quoted: msg });
    }
    if (!['on', 'off'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .autosavestatus on/off' }, { quoted: msg });
    botData.autoSaveStatusEnabled = mode === 'on';
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Auto save status ${mode === 'off' ? 'disabled' : 'enabled'} successfully! New statuses will be saved permanently.` }, { quoted: msg });
};
