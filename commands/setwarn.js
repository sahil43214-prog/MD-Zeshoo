async function setwarnCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admin can use this command.' }, { quoted: msg });
    if (!args || args.length === 0 || isNaN(Number(args[0]))) {
        const current = botData.warnLimit && botData.warnLimit[from] ? botData.warnLimit[from] : 3;
        return await sock.sendMessage(from, { text: `⚠️ Current warn limit for this group: *${current}*\n\nUsage: \`.setwarn <number>\`\nExample: \`.setwarn 5\`\n\nAfter this many warnings, the member will be kicked.` }, { quoted: msg });
    }
    const limit = Math.max(1, Math.min(20, parseInt(args[0], 10)));
    if (!botData.warnLimit) botData.warnLimit = {};
    botData.warnLimit[from] = limit;
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Warn limit set to *${limit}* for this group.` }, { quoted: msg });
}
module.exports = setwarnCommand;
