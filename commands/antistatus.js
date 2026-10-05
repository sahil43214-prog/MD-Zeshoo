async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args = []) {
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(from, { text: '❌ Only group admins can change Anti-Status settings.' }, { quoted: msg });
    }

    const action = String(args[0] || '').toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};
    if (!botData.antiStatusWarnings) botData.antiStatusWarnings = {};
    const clearGroupWarnings = () => {
        for (const key of Object.keys(botData.antiStatusWarnings)) {
            if (key.startsWith(`${from}:`)) delete botData.antiStatusWarnings[key];
        }
    };

    if (action === 'delete') {
        botData.antiStatusGroups[from] = 'delete';
        clearGroupWarnings();
        saveBotData();
        return sock.sendMessage(from, {
            text: '✅ *Anti-Status: DELETE ONLY*\nActual status shares will be deleted. No warnings or member removal.'
        }, { quoted: msg });
    }
    if (['on', 'warn'].includes(action)) {
        botData.antiStatusGroups[from] = 'warn';
        clearGroupWarnings();
        saveBotData();
        const warnLimit = Math.max(1, Math.min(20, Number(botData.warnLimit?.[from]) || 3));
        return sock.sendMessage(from, {
            text: `✅ *Anti-Status: DELETE + WARNING*\nActual status shares will be deleted and warned (limit ${warnLimit}). Anti-Status never removes members.`
        }, { quoted: msg });
    }
    if (action === 'off') {
        delete botData.antiStatusGroups[from];
        clearGroupWarnings();
        saveBotData();
        return sock.sendMessage(from, { text: '❌ *Anti-Status disabled for this group.*' }, { quoted: msg });
    }

    return sock.sendMessage(from, {
        text: '❌ Usage:\n.antistatus delete — delete status shares only\n.antistatus on/warn — delete + warn, never kick\n.antistatus off — disable'
    }, { quoted: msg });
}

module.exports = antistatusCommand;
