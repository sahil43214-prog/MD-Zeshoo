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

module.exports = async function deleteCommand(sock, chatId, msg, isAdmin) {
    if (!String(chatId || '').endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ `.delete` sirf group mein kaam karta hai.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(chatId, { text: '❌ `.delete` sirf group admin use kar sakte hain.' }, { quoted: msg });
    }

    const contextInfo = getContextInfo(msg?.message);
    const targetMessageId = contextInfo?.stanzaId;
    const targetParticipant = contextInfo?.participant;
    if (!targetMessageId || !targetParticipant) {
        return sock.sendMessage(chatId, { text: '❌ Jis message ko delete karna hai, usi par reply karke `.delete` likho.' }, { quoted: msg });
    }

    const botJid = normalizeJid(sock.user?.id);
    const targetKey = {
        remoteJid: chatId,
        fromMe: Boolean(botJid && normalizeJid(targetParticipant) === botJid),
        id: targetMessageId,
        participant: targetParticipant
    };
    const errors = [];

    try {
        await sock.sendMessage(chatId, { delete: targetKey });
    } catch (error) {
        errors.push(`Target message delete nahi hua (${error.message}). Bot ko group admin hona zaroori hai.`);
    }

    try {
        await sock.sendMessage(chatId, { delete: msg.key });
    } catch (error) {
        errors.push(`Aapka .delete command delete nahi hua (${error.message}).`);
    }

    if (errors.length) {
        try {
            await sock.sendMessage(chatId, { text: `❌ ${errors.join('\n')}` }, { quoted: msg });
        } catch (_) {}
    }
};
