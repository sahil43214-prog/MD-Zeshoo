// .listonline — shows ONLY members who are currently online.
// It subscribes to presence updates for every member, waits for WhatsApp
// presence events to arrive, and lists members whose live presence says "available".

const ONLINENESS_TTL_MS = 3 * 60 * 1000; // a member counts as online for 3 minutes after last presence update

function getOnlineMembers() {
    try {
        const idx = require('../index');
        return idx.onlineCache;
    } catch (e) {
        return null;
    }
}

module.exports = async function(sock, chatId, msg) {
    try {
        const cache = getOnlineMembers();
        const onlineMap = cache ? cache.get(chatId) : null;

        // 1. Fetch group members
        let members = [];
        let meta;
        try {
            meta = await sock.groupMetadata(chatId);
            members = meta.participants.map(p => p.id);
        } catch (metaErr) {
            return await sock.sendMessage(chatId, { text: '❌ Could not fetch group members: ' + metaErr.message }, { quoted: msg });
        }

        // 2. Send a "sending a message" presence in the group so WhatsApp
        //    starts delivering presence events for other members
        try {
            await sock.sendPresenceUpdate('composing', chatId);
        } catch (e) {}

        // 3. Subscribe to each member's presence updates
        let subscribed = 0;
        for (const memberId of members) {
            try {
                await sock.presenceSubscribe(chatId, memberId);
                subscribed++;
            } catch (e) {}
        }
        console.log(`[LISTONLINE] Subscribed to ${subscribed}/${members.length} members in ${chatId}`);

        // 4. Wait for presence events to flow in from WhatsApp
        await new Promise(resolve => setTimeout(resolve, 8000));

        const now = Date.now();
        const onlineMembers = [];
        const seenNumbers = new Set();

        for (const memberId of members) {
            const lastSeenAt = onlineMap ? onlineMap.get(memberId) : null;
            if (lastSeenAt && (now - lastSeenAt) < ONLINENESS_TTL_MS && !seenNumbers.has(memberId.split('@')[0])) {
                onlineMembers.push(memberId);
                seenNumbers.add(memberId.split('@')[0]);
            }
        }

        // 5. Build the online-only list
        let text = `🟢 *𝗢𝗻𝗹𝗶𝗻𝗲 𝗠𝗲𝗺𝗯𝗲𝗿𝘀*\n\n`;
        text += `Total members: ${members.length}\n`;
        text += `🟢 Online now: *${onlineMembers.length}*\n\n`;

        if (onlineMembers.length === 0) {
            text += `Koi bhi member abhi online nahi hai.\nAgar presence events nahi aaye toh kuch der baad dobara try karein.`;
        } else {
            text += `*Online Members:*\n`;
            onlineMembers.forEach((id, i) => {
                text += `${i + 1}. @${id.split('@')[0]}\n`;
            });
        }

        await sock.sendMessage(chatId, { text, mentions: onlineMembers }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
