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

        const inviteUrl = `https://chat.whatsapp.com/${inviteCode}`;
        await sock.sendMessage(chatId, {
            groupInvite: {
                jid: chatId,
                inviteCode,
                inviteExpiration: 0,
                subject: String(group?.subject || 'Group chat'),
                text: `🔗 Group Link:\n${inviteUrl}`
            }
        }, { quoted: msg });
    } catch (error) {
        console.error(`[INVITE] Could not create native group invite: ${error.message}`);
        await sock.sendMessage(chatId, {
            text: '❌ Could not create the group invite. Make sure the bot can access this group.'
        }, { quoted: msg });
    }
};
