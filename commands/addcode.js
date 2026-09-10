// addcode — add redeem/premium access codes
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const q = (args.join(' ') || '').trim();
    if (!q) {
        return await sock.sendMessage(from, { text: '❌ Usage: .addcode <code-name> (premium redeem code add karein)' }, { quoted: msg });
    }
    if (!botData.redeemCodes) botData.redeemCodes = {};
    if (botData.redeemCodes[q.toLowerCase()]) {
        return await sock.sendMessage(from, { text: '⚠️ Ye code pehle se add ho chuka hai.' }, { quoted: msg });
    }
    botData.redeemCodes[q.toLowerCase()] = {
        active: true,
        createdAt: Date.now(),
        usedBy: []
    };
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ *Code Add Ho Gaya!*\n\n🔑 Code: *${q}*\nStatus: Active\n\nMembers is code ko redeem kar sakte hain. Hatane ke liye: .delcode ${q}` }, { quoted: msg });
};
