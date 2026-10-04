async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can change anti-status settings." }, { quoted: msg });
    const action = String(args?.[0] || '').toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (action === 'delete') {
        botData.antiStatusGroups[from] = 'delete';
        botData.antiStatusWarnings = botData.antiStatusWarnings || {};
        Object.keys(botData.antiStatusWarnings).filter(key => key.startsWith(`${from}:`)).forEach(key => delete botData.antiStatusWarnings[key]);
        saveBotData();
        return await sock.sendMessage(from, { text: "✅ *Anti-Status Delete Mode Enabled!*\n\nActual status shares will be deleted only. No warning or kick will be issued." }, { quoted: msg });
    }
    if (['on', 'warn', 'kick'].includes(action)) {
        // Keep legacy `kick` input safe: Anti-Status is now warning-only and never removes users.
        botData.antiStatusGroups[from] = 'warn';
        botData.antiStatusWarnings = botData.antiStatusWarnings || {};
        Object.keys(botData.antiStatusWarnings).filter(key => key.startsWith(`${from}:`)).forEach(key => delete botData.antiStatusWarnings[key]);
        saveBotData();
        const warnLimit = Number(botData.warnLimit?.[from]) || 3;
        return await sock.sendMessage(from, { text: `✅ *Anti-Status Protection Enabled!*\n\nActual status shares will be deleted and warned.\nNo member will be removed by Anti-Status. The warning count is limited to ${warnLimit}.\nOrdinary forwarded media and view-once messages are checked by their own rules.` }, { quoted: msg });
    }
    if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        return await sock.sendMessage(from, { text: "❌ *Anti-Status Disabled!*" }, { quoted: msg });
    }
    return await sock.sendMessage(from, { text: "❌ Usage:\n.antistatus delete (Delete status shares only)\n.antistatus on/warn (Delete + warn; never remove members)\n.antistatus off (Disable)" }, { quoted: msg });
}
module.exports = antistatusCommand;
