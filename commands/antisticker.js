async function antistickerCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    
    // Always ensure antiStickerGroups exists
    if (!botData.antiStickerGroups) botData.antiStickerGroups = {};
    
    const action = (args[0] || '').toLowerCase().trim();

    if (action === 'on' || action === 'delete') {
        botData.antiStickerGroups[from] = 'delete';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Sticker Enabled (Delete Mode)!*\n\nAny sticker shared in this group will be automatically deleted." }, { quoted: msg });
    } else if (action === 'warn') {
        botData.antiStickerGroups[from] = 'warn';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Sticker Enabled (Warn Mode)!*\n\nAny sticker shared will be:\n1️⃣ Deleted automatically\n2️⃣ User will be warned\n\n_Next time the user will be kicked!_" }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antiStickerGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Sticker Enabled (Kick Mode)!*\n\nAny sticker shared will be:\n1️⃣ Deleted automatically\n2️⃣ User will be kicked immediately\n\n⚠️ _Make sure I am group admin!_" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antiStickerGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ *Anti-Sticker Disabled!*\n\nStickers are now allowed in this group." }, { quoted: msg });
    } else {
        // Show current status
        const currentMode = botData.antiStickerGroups[from];
        let statusText = currentMode ? `Current: *${currentMode.toUpperCase()}*` : 'Current: *DISABLED*';
        await sock.sendMessage(from, { text: `🛡️ *ANTI-STICKER SYSTEM*\n\n${statusText}\n\n*Commands:*\n.antisticker delete - Auto delete stickers\n.antisticker warn - Delete + Warn user\n.antisticker kick - Delete + Kick user\n.antisticker off - Disable system` }, { quoted: msg });
    }
}
module.exports = antistickerCommand;
