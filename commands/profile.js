const { jidNormalizedUser } = require('@whiskeysockets/baileys');

function normalizeJid(value) {
    const raw = String(value || '').trim();
    if (!raw.includes('@')) return '';
    try {
        return jidNormalizedUser(raw).replace(/:\d+(?=@)/, '').toLowerCase();
    } catch {
        return raw.replace(/:\d+(?=@)/, '').toLowerCase();
    }
}

function asUserJid(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes('@')) {
        if (/@(?:g\.us|broadcast|newsletter)$/i.test(raw)) return '';
        return normalizeJid(raw);
    }
    const digits = raw.replace(/[\s().-]/g, '').replace(/^\+/, '');
    return /^\d{7,15}$/.test(digits) ? `${digits}@s.whatsapp.net` : '';
}

function participantJids(participant) {
    return [...new Set([
        participant?.phoneNumber,
        participant?.phone_number,
        participant?.id,
        participant?.jid,
        participant?.lid
    ].map(asUserJid).filter(Boolean))];
}

function participantKeys(participant) {
    return new Set(participantJids(participant).map(normalizeJid).filter(Boolean));
}

function cleanSingleLine(value, limit = 80) {
    return String(value || '')
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/@/g, '＠')
        .trim()
        .slice(0, limit);
}

function cleanBio(value) {
    const bio = String(value || '')
        .replace(/\r/g, '')
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '')
        .trim()
        .slice(0, 420);
    return bio || 'No bio set or unavailable';
}

function getVerifiedPhoneNumber(participant) {
    const candidates = [
        [participant?.phoneNumber, true],
        [participant?.phone_number, true],
        [participant?.id, false],
        [participant?.jid, false]
    ];

    for (const [value, allowBareNumber] of candidates) {
        const raw = String(value || '').trim();
        const jidMatch = raw.match(/^\+?(\d{7,15})(?::\d+)?@(s\.whatsapp\.net|c\.us)$/i);
        if (jidMatch) return `+${jidMatch[1]}`;

        if (allowBareNumber) {
            const number = raw.replace(/[\s().-]/g, '');
            if (/^\+?\d{7,15}$/.test(number)) return `+${number.replace(/^\+/, '')}`;
        }
    }
    return '';
}

function getBioValue(result, expectedJids) {
    const entries = Array.isArray(result)
        ? result
        : (Array.isArray(result?.list) ? result.list : []);
    const expected = new Set(expectedJids.map(normalizeJid));
    const entry = entries.find(item => expected.has(normalizeJid(item?.id))) || entries[0];
    const status = entry?.status;
    if (typeof status === 'string') return status;
    if (typeof status?.status === 'string') return status.status;
    if (typeof status?.text === 'string') return status.text;
    return '';
}

async function fetchBio(sock, participant, queryJids) {
    if (typeof participant?.status === 'string' && participant.status.trim()) {
        return cleanBio(participant.status);
    }
    if (typeof sock.fetchStatus !== 'function') return 'No bio set or unavailable';

    for (const jid of queryJids) {
        try {
            const bio = getBioValue(await sock.fetchStatus(jid), queryJids);
            if (bio.trim()) return cleanBio(bio);
        } catch {
            // Bio visibility depends on the user's WhatsApp privacy settings.
        }
    }
    return 'No bio set or unavailable';
}

async function fetchProfilePicture(sock, queryJids) {
    if (typeof sock.profilePictureUrl !== 'function') return '';
    for (const jid of queryJids) {
        try {
            const url = await sock.profilePictureUrl(jid, 'image');
            if (typeof url === 'string' && url.startsWith('https://')) return url;
        } catch {
            // A missing/private picture is normal; do not substitute a fake image.
        }
    }
    return '';
}

module.exports = async function profileCommand(sock, chatId, msg) {
    const sendText = text => sock.sendMessage(chatId, { text }, { quoted: msg });
    if (!String(chatId || '').endsWith('@g.us')) {
        return await sendText('❌ `.profile` can only be used in a group.');
    }

    try {
        const group = await sock.groupMetadata(chatId);
        const contextInfo = msg?.message?.extendedTextMessage?.contextInfo
            || msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo
            || {};
        const mentioned = contextInfo?.mentionedJid?.[0];
        const repliedTo = contextInfo?.participant;
        const sender = msg?.key?.participant;
        const rawTarget = mentioned || repliedTo || sender;
        const targetKey = normalizeJid(asUserJid(rawTarget));

        if (!targetKey) {
            return await sendText('❌ Mention a group member, reply to their message, or use `.profile` to view your own profile.');
        }

        const participants = Array.isArray(group?.participants) ? group.participants : [];
        const participant = participants.find(item => participantKeys(item).has(targetKey));
        if (!participant) {
            return await sendText('❌ That user was not found in this group. Mention a current group member or reply to their message.');
        }

        const queryJids = participantJids(participant);
        const participantJid = asUserJid(participant.id || participant.jid || participant.lid || rawTarget);
        if (!queryJids.length && participantJid) queryJids.push(participantJid);

        const senderKey = normalizeJid(asUserJid(sender));
        const senderName = senderKey && senderKey === targetKey ? msg?.pushName : '';
        const displayName = cleanSingleLine(
            participant.notify || participant.name || participant.verifiedName || participant.username || senderName,
            80
        ) || 'Group member';
        const phoneNumber = getVerifiedPhoneNumber(participant);
        const isAdmin = Boolean(participant.admin === 'admin' || participant.admin === 'superadmin' || participant.isAdmin || participant.isSuperAdmin);
        const groupName = cleanSingleLine(group?.subject, 100) || 'Group name unavailable';
        const [bio, pictureUrl] = await Promise.all([
            fetchBio(sock, participant, queryJids),
            fetchProfilePicture(sock, queryJids)
        ]);

        const nameLine = phoneNumber ? displayName : `@${displayName}`;
        const caption = [
            '✨ *USER PROFILE*',
            `👤 *Name:* ${nameLine}`,
            `📱 *Number:* ${phoneNumber || 'Not available (no verified number provided by WhatsApp)'}`,
            `🛡️ *Group role:* ${isAdmin ? 'Admin' : 'Member'}`,
            `👥 *Group:* ${groupName}`,
            `📝 *Bio:* ${bio}`
        ].join('\n');
        const mentions = !phoneNumber && participantJid ? [participantJid] : [];

        if (pictureUrl) {
            try {
                return await sock.sendMessage(chatId, {
                    image: { url: pictureUrl },
                    caption,
                    mentions
                }, { quoted: msg });
            } catch {
                // If WhatsApp cannot send the photo, preserve all profile text.
            }
        }

        return await sock.sendMessage(chatId, { text: caption, mentions }, { quoted: msg });
    } catch (error) {
        console.error(`[PROFILE] Could not build profile: ${error.message}`);
        return await sendText('❌ Could not load this profile. The member may have restricted their profile information.');
    }
};
