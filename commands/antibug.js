module.exports = async function antibugCommand(sock, chatId, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    if (!botData.antiBugGroups) botData.antiBugGroups = {};
    const action = String(args?.[0] || '').toLowerCase();
    if (action === 'on' || action === 'off') {
        botData.antiBugGroups[chatId] = action;
        saveBotData();
        return await sock.sendMessage(chatId, { text: `🛡️ Anti-Bug/Malware protection *${action.toUpperCase()}*.
Dangerous bug/malware-style messages will be deleted, warned, and kicked.` }, { quoted: msg });
    }
    const status = botData.antiBugGroups[chatId] === 'on' ? 'ON' : 'OFF';
    return await sock.sendMessage(chatId, { text: `🧪 *Anti-Bug/Malware*

Status: ${status}

Use .antibug on/off` }, { quoted: msg });
};
