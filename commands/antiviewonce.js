async function antiviewonceCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiViewOnceGroups) botData.antiViewOnceGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiViewOnceGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `👁️ *Anti-ViewOnce Status:* ${current}\n\nUsage: \`.antiviewonce on\` — delete view-once media\n\`.antiviewonce warn\` — warn + delete\n\`.antiviewonce kick\` — warn + delete + kick\n\`.antiviewonce off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antiviewonce on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiViewOnceGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `👁️ Anti-ViewOnce set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antiviewonceCommand;
