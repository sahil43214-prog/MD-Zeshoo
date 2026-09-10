async function antibotCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiBotGroups) botData.antiBotGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiBotGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `🤖 *Anti-Bot Status:* ${current}\n\nUsage: \`.antibot on\` — kick bots\n\`.antibot warn\` — warn + kick\n\`.antibot kick\` — instant kick\n\`.antibot off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antibot on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiBotGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `🤖 Anti-Bot set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antibotCommand;
