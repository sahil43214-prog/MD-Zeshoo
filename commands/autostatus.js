const fs = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');

const savedStatusIds = new Set();
const MAX_SAVED_STATUS_IDS = 1000;
const STATUS_ARCHIVE_DIR = path.join(__dirname, '..', 'data', 'status_archive');
fs.ensureDirSync(STATUS_ARCHIVE_DIR);

function personalInboxJid(sock, userId) {
    const ownId = sock.user?.id || userId;
    if (!ownId) return null;
    return jidNormalizedUser(String(ownId).includes('@') ? ownId : `${ownId}@s.whatsapp.net`);
}

async function downloadMedia(content, type) {
    const stream = await downloadContentFromMessage(content, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

function safeId(value) {
    return String(value || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function archivePath(statusId, extension) {
    return path.join(STATUS_ARCHIVE_DIR, `${safeId(statusId)}.${extension}`);
}

async function saveArchiveCopy(statusId, sender, kind, payload) {
    const base = archivePath(statusId, kind);
    if (Buffer.isBuffer(payload)) {
        await fs.writeFile(base, payload);
    } else {
        await fs.writeJson(`${base}.json`, { statusId, sender, kind, savedAt: new Date().toISOString(), text: payload });
    }
}

/** Handle received WhatsApp Status updates for auto-seen, auto-like and auto-save. */
async function handleStatusUpdate(sock, m, botData, userId) {
    try {
        const settings = botData.statusSettings?.[userId];
        const autoViewActive = settings?.autoSeen || botData.autoViewStatusEnabled === true;
        const autoSaveActive = settings?.autoSaveStatus || botData.autoSaveStatusEnabled === true;
        const autoLikeActive = settings?.autoLike || (botData.autoReactStatus && botData.autoReactStatus === 'on');
        if (!settings || (!settings.autoStatus && !autoViewActive && !autoSaveActive && !autoLikeActive)) return;
        const msg = m;
        if (msg.key.remoteJid !== 'status@broadcast') return;

        const statusId = msg.key.id || `${Date.now()}-${Math.random()}`;
        const sender = msg.key.participant || 'unknown';
        if (savedStatusIds.has(statusId)) return;
        savedStatusIds.add(statusId);
        if (savedStatusIds.size > MAX_SAVED_STATUS_IDS) savedStatusIds.delete(savedStatusIds.values().next().value);

        if (autoViewActive) {
            try {
                await sock.readMessages([msg.key]);
            } catch (viewErr) {
                console.error('Error auto-viewing status:', viewErr);
            }
        }
        if (autoLikeActive) {
            const emojis = ['❤️', '👍', '🔥', '👏', '😮', '😂', '🙌', '✨', '⭐', '✅'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            try {
                await sock.sendMessage('status@broadcast', { react: { text: randomEmoji, key: msg.key } }, { statusJidList: [sender] });
            } catch (reactErr) {
                console.error('Error reacting to status:', reactErr);
            }
        }

        if (!autoSaveActive) return;
        const inbox = personalInboxJid(sock, userId);
        if (!inbox) return;
        const content = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message;
        if (!content) return;

        const label = `📥 AUTO-SAVED STATUS\n👤 From: ${sender.split('@')[0]}\n🛡️ Permanent copy saved before deletion\n\n`;
        const caption = content.imageMessage?.caption || content.videoMessage?.caption || content.documentMessage?.caption || content.conversation || content.extendedTextMessage?.text || '';

        if (content.imageMessage) {
            const buffer = await downloadMedia(content.imageMessage, 'image');
            await saveArchiveCopy(statusId, sender, 'jpg', buffer);
            await sock.sendMessage(inbox, { image: buffer, caption: `${label}${caption}` });
        } else if (content.videoMessage) {
            const buffer = await downloadMedia(content.videoMessage, 'video');
            await saveArchiveCopy(statusId, sender, 'mp4', buffer);
            await sock.sendMessage(inbox, { video: buffer, caption: `${label}${caption}`, mimetype: content.videoMessage.mimetype || 'video/mp4' });
        } else if (content.audioMessage) {
            const buffer = await downloadMedia(content.audioMessage, 'audio');
            await saveArchiveCopy(statusId, sender, 'mp3', buffer);
            await sock.sendMessage(inbox, { audio: buffer, mimetype: content.audioMessage.mimetype || 'audio/mpeg', ptt: Boolean(content.audioMessage.ptt) });
            await sock.sendMessage(inbox, { text: label });
        } else if (content.documentMessage) {
            const buffer = await downloadMedia(content.documentMessage, 'document');
            await saveArchiveCopy(statusId, sender, 'bin', buffer);
            await sock.sendMessage(inbox, { document: buffer, fileName: content.documentMessage.fileName || 'status-file', mimetype: content.documentMessage.mimetype || 'application/octet-stream', caption: `${label}${caption}` });
        } else {
            await saveArchiveCopy(statusId, sender, 'txt', caption || '[Text status]');
            await sock.sendMessage(inbox, { text: `${label}${caption || '[Text status]'}` });
        }
    } catch (e) {
        console.error('Error in handleStatusUpdate:', e);
    }
}

module.exports = { handleStatusUpdate };
