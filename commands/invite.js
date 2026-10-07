module.exports = async function inviteCommand(sock, chatId, msg, isAdmin) {
    const reply = text => sock.sendMessage(chatId, { text }, { quoted: msg });

    if (!isAdmin) {
        return await reply('❌ Only a group admin can create an invite.');
    }
    if (!String(chatId || '').endsWith('@g.us')) {
        return await reply('❌ This command can only be used in a group.');
    }

    try {
        const group = await sock.groupMetadata(chatId);
        const inviteCode = await sock.groupInviteCode(chatId);
        if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
            throw new Error('WhatsApp returned no group invite code');
        }

        await sock.sendMessage(chatId, {
            groupInvite: {
                jid: chatId,
                inviteCode: inviteCode.trim(),
                inviteExpiration: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                subject: String(group?.subject || 'Group chat'),
                text: 'Group chat invite'
            }
        }, { quoted: msg });
    } catch (error) {
        console.error(`[INVITE] Native invite generation failed: ${error.message}`);
        await reply('❌ WhatsApp could not fetch this group invite. The bot itself must be a group admin; then run `.invite` again.');
    }
};
