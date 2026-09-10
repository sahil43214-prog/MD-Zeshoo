async function antitagCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiTagGroups) botData.antiTagGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiTagGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `📢 *Anti-Tag Status:* ${current}\n\nUsage: \`.antitag on\` — delete mass-tag messages\n\`.antitag warn\` — warn + delete\n\`.antitag kick\` — warn + delete + kick\n\`.antitag off\` — disable\n\nAnti-tag blocks messages mentioning more than 5 members at once.`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antitag on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiTagGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `📢 Anti-Tag set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antitagCommand;
