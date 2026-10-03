async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can change anti-status settings." }, { quoted: msg });
    const action = String(args?.[0] || '').toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (['on', 'delete', 'warn', 'kick'].includes(action)) {
        // All enabled aliases use the strict policy requested by the owner.
        botData.antiStatusGroups[from] = 'kick';
        saveBotData();
        return await sock.sendMessage(from, { text: "✅ *Anti-Status Strict Protection Enabled!*\n\nAny status mention/share in this group will be deleted instantly, warned, and kicked." }, { quoted: msg });
    }
    if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        return await sock.sendMessage(from, { text: "❌ *Anti-Status Disabled!*" }, { quoted: msg });
    }
    return await sock.sendMessage(from, { text: "❌ Usage:\n.antistatus on (Delete + Warning + Kick)\n.antistatus off (Disable)" }, { quoted: msg });
}
module.exports = antistatusCommand;
