async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    const action = args[0]?.toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (action === 'on' || action === 'delete') {
        botData.antiStatusGroups[from] = 'delete';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Status Enabled (Delete Mode)!*\n\nAny status shared in this group will be automatically deleted." }, { quoted: msg });
    } else if (action === 'warn') {
        botData.antiStatusGroups[from] = 'warn';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Status Enabled (Warn Mode)!*\n\nAny status shared will be deleted and the user will be warned." }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antiStatusGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Status Enabled (Kick Mode)!*\n\nAny status shared will be deleted and the user will be kicked." }, { quoted: msg });
    } else if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        await sock.sendMessage(from, { text: "❌ *Anti-Status Disabled!*" }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Usage:\n.antistatus on (Delete only)\n.antistatus warn (Delete + Warn)\n.antistatus kick (Delete + Kick)\n.antistatus off (Disable)" }, { quoted: msg });
    }
}
module.exports = antistatusCommand;
