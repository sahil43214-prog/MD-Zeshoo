async function antireactionCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiReactionGroups) botData.antiReactionGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiReactionGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `😶 *Anti-Reaction Status:* ${current}\n\nUsage: \`.antireaction on\` — delete reactions\n\`.antireaction warn\` — warn + delete\n\`.antireaction kick\` — warn + delete + kick\n\`.antireaction off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antireaction on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiReactionGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `😶 Anti-Reaction set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antireactionCommand;
