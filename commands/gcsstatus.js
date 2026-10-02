const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function unwrapMessage(message) {
    let current = message || {};
    for (let depth = 0; depth < 8 && current; depth += 1) {
        const wrapper = current.ephemeralMessage || current.viewOnceMessage || current.viewOnceMessageV2 || current.documentWithCaptionMessage;
        if (!wrapper?.message) break;
        current = wrapper.message;
    }
    return current || {};
}

function getQuotedMessage(message) {
    const content = unwrapMessage(message);
    return content.extendedTextMessage?.contextInfo?.quotedMessage ||
        content.imageMessage?.contextInfo?.quotedMessage ||
        content.videoMessage?.contextInfo?.quotedMessage ||
        content.documentMessage?.contextInfo?.quotedMessage ||
        content.audioMessage?.contextInfo?.quotedMessage ||
        null;
}

function getText(message) {
    const content = unwrapMessage(message);
    return content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.audioMessage?.caption ||
        '';
}

async function downloadMedia(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function getAllGroupJids(sock) {
    if (typeof sock.groupFetchAllParticipating !== 'function') {
        throw new Error('This Baileys version does not support fetching participating groups.');
    }
    const groups = await sock.groupFetchAllParticipating();
    return [...new Set(Object.keys(groups || {}).filter(jid => jid.endsWith('@g.us')))];
}

module.exports = async function gcsstatus(sock, from, msg, q = '') {
    const quoted = getQuotedMessage(msg?.message);
    const quotedContent = unwrapMessage(quoted);
    const replyTarget = from?.endsWith('@g.us') ? (msg?.key?.participant || msg?.participant || from) : from;
    const reply = (payload) => sock.sendMessage(replyTarget, payload, { quoted: msg });
    const groupJids = await getAllGroupJids(sock);
    if (!groupJids.length) {
        return reply({ text: '❌ Bot kisi group me participating nahi hai.' });
    }

    const statusOptions = {
        broadcast: true,
        statusJidList: groupJids
    };
    const quotedImage = quotedContent.imageMessage;
    const quotedVideo = quotedContent.videoMessage;
    const quotedAudio = quotedContent.audioMessage;
    const quotedText = getText(quotedContent).trim();
    const directText = String(q || '').trim();

    try {
        if (quotedImage) {
            const buffer = await downloadMedia(quotedImage, 'image');
            await sock.sendMessage('status@broadcast', { image: buffer, caption: quotedText }, statusOptions);
        } else if (quotedVideo) {
            const buffer = await downloadMedia(quotedVideo, 'video');
            await sock.sendMessage('status@broadcast', { video: buffer, caption: quotedText, mimetype: quotedVideo.mimetype || 'video/mp4' }, statusOptions);
        } else if (quotedAudio) {
            const buffer = await downloadMedia(quotedAudio, 'audio');
            await sock.sendMessage('status@broadcast', { audio: buffer, mimetype: quotedAudio.mimetype || 'audio/ogg; codecs=opus', ptt: Boolean(quotedAudio.ptt) }, statusOptions);
        } else if (quotedText || directText) {
            await sock.sendMessage('status@broadcast', { text: quotedText || directText }, statusOptions);
        } else {
            return reply({
                text: '❌ Pehle kisi text/link/media ko bhejein, phir us message ko reply karke sirf .gcsstatus likhein.'
            });
        }

        return reply({
            text: `✅ GCS status direct story par post ho gaya.\n👥 Groups: ${groupJids.length}\n📌 Group chat me content send nahi kiya gaya.`
        });
    } catch (error) {
        console.error('[GCSSTATUS] Error:', error);
        return reply({ text: `❌ GCS status post nahi ho saka: ${error.message}` });
    }
};

module.exports.getQuotedMessage = getQuotedMessage;
module.exports.getAllGroupJids = getAllGroupJids;
