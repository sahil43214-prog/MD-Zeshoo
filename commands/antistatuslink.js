module.exports = async function antistatusLinkCommand(sock, chatId, msg, isAdmin, botData, saveBotData, args = []) {
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    }

    const requested = String(args[0] || '').toLowerCase();
    const action = requested === 'on' ? 'kick' : requested;
    if (!botData.antiStatusLinkGroups) botData.antiStatusLinkGroups = {};

    if (['delete', 'warn', 'kick'].includes(action)) {
        botData.antiStatusLinkGroups[chatId] = action;
        saveBotData();
        const descriptions = {
            delete: 'link wala shared/forwarded status turant delete hoga.',
            warn: 'status delete hoga aur sender ko warning milegi.',
            kick: 'status delete hoga, warning milegi, aur non-admin sender kick hoga.'
        };
        return sock.sendMessage(chatId, {
            text: `✅ *ANTI-STATUS-LINK ${action.toUpperCase()} ENABLED*\n\n╭─❰ MODE ACTIVE ❱\n│ ${descriptions[action]}\n╰────────────────────\n\n_Bot ko group admin zaroor banayein._`
        }, { quoted: msg });
    }

    if (action === 'off') {
        botData.antiStatusLinkGroups[chatId] = 'off';
        saveBotData();
        return sock.sendMessage(chatId, { text: '✅ *Anti-status-link disabled.*' }, { quoted: msg });
    }

    return sock.sendMessage(chatId, {
        text: '╭─❰ *ANTI-STATUS-LINK* ❱\n│ .antistatuslink delete\n│ .antistatuslink warn\n│ .antistatuslink kick\n│ .antistatuslink on  (strict: text/link/photo/video + warn + kick)\n│ .antistatuslink off\n╰────────────────────\n\n*delete* = delete only\n*warn* = delete + warning\n*kick/on* = delete + warning + kick non-admin'
    }, { quoted: msg });
};
