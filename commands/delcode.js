// delcode — delete redeem/premium access codes
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const q = (args.join(' ') || '').trim().toLowerCase();
    if (!q) {
        return await sock.sendMessage(from, { text: '❌ Usage: .delcode <code-name>' }, { quoted: msg });
    }
    if (!botData.redeemCodes) botData.redeemCodes = {};
    if (!botData.redeemCodes[q]) {
        return await sock.sendMessage(from, { text: '❌ Ye code add hi nahi hai.' }, { quoted: msg });
    }
    delete botData.redeemCodes[q];
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Code *${q}* delete ho gaya. Ab koi isko redeem nahi kar sakta.` }, { quoted: msg });
};
