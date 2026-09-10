async function antigifCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiGifGroups) botData.antiGifGroups = {};
    const mode = (args && args[0]) ? args[0].toLowerCase() : '';
    if (!mode) {
        const current = botData.antiGifGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `🎞️ *Anti-GIF Status:* ${current}\n\nUsage: \`.antigif on\` — delete GIFs\n\`.antigif warn\` — warn + delete\n\`.antigif kick\` — warn + delete + kick\n\`.antigif off\` — disable`, mentions: [] }, { quoted: msg });
    }
    if (!['on', 'warn', 'kick', 'off'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antigif on/off/warn/kick' }, { quoted: msg });
    }
    botData.antiGifGroups[from] = mode;
    saveBotData();
    await sock.sendMessage(from, { text: `🎞️ Anti-GIF set to *${mode}* for this group.` }, { quoted: msg });
}
module.exports = antigifCommand;
