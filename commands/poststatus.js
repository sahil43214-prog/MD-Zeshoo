const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function unwrapMessage(message) {
    return message?.ephemeralMessage?.message ||
        message?.viewOnceMessage?.message ||
        message?.viewOnceMessageV2?.message ||
        message || {};
}

function getQuotedMessage(message) {
    const content = unwrapMessage(message);
    return content.extendedTextMessage?.contextInfo?.quotedMessage ||
        content.imageMessage?.contextInfo?.quotedMessage ||
        content.videoMessage?.contextInfo?.quotedMessage ||
        content.documentMessage?.contextInfo?.quotedMessage ||
        null;
}

async function downloadMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function fetchRemoteMedia(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`URL returned ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) return null;
    return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
}

async function sendStatus(sock, payload, options) {
    const result = await sock.sendMessage('status@broadcast', payload, options);
    if (!result?.key?.id) throw new Error('WhatsApp did not return a status message ID.');
    return result;
}

async function getStatusOptions(sock, from) {
    // WhatsApp Status is not posted inside a group chat. When the command is
    // used in a group, explicitly target that group's members as the audience.
    if (!from?.endsWith('@g.us')) return {};
    const metadata = await sock.groupMetadata(from);
    const botId = sock.user?.id?.split(':')[0];
    const statusJidList = (metadata.participants || [])
        .map(participant => participant.id)
        .filter(Boolean)
        .filter(jid => jid.split(':')[0] !== botId);
    if (!statusJidList.length) throw new Error('No valid group members found for the status audience.');
    return { statusJidList };
}

module.exports = async function postStatus(sock, from, msg, isAdmin, args = []) {
    if (!isAdmin) {
        return sock.sendMessage(from, { text: '❌ Only group admins/authorized admins can post a status.' }, { quoted: msg });
    }

    const input = args.join(' ').trim();
    const content = unwrapMessage(msg.message);
    const quoted = getQuotedMessage(msg.message);
    const mediaMessage = content.imageMessage || content.videoMessage || quoted?.imageMessage || quoted?.videoMessage;
    const caption = input || content.imageMessage?.caption || content.videoMessage?.caption || '';

    try {
        const statusOptions = await getStatusOptions(sock, from);
        const audienceText = statusOptions.statusJidList
            ? ` visible to ${statusOptions.statusJidList.length} group member(s)`
            : '';

        if (mediaMessage?.imageMessage || mediaMessage?.videoMessage) {
            const type = mediaMessage.imageMessage ? 'image' : 'video';
            const media = mediaMessage.imageMessage || mediaMessage.videoMessage;
            const buffer = await downloadMedia(media, type);
            const payload = type === 'image'
                ? { image: buffer, caption }
                : { video: buffer, caption, mimetype: media.mimetype || 'video/mp4' };
            await sendStatus(sock, payload, statusOptions);
            return sock.sendMessage(from, { text: `✅ ${type === 'image' ? 'Image' : 'Video'} status posted successfully${audienceText}.` }, { quoted: msg });
        }

        if (/^https?:\/\//i.test(input)) {
            const remoteMedia = await fetchRemoteMedia(input).catch(() => null);
            if (remoteMedia?.contentType.startsWith('image/')) {
                await sendStatus(sock, { image: remoteMedia.buffer, caption: '' }, statusOptions);
            } else if (remoteMedia?.contentType.startsWith('video/')) {
                await sendStatus(sock, { video: remoteMedia.buffer, caption: '', mimetype: remoteMedia.contentType }, statusOptions);
            } else {
                await sendStatus(sock, { text: input }, statusOptions);
            }
            return sock.sendMessage(from, { text: `✅ Link status posted successfully${audienceText}.` }, { quoted: msg });
        }

        if (input) {
            await sendStatus(sock, { text: input }, statusOptions);
            return sock.sendMessage(from, { text: `✅ Text status posted successfully${audienceText}.` }, { quoted: msg });
        }

        return sock.sendMessage(from, {
            text: 'Usage:\n.statuspost Your text\n.statuspost https://example.com/link\n\nImage/video ke caption ke saath `.statuspost` likhein, ya media ko quote karke `.statuspost Caption` bhejein.'
        }, { quoted: msg });
    } catch (error) {
        console.error('[STATUS POST] Error:', error);
        return sock.sendMessage(from, { text: `❌ Status post failed: ${error.message}` }, { quoted: msg });
    }
};
