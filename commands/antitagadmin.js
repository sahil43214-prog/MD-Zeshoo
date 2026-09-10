async function antitagadminCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiTagAdminGroups) botData.antiTagAdminGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiTagAdminGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `🔖 *Anti-Tag-Admin Status:* ${current}\n\nUsage: \`.antitagadmin on\` — delete messages tagging admins\n\`.antitagadmin warn\` — warn + delete\n\`.antitagadmin kick\` — warn + delete + kick\n\`.antitagadmin off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antitagadmin on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiTagAdminGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `🔖 Anti-Tag-Admin set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antitagadminCommand;
