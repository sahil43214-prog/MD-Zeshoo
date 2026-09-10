// antiprotection — real-time status dashboard for anti-promote / anti-demote systems.
// Shows per group: current mode (on/kick/off), whether the bot is an admin there,
// and recent anti-security events logged by the handler.
// Usage: .antiprotection              -> current group status
//        .antiprotection logs         -> recent anti-promote/demote event log
//        .antiprotection logs <n>     -> last n events (default 10)
module.exports = async function(sock, chatId, msg, isAdmin, botData) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    try {
        const { jidNormalizedUser } = require('@whiskeysockets/baileys');
        const isGroup = chatId.endsWith('@g.us');
        const logs = getLogs(chatId);

        // Anti-promote / anti-demote modes for this group
        const promoteMode = (botData && botData.antiPromote && botData.antiPromote[chatId]) || 'off';
        const demoteMode = (botData && botData.antiDemote && botData.antiDemote[chatId]) || 'off';

        // Real admin check via fresh metadata, matching all bot identity variants
        // (id, lid, phone number) so the bot is never shown as "Not Admin" falsely.
        let adminLine = '❓ Unknown';
        try {
            const meta = await sock.groupMetadata(chatId);
            const botUser = sock.user || sock.authState?.creds?.me || {};
            const identities = new Set([
                botUser.id, botUser.lid, botUser.jid, botUser.phoneNumber
            ].flatMap(v => identityVariants(v)));
            const p = meta.participants.find(x => participantMatches(x, identities));
            adminLine = p ? (p.admin === 'superadmin' ? '👑 Owner/Admin' : p.admin ? '✅ Admin' : '❌ Member') : '❌ Not found';
        } catch (e) {
            adminLine = '❌ Admin check failed';
        }

        const groupLabel = chatId.split('@')[0] + '@g.us';
        const status = `🛡️ *ANTI-PROTECTION STATUS*\n\n📍 Group: *${groupLabel}*\n🤖 Bot: ${adminLine}\n\n⬆️ *Anti-Promote* ${icon(promoteMode)}: *${promoteMode.toUpperCase()}*\n  on = promotion reverse\n  kick = reverse + kick action taker\n\n⬇️ *Anti-Demote* ${icon(demoteMode)}: *${demoteMode.toUpperCase()}*\n  on = demotion reverse\n  kick = reverse + kick action taker\n\n${buildLogText(logs)}`;
        await sock.sendMessage(chatId, { text: status }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};

function identityVariants(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];
    const values = new Set([raw, raw.split(':')[0]]);
    try {
        const { jidNormalizedUser } = require('@whiskeysockets/baileys');
        const normalized = jidNormalizedUser(raw);
        values.add(normalized);
        values.add(normalized.split(':')[0]);
    } catch (_) {}
    return [...values].filter(Boolean);
}
function participantMatches(participant, identities) {
    return ['id', 'jid', 'lid', 'phoneNumber', 'phone_number']
        .map(k => participant?.[k])
        .flatMap(identityVariants)
        .some(v => identities.has(v));
}

function icon(mode) {
    return mode === 'kick' ? '⚡' : mode === 'on' ? '🟢' : '🔴';
}

function getLogs(groupId) {
    try {
        const idx = require('../index');
        const ring = idx.antiSecurityLogs && idx.antiSecurityLogs.get ? idx.antiSecurityLogs.get(groupId) : null;
        return ring || [];
    } catch (e) {
        return [];
    }
}

function buildLogText(logs) {
    if (!logs || !logs.length) return '📋 *Last 10 events:*\n• Koi recent anti-promote/demote event nahi mila.';
    const last = logs.slice(-10);
    return '📋 *Last 10 events:*\n' + last.map(l => `• ${l.time} ${l.text}`).join('\n');
}
