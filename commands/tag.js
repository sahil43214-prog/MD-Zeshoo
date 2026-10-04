function unwrapMessage(message) {
    let content = message || {};
    for (let i = 0; i < 5; i += 1) {
        const wrapped = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message ||
            content.viewOnceMessageV2Extension?.message ||
            content.documentWithCaptionMessage?.message;
        if (!wrapped) break;
        content = wrapped;
    }
    return content;
}

function getContextInfo(message) {
    const content = unwrapMessage(message);
    for (const value of Object.values(content)) {
        if (value && typeof value === 'object' && value.contextInfo) return value.contextInfo;
    }
    return null;
}

function normalizeJid(jid) {
    return String(jid || '').replace(/:\d+(?=@)/, '');
}

module.exports = async function tagCommand(sock, chatId, msg, isAdmin) {
    if (!String(chatId || '').endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ `.tag` sirf group mein kaam karta hai.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(chatId, { text: '❌ `.tag` sirf group admin use kar sakte hain.' }, { quoted: msg });
    }

    const contextInfo = getContextInfo(msg?.message);
    const targetMessageId = contextInfo?.stanzaId;
    const targetParticipant = contextInfo?.participant;
    const targetMessage = contextInfo?.quotedMessage;
    if (!targetMessageId || !targetParticipant || !targetMessage) {
        return sock.sendMessage(chatId, { text: '❌ Kisi member ke message par reply karke `.tag` likho.' }, { quoted: msg });
    }

    const botJid = normalizeJid(sock.user?.id);
    const quoted = {
        key: {
            remoteJid: chatId,
            fromMe: Boolean(botJid && normalizeJid(targetParticipant) === botJid),
            id: targetMessageId,
            participant: targetParticipant
        },
        message: targetMessage
    };
    const mentionJid = normalizeJid(targetParticipant);
    const mentionName = mentionJid.split('@')[0];

    try {
        await sock.sendMessage(chatId, {
            text: `📣 @${mentionName} ka message group ke liye:`,
            mentions: [mentionJid]
        }, { quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ Message tag nahi ho saka: ${error.message}` }, { quoted: msg });
    }
};
