async function antivoiceCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });
    
    if (!botData.antiVoiceGroups) botData.antiVoiceGroups = {};
    
    const action = (args[0] || '').toLowerCase().trim();

    if (action === 'on' || action === 'delete') {
        botData.antiVoiceGroups[from] = 'delete';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Voice Enabled (Delete Mode)!*\n\nAny voice note or audio shared in this group will be automatically deleted." }, { quoted: msg });
    } else if (action === 'warn') {
        botData.antiVoiceGroups[from] = 'warn';
        saveBotData();
        const warnLimit = Number(botData.warnLimit?.[from]) || 3;
        await sock.sendMessage(from, { text: `✅ *Anti-Voice Enabled (Warn Mode)!*\n\nVoice notes/audio will be deleted and the sender warned with the reason *voice/audio sharing*.\nAt warning ${warnLimit}/${warnLimit}, the sender will be removed if I am a group admin.\nUse .setwarn <number> to change the limit.` }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antiVoiceGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *Anti-Voice Enabled (Kick Mode)!*\n\nAny voice note or audio shared will be:\n1️⃣ Deleted automatically\n2️⃣ User will be kicked immediately\n\n⚠️ _Make sure I am group admin!_" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antiVoiceGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ *Anti-Voice Disabled!*\n\nVoice notes are now allowed in this group." }, { quoted: msg });
    } else {
        const currentMode = botData.antiVoiceGroups[from];
        let statusText = currentMode ? `Current: *${currentMode.toUpperCase()}*` : 'Current: *DISABLED*';
        await sock.sendMessage(from, { text: `🛡️ *ANTI-VOICE SYSTEM*\n\n${statusText}\n\n*Commands:*\n.antivoice delete - Auto delete voice notes\n.antivoice warn - Delete + Warn user\n.antivoice kick - Delete + Kick user\n.antivoice off - Disable system` }, { quoted: msg });
    }
}
module.exports = antivoiceCommand;
