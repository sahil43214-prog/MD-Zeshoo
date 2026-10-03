async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can change anti-status settings." }, { quoted: msg });
    const action = String(args?.[0] || '').toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (['on', 'delete', 'warn', 'kick'].includes(action)) {
        // All enabled aliases use delete + warning, then kick at the configured warn limit.
        botData.antiStatusGroups[from] = 'kick';
        botData.antiStatusWarnings = botData.antiStatusWarnings || {};
        Object.keys(botData.antiStatusWarnings).filter(key => key.startsWith(`${from}:`)).forEach(key => delete botData.antiStatusWarnings[key]);
        saveBotData();
        const warnLimit = Number(botData.warnLimit?.[from]) || 3;
        return await sock.sendMessage(from, { text: `✅ *Anti-Status Protection Enabled!*\n\nActual status shares will be deleted and warned.\nThe first ${warnLimit} violation(s) only issue warnings; removal happens on the next violation (if I am a group admin).\nOrdinary forwarded media and view-once messages are checked by their own rules.` }, { quoted: msg });
    }
    if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        return await sock.sendMessage(from, { text: "❌ *Anti-Status Disabled!*" }, { quoted: msg });
    }
    return await sock.sendMessage(from, { text: "❌ Usage:\n.antistatus on (Delete + warn; remove only after the configured warning limit)\n.antistatus off (Disable)" }, { quoted: msg });
}
module.exports = antistatusCommand;
