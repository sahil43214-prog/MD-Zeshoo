async function antiimageCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    
    if (!botData.antiImageGroups) botData.antiImageGroups = {};
    
    const action = (args[0] || '').toLowerCase().trim();

    if (action === 'on' || action === 'delete') {
        botData.antiImageGroups[from] = 'delete';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Image Enabled (Delete Mode)!*\n\nAny image shared in this group will be automatically deleted." }, { quoted: msg });
    } else if (action === 'warn') {
        botData.antiImageGroups[from] = 'warn';
        saveBotData();
        const warnLimit = Number(botData.warnLimit?.[from]) || 3;
        await sock.sendMessage(from, { text: `✅ *Anti-Image Enabled (Warn Mode)!*\n\nImages will be deleted and the sender warned with the reason *image sharing*.\nAt warning ${warnLimit}/${warnLimit}, the sender will be removed if I am a group admin.\nUse .setwarn <number> to change the limit.` }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antiImageGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Image Enabled (Kick Mode)!*\n\nAny image shared will be:\n1️⃣ Deleted automatically\n2️⃣ User will be kicked immediately\n\n⚠️ _Make sure I am group admin!_" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antiImageGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ *Anti-Image Disabled!*\n\nImages are now allowed in this group." }, { quoted: msg });
    } else {
        const currentMode = botData.antiImageGroups[from];
        let statusText = currentMode ? `Current: *${currentMode.toUpperCase()}*` : 'Current: *DISABLED*';
        await sock.sendMessage(from, { text: `🛡️ *ANTI-IMAGE SYSTEM*\n\n${statusText}\n\n*Commands:*\n.antiimage delete - Auto delete images\n.antiimage warn - Delete + Warn user\n.antiimage kick - Delete + Kick user\n.antiimage off - Disable system` }, { quoted: msg });
    }
}
module.exports = antiimageCommand;
