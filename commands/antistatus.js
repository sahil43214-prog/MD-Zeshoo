async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can change anti-status settings." }, { quoted: msg });
    const action = String(args?.[0] || '').toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (['on', 'delete', 'warn', 'kick'].includes(action)) {
        // All enabled aliases use delete + warning first, then kick on the third violation.
        botData.antiStatusGroups[from] = 'kick';
        saveBotData();
        return await sock.sendMessage(from, { text: "✅ *Anti-Status Protection Enabled!*\n\nFirst and second status mention/share: delete + warning.\nThird violation: delete + Warning 3/3 + kick." }, { quoted: msg });
    }
    if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        return await sock.sendMessage(from, { text: "❌ *Anti-Status Disabled!*" }, { quoted: msg });
    }
    return await sock.sendMessage(from, { text: "❌ Usage:\n.antistatus on (Delete + Warning; kick on third violation)\n.antistatus off (Disable)" }, { quoted: msg });
}
module.exports = antistatusCommand;
