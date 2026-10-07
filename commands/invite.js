module.exports = async function inviteCommand(sock, chatId, msg, isAdmin) {
    const reply = text => sock.sendMessage(chatId, { text }, { quoted: msg });

    if (!isAdmin) {
        return await reply('❌ Only a group admin can create an invite.');
    }
    if (!String(chatId || '').endsWith('@g.us')) {
        return await reply('❌ This command can only be used in a group.');
    }

    try {
        const [inviteCode, group] = await Promise.all([
            sock.groupInviteCode(chatId),
            sock.groupMetadata(chatId)
        ]);
        if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
            throw new Error('WhatsApp returned no group invite code');
        }

        const code = inviteCode.trim();
        const inviteLink = `https://chat.whatsapp.com/${code}`;

        await sock.sendMessage(chatId, {
            groupInvite: {
                jid: chatId,
                inviteCode: code,
                inviteExpiration: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                subject: String(group?.subject || 'Group chat'),
                text: `Group chat invite\n\n${inviteLink}`
            }
        }, { quoted: msg });
    } catch (error) {
        console.error(`[INVITE] Could not create native group invite: ${error.message}`);
        await reply('❌ Could not create the group invite. Make sure the bot is a group admin, then try `.invite` again.');
    }
};
