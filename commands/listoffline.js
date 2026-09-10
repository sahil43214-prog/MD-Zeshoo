// .listoffline — shows ONLY members who are currently OFFLINE.
// It uses the same per-group presence cache as listonline. Members seen
// online within the TTL window are counted as online; everyone else is listed here.
const ONLINENESS_TTL_MS = 3 * 60 * 1000; // a member counts as online for 3 minutes after last presence update
const PRESENCE_WAIT_MS = 2000;
const SUBSCRIBE_BATCH_SIZE = 10;
function getOnlineCache() {
    try {
        const idx = require('../index');
        return idx.onlineCache;
    } catch (e) {
        return null;
    }
}
module.exports = async function(sock, chatId, msg) {
    try {
        const cache = getOnlineCache();
        const onlineMap = cache ? cache.get(chatId) : null;
        // 1. Fetch group members
        let members = [];
        let meta;
        try {
            meta = await sock.groupMetadata(chatId);
            members = meta.participants.map(p => p.id);
        } catch (metaErr) {
            return await sock.sendMessage(chatId, { text: '❌ Group metadata nahi mil paaya: ' + metaErr.message }, { quoted: msg });
        }
        const botJid = sock.user.id;
        // 2. Send presence so WhatsApp starts delivering presence events for members
        try {
            await sock.sendPresenceUpdate('composing', chatId);
        } catch (e) {}
        // 3. Subscribe to each member's presence updates
        let subscribed = 0;
        for (let i = 0; i < members.length; i += SUBSCRIBE_BATCH_SIZE) {
            const batch = members.slice(i, i + SUBSCRIBE_BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(memberId => sock.presenceSubscribe(chatId, memberId)));
            subscribed += results.filter(result => result.status === 'fulfilled').length;
        }
        console.log(`[LISTOFFLINE] Subscribed to ${subscribed}/${members.length} members in ${chatId}`);
        // 4. Wait for presence events to flow in from WhatsApp
        await new Promise(resolve => setTimeout(resolve, PRESENCE_WAIT_MS));
        const now = Date.now();
        const onlineSet = new Set();
        for (const memberId of members) {
            const lastSeenAt = onlineMap ? onlineMap.get(memberId) : null;
            if (lastSeenAt && (now - lastSeenAt) < ONLINENESS_TTL_MS) {
                onlineSet.add(memberId);
            }
        }
        // 5. Build the offline-only list (everyone not seen online recently, excluding the bot)
        const offlineMembers = members.filter(id => !onlineSet.has(id) && id !== botJid);
        let text = `📴 *𝗢𝗳𝗳𝗹𝗶𝗻𝗲 𝗠𝗲𝗺𝗯𝗲𝗿𝘀*\n\n`;
        text += `Total members: ${members.length}\n`;
        text += `📴 Offline now: *${offlineMembers.length}*\n\n`;
        if (offlineMembers.length === 0) {
            text += `Group ke saare members online hain, koi offline nahi mila.\nAgar presence events nahi aaye toh kuch der baad dobara try karein.`;
        } else {
            text += `*Offline Members:*\n`;
            offlineMembers.forEach((id, i) => {
                text += `${i + 1}. @${id.split('@')[0]}\n`;
            });
        }
        await sock.sendMessage(chatId, { text, mentions: offlineMembers }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
