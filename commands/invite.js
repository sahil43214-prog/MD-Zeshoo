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
        const code = typeof inviteCode === 'string' ? inviteCode.trim() : '';
        if (!code) {
            throw new Error('WhatsApp returned no group invite code');
        }

        const groupName = String(group?.subject || 'WhatsApp Group').trim();
        const descriptionText = String(group?.desc || '')
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const description = descriptionText.length > 180
            ? `${descriptionText.slice(0, 177).trimEnd()}…`
            : descriptionText;
        const participantCount = Array.isArray(group?.participants) ? group.participants.length : null;
        const memberCount = Number.isFinite(group?.size) && group.size > 0
            ? group.size
            : participantCount;
        const inviteLink = `https://chat.whatsapp.com/${code}`;
        const captionLines = ['Group chat invite'];
        if (description) captionLines.push('', 'About:', description);
        if (memberCount !== null) captionLines.push('', `👥 ${memberCount} members`);
        if (group?.joinApprovalMode) captionLines.push('🛡️ Admin approval may be required to join.');
        captionLines.push('', '🔗 Group Link:', inviteLink);

        await sock.sendMessage(chatId, {
            groupInvite: {
                jid: chatId,
                inviteCode: code,
                inviteExpiration: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                subject: groupName,
                text: captionLines.join('\n')
            }
        }, { quoted: msg });
    } catch (error) {
        console.error(`[INVITE] Could not create native group invite: ${error.message}`);
        await reply('❌ Could not create the group invite. Make sure the bot is a group admin, then try `.invite` again.');
    }
};
