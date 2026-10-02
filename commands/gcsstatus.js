const {
    downloadContentFromMessage,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');

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

function groupStatusContext(authorJid, attributionType = 10) {
    return {
        forwardingScore: 0,
        featureEligibilities: { canBeReshared: true, canReceiveMultiReact: true },
        pairedMediaType: 0,
        statusSourceType: 4,
        statusAttributions: [{ type: attributionType, groupStatus: { authorJid } }],
        isGroupStatus: true,
        statusAudienceMetadata: { audienceType: 1, listEmoji: '📌', listName: 'Group Story' }
    };
}

async function sendTextGroupStory(sock, groupJid, text) {
    const authorJid = jidNormalizedUser(sock.user?.id || '');
    const messageContent = {
        groupStatusMessageV2: {
            message: {
                extendedTextMessage: {
                    text,
                    font: 1,
                    backgroundArgb: 0xFF23313A,
                    contextInfo: groupStatusContext(authorJid, 6)
                }
            }
        }
    };
    const generated = generateWAMessageFromContent(groupJid, messageContent, { userJid: authorJid });
    await sock.relayMessage(groupJid, generated.message, { messageId: generated.key.id });
}

async function sendMediaGroupStory(sock, groupJid, mediaInput, messageKey, authorJid) {
    if (typeof sock.waUploadToServer !== 'function') {
        throw new Error('WhatsApp media upload helper is unavailable.');
    }
    const prepared = await prepareWAMessageMedia(mediaInput, { upload: sock.waUploadToServer });
    if (!prepared?.[messageKey]) throw new Error(`Could not prepare ${messageKey} for group story.`);
    prepared[messageKey].contextInfo = groupStatusContext(authorJid, 10);
    await sock.sendMessage(groupJid, prepared);
}

async function sendGroupStory(sock, groupJid, content, authorJid) {
    if (content.text !== undefined) {
        return sendTextGroupStory(sock, groupJid, content.text);
    }
    if (content.image) {
        return sendMediaGroupStory(sock, groupJid, { image: content.image, mimetype: content.mimetype, caption: content.caption || '' }, 'imageMessage', authorJid);
    }
    if (content.video) {
        return sendMediaGroupStory(sock, groupJid, { video: content.video, mimetype: content.mimetype || 'video/mp4', caption: content.caption || '' }, 'videoMessage', authorJid);
    }
    if (content.audio) {
        return sendMediaGroupStory(sock, groupJid, { audio: content.audio, mimetype: content.mimetype || 'audio/ogg; codecs=opus', ptt: Boolean(content.ptt) }, 'audioMessage', authorJid);
    }
    throw new Error('Unsupported group story content.');
}

module.exports = async function gcsstatus(sock, from, msg, q = '') {
    const quoted = getQuotedMessage(msg?.message);
    const quotedContent = unwrapMessage(quoted);
    const replyTarget = from?.endsWith('@g.us') ? (msg?.key?.participant || msg?.participant || from) : from;
    const reply = (payload) => sock.sendMessage(replyTarget, payload, { quoted: msg });
    const groupJids = await getAllGroupJids(sock);
    if (!groupJids.length) return reply({ text: '❌ Bot kisi group me participating nahi hai.' });

    const quotedImage = quotedContent.imageMessage;
    const quotedVideo = quotedContent.videoMessage;
    const quotedAudio = quotedContent.audioMessage;
    const quotedText = getText(quotedContent).trim();
    const directText = String(q || '').trim();
    const authorJid = jidNormalizedUser(sock.user?.id || '');
    let content;

    try {
        if (quotedImage) {
            content = { image: await downloadMedia(quotedImage, 'image'), caption: quotedText, mimetype: quotedImage.mimetype || 'image/jpeg' };
        } else if (quotedVideo) {
            content = { video: await downloadMedia(quotedVideo, 'video'), caption: quotedText, mimetype: quotedVideo.mimetype || 'video/mp4' };
        } else if (quotedAudio) {
            content = { audio: await downloadMedia(quotedAudio, 'audio'), mimetype: quotedAudio.mimetype || 'audio/ogg; codecs=opus', ptt: Boolean(quotedAudio.ptt) };
        } else if (quotedText || directText) {
            content = { text: quotedText || directText };
        } else {
            return reply({ text: '❌ Pehle kisi text/link/media ko bhejein, phir us message ko reply karke sirf .gcsstatus likhein.' });
        }

        let posted = 0;
        const failures = [];
        for (const groupJid of groupJids) {
            try {
                await sendGroupStory(sock, groupJid, content, authorJid);
                posted += 1;
            } catch (error) {
                failures.push(`${groupJid}: ${error.message}`);
                console.error(`[GCSSTATUS] ${groupJid} failed:`, error.message);
            }
        }

        if (!posted) throw new Error(failures[0] || 'No group story was accepted by WhatsApp.');
        return reply({
            text: `✅ GCS status direct group story par post ho gaya.\n👥 Groups: ${posted}/${groupJids.length}\n📌 Group chat me content send nahi kiya gaya.`
        });
    } catch (error) {
        console.error('[GCSSTATUS] Error:', error);
        return reply({ text: `❌ GCS status post nahi ho saka: ${error.message}` });
    }
};

module.exports.getQuotedMessage = getQuotedMessage;
module.exports.getAllGroupJids = getAllGroupJids;
module.exports.sendTextGroupStory = sendTextGroupStory;
