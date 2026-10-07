const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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

        const groupName = String(group?.subject || 'WhatsApp Group').trim();
        const inviteUrl = `https://chat.whatsapp.com/${inviteCode.trim()}`;
        const outgoing = generateWAMessageFromContent(chatId, {
            interactiveMessage: {
                header: {
                    title: groupName,
                    subtitle: 'GROUP INVITATION'
                },
                body: {
                    text: `You are invited to join ${groupName}. Tap below to open the WhatsApp group invite.`
                },
                footer: {
                    text: 'WhatsApp Group Invite'
                },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Join group',
                            url: inviteUrl
                        })
                    }],
                    messageVersion: 1
                }
            }
        }, {
            userJid: sock.user?.id,
            quoted: msg
        });

        await sock.relayMessage(chatId, outgoing.message, {
            messageId: outgoing.key.id
        });
    } catch (error) {
        console.error(`[INVITE] Could not create Join group button: ${error.message}`);
        await reply('❌ Could not create the group invite. Make sure the bot is a group admin, then try `.invite` again.');
    }
};
