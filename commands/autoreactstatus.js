// autoreactstatus — auto-react with a random emoji to your own WhatsApp statuses
const EMOJIS = ['❤️', '🔥', '😍', '👏', '🙌', '💯', '✨', '🥰', '😂', '💐'];

module.exports = async (sock, from, msg, isOwner, botData, saveBotData, args) => {
    if (!isOwner) return await sock.sendMessage(from, { text: '❌ Sirf bot owner ye command use kar sakta hai.' }, { quoted: msg });
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = (botData.autoReactStatus && botData.autoReactStatus === 'on') ? 'on' : 'off';
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n😍 *AUTO REACT STATUS*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.autoreactstatus on - auto react to owner statuses\n.autoreactstatus off - disable auto status reactions` }, { quoted: msg });
    }
    if (!['on', 'off'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .autoreactstatus on/off' }, { quoted: msg });
    if (!botData.autoReactStatus) botData.autoReactStatus = 'off';
    botData.autoReactStatus = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Auto-react to status ${mode === 'off' ? 'disabled' : 'enabled'} successfully! Bot will now react to your statuses.` }, { quoted: msg });
};

module.exports.EMOJIS = EMOJIS;
