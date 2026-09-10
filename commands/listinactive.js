// listinactive — list members who have never been seen online since the bot started
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

// mirrors listoffline's cache access (per-group presence timestamps)
function getOnlineCache() {
    try {
        const idx = require('../index');
        return idx.onlineCache;
    } catch (e) {
        return null;
    }
}

module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Ye command sirf group me kaam karti hai.' }, { quoted: msg });
    }
    try {
        const onlineCache = getOnlineCache();
        if (!onlineCache || !(onlineCache instanceof Map)) {
            return await sock.sendMessage(from, { text: '❌ Presence tracking abhi start nahi hui. Bot restart ke baad try karein.' }, { quoted: msg });
        }
        const metadata = await sock.groupMetadata(from);
        const members = metadata.participants || [];
        const botJid = jidNormalizedUser(sock.user?.id || '');
        const onlineNow = onlineCache.get(from) || new Map();
        const now = Date.now();
        const ONLINE_TTL = 30 * 60 * 1000; // inactive if not seen online for 30 minutes
        const inactive = [];
        for (const m of members) {
            if (m.id === botJid) continue;
            const seenAt = onlineNow.get(m.id);
            if (!seenAt || now - seenAt > ONLINE_TTL) inactive.push(m.id);
        }
        inactive.sort((a, b) => a.localeCompare(b));

        let text = `𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧\n\n`;
        text += `😴 *LIST INACTIVE*\n\n`;
        text += `Group: *${metadata.subject}*\n`;
        text += `Total members: ${members.length}\n`;
        text += `😴 Inactive (kabhi online nahi dikhe): *${inactive.length}*\n\n`;
        if (inactive.length === 0) {
            text += `Saare members recent me online dikhe hain.`;
        } else {
            text += `*Inactive Members:*\n`;
            inactive.slice(0, 200).forEach((id, i) => { text += `${i + 1}. @${id.split('@')[0]}\n`; });
        }
        await sock.sendMessage(from, { text, mentions: inactive.slice(0, 200) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
