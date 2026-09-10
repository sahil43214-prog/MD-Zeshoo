async function antiforwardCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiForwardGroups) botData.antiForwardGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiForwardGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `↗️ *Anti-Forward Status:* ${current}\n\nUsage: \`.antiforward on\` — delete forwarded messages\n\`.antiforward warn\` — warn + delete\n\`.antiforward kick\` — warn + delete + kick\n\`.antiforward off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antiforward on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiForwardGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `↗️ Anti-Forward set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antiforwardCommand;
