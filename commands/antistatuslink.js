module.exports = async function antistatusLinkCommand(sock, chatId, msg, isAdmin, botData, saveBotData, args = []) {
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    }

    const requested = String(args[0] || '').toLowerCase();
    // `on` and the legacy `kick` option now mean strict delete + warning, never member removal.
    const action = ['on', 'kick'].includes(requested) ? 'warn-all' : requested;
    if (!botData.antiStatusLinkGroups) botData.antiStatusLinkGroups = {};

    if (['delete', 'warn', 'warn-all'].includes(action)) {
        botData.antiStatusLinkGroups[chatId] = action;
        saveBotData();
        const descriptions = {
            delete: 'link wala shared status delete hoga; warning ya kick nahi.',
            warn: 'link wala shared status delete hoga aur sender ko warning milegi; kick nahi.',
            'warn-all': 'shared status delete hoga aur warning milegi; kisi member ko kick nahi kiya jayega.'
        };
        const title = action === 'warn-all' ? 'WARN ALL' : action.toUpperCase();
        return sock.sendMessage(chatId, {
            text: `✅ *ANTI-STATUS-LINK ${title} ENABLED*\n${descriptions[action]}\n\n_Bot ko group admin banayein._`
        }, { quoted: msg });
    }

    if (action === 'off') {
        delete botData.antiStatusLinkGroups[chatId];
        saveBotData();
        return sock.sendMessage(chatId, { text: '✅ *Anti-Status-Link disabled.*' }, { quoted: msg });
    }

    return sock.sendMessage(chatId, {
        text: '╭─❰ *ANTI-STATUS-LINK* ❱\n│ .antistatuslink delete\n│ .antistatuslink warn\n│ .antistatuslink on (all shared statuses)\n│ .antistatuslink off\n╰────────────────────\n\n_Status protections delete/warn only. They never kick. The old `kick` option is accepted as warning-only._'
    }, { quoted: msg });
};
