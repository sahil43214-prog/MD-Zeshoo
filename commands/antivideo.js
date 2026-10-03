async function antivideoCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    
    if (!botData.antiVideoGroups) botData.antiVideoGroups = {};
    
    const action = (args[0] || '').toLowerCase().trim();

    if (action === 'on' || action === 'delete') {
        botData.antiVideoGroups[from] = 'delete';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Video Enabled (Delete Mode)!*\n\nAny video shared in this group will be automatically deleted." }, { quoted: msg });
    } else if (action === 'warn') {
        botData.antiVideoGroups[from] = 'warn';
        saveBotData();
        const warnLimit = Number(botData.warnLimit?.[from]) || 3;
        await sock.sendMessage(from, { text: `✅ *Anti-Video Enabled (Warn Mode)!*\n\nVideos will be deleted and the sender warned with the reason *video sharing*.\nAt warning ${warnLimit}/${warnLimit}, the sender will be removed if I am a group admin.\nUse .setwarn <number> to change the limit.` }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antiVideoGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Video Enabled (Kick Mode)!*\n\nAny video shared will be:\n1️⃣ Deleted automatically\n2️⃣ User will be kicked immediately\n\n⚠️ _Make sure I am group admin!_" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antiVideoGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ *Anti-Video Disabled!*\n\nVideos are now allowed in this group." }, { quoted: msg });
    } else {
        const currentMode = botData.antiVideoGroups[from];
        let statusText = currentMode ? `Current: *${currentMode.toUpperCase()}*` : 'Current: *DISABLED*';
        await sock.sendMessage(from, { text: `🛡️ *ANTI-VIDEO SYSTEM*\n\n${statusText}\n\n*Commands:*\n.antivideo delete - Auto delete videos\n.antivideo warn - Delete + Warn user\n.antivideo kick - Delete + Kick user\n.antivideo off - Disable system` }, { quoted: msg });
    }
}
module.exports = antivideoCommand;
