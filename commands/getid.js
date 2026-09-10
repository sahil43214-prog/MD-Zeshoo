// getid — show bot owner ID, sender ID, or any user's ID by mention/reply/number
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const q = (args.join(' ') || '').trim();
    let targetJid = from;
    let label = from.endsWith('@g.us') ? '👥 Group ID' : '👤 User ID';

    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (q && /^[0-9]{5,20}$/.test(q.replace(/[^0-9]/g, ''))) {
        targetJid = `${q.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        label = '👤 User ID';
    } else if (from.endsWith('@g.us') && (!q || q.toLowerCase() === 'me')) {
        targetJid = msg.key.participant || msg.key.remoteJid || from;
        label = '👤 Your ID';
    } else if (!q) {
        targetJid = from;
        label = from.endsWith('@g.us') ? '👥 Group ID' : '👤 Chat ID';
    }

    const botJid = sock.user?.id || 'unknown';
    return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n🤖 *Bot ID:*\n${botJid}\n\n${label}:\n${targetJid}` }, { quoted: msg });
};
