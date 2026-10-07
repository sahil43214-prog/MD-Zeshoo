module.exports = async function inviteCommand(sock, chatId, msg, isAdmin) {
    if (!isAdmin) {
        return await sock.sendMessage(chatId, { text: '❌ Only a group admin can create an invite.' }, { quoted: msg });
    }
    if (!String(chatId || '').endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command can only be used in a group.' }, { quoted: msg });
    }

    try {
        const [inviteCode, group] = await Promise.all([
            sock.groupInviteCode(chatId),
            sock.groupMetadata(chatId)
        ]);
        if (!inviteCode) throw new Error('No invite code returned');

        await sock.sendMessage(chatId, {
            groupInvite: {
                jid: chatId,
                inviteCode,
                inviteExpiration: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                subject: String(group?.subject || 'Group chat'),
                text: 'Tap Join group below to open this group invite.'
            }
        }, { quoted: msg });
    } catch (error) {
        console.error(`[INVITE] Could not create native group invite: ${error.message}`);
        await sock.sendMessage(chatId, {
            text: '❌ Group invite link could not be fetched. The bot itself must be a group admin; promote the bot, then run `.invite` again.'
        }, { quoted: msg });
    }
};
