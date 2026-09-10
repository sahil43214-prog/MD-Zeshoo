// autoviewstatus — auto-view (mark as seen) all incoming statuses (mode: on/off)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.autoViewStatusEnabled === true ? 'on' : 'off';
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n👀 *AUTO VIEW STATUS*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.autoviewstatus on - auto view all incoming statuses\n.autoviewstatus off - disable auto view` }, { quoted: msg });
    }
    if (!['on', 'off'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .autoviewstatus on/off' }, { quoted: msg });
    botData.autoViewStatusEnabled = mode === 'on';
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Auto view status ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
