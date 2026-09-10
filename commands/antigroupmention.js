async function antigroupmentionCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin || !from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ Only admin can use this command in groups." }, { quoted: msg });
    
    if (!botData.antigroupmentionGroups) botData.antigroupmentionGroups = {};
    
    const action = args[0]?.toLowerCase();
    if (action === 'on' || action === 'delete' || action === 'del') {
        botData.antigroupmentionGroups[from] = 'del';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ Anti-GroupMention (Delete) Enabled!" }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antigroupmentionGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ Anti-GroupMention (Kick + Delete) Enabled!" }, { quoted: msg });
    } else if (action === 'warn') {
        botData.antigroupmentionGroups[from] = 'warn';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ Anti-GroupMention (Warn + Delete) Enabled!" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antigroupmentionGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ Anti-GroupMention Disabled!" }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { 
            text: "❌ *Anti-GroupMention Usage:*\n\n" +
                  "┃ ⋄ .antigroupmention del - Delete msg\n" +
                  "┃ ⋄ .antigroupmention kick - Kick user\n" +
                  "┃ ⋄ .antigroupmention warn - Warn user\n" +
                  "┃ ⋄ .antigroupmention off - Disable"
        }, { quoted: msg });
    }
}

module.exports = antigroupmentionCommand;
