// clearmenuimages — remove all menu response images
module.exports = async (sock, from, msg, isOwner, botData, saveBotData) => {
    if (!isOwner) return await sock.sendMessage(from, { text: '❌ Sirf bot owner ye command use kar sakta hai.' }, { quoted: msg });
    const count = Array.isArray(botData.menuImages) ? botData.menuImages.length : 0;
    botData.menuImages = [];
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Menu images cleared successfully! (${count} image(s) removed)` }, { quoted: msg });
};
