async function antieditCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiEditGroups) botData.antiEditGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiEditGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `🛡️ *Anti-Edit Status:* ${current}\n\nUsage: \`.antiedit on\` — delete edited messages\n\`.antiedit warn\` — warn + delete\n\`.antiedit kick\` — warn + delete + kick\n\`.antiedit off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antiedit on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiEditGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `🛡️ Anti-Edit set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antieditCommand;
