module.exports = async function tagadminCommand(sock, chatId, msg, isAdmin) {
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ This command works only in groups.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(chatId, { text: '❌ Only group admins can use .tagadmin.' }, { quoted: msg });
    }
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(participant =>
            participant.admin === 'admin' || participant.admin === 'superadmin'
        );
        if (!admins.length) {
            return sock.sendMessage(chatId, { text: '⚠️ No group admins found.' }, { quoted: msg });
        }
        const mentions = admins.map(participant => participant.id);
        const text = [
            '📢 *GROUP ADMINS*',
            '',
            ...mentions.map(jid => `@${jid.split('@')[0]}`),
            '',
            `👑 Total admins: ${mentions.length}`
        ].join('\n');
        return sock.sendMessage(chatId, { text, mentions }, { quoted: msg });
    } catch (error) {
        return sock.sendMessage(chatId, { text: '❌ Unable to read group admins right now.' }, { quoted: msg });
    }
};

module.exports.menuCategory = '👥 GROUP';
module.exports.menuLabel = 'tagadmin (mention admins)';
