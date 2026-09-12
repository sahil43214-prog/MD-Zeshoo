const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const CHANNEL_JID = '120363429085670060@newsletter';
const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8vvB1Fcow4AY0NeC1p';
const CHANNEL_NAME = '𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧';

async function sendChannelButton(sock, chatId, quoted) {
    const interactive = generateWAMessageFromContent(chatId, {
        viewOnceMessage: {
            message: {
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({
                        text: '🔗 Follow the official MD-ZESHOO-BOT channel'
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.create({
                        text: CHANNEL_NAME
                    }),
                    header: proto.Message.InteractiveMessage.Header.create({
                        title: 'Official WhatsApp Channel',
                        hasMediaAttachment: false
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: [{
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: 'FOLLOW OFFICIAL CHANNEL',
                                url: CHANNEL_URL,
                                merchant_url: CHANNEL_URL
                            })
                        }]
                    }),
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: CHANNEL_JID,
                            newsletterName: CHANNEL_NAME,
                            serverMessageId: -1
                        }
                    }
                })
            }
        }
    }, { userJid: sock.user?.id, quoted });

    await sock.relayMessage(chatId, interactive.message, { messageId: interactive.key.id });
}

module.exports = {
    CHANNEL_JID,
    CHANNEL_URL,
    sendChannelButton
};
