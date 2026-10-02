async function antibotCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiBotGroups) botData.antiBotGroups = {};
    const mode = String(args?.[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiBotGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `🤖 *Anti-Bot Status:* ${current}

Use: .antibot on | .antibot off
When ON, bot-like commands/messages are deleted, warned, and the sender is kicked.` }, { quoted: msg });
    }
    if (!['on', 'off', 'warn', 'kick'].includes(mode)) {
        return await sock.sendMessage(from, { text: '❌ Usage: .antibot on/off' }, { quoted: msg });
    }
    botData.antiBotGroups[from] = mode === 'off' ? 'off' : 'on';
    saveBotData();
    await sock.sendMessage(from, { text: `🤖 Anti-Bot is now *${botData.antiBotGroups[from]}*. Bot-like ping/song/video commands will be deleted, warned, and kicked.` }, { quoted: msg });
}
module.exports = antibotCommand;
