// clearmenuvideos — remove all menu response videos
module.exports = async (sock, from, msg, isOwner, botData, saveBotData) => {
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Sirf bot owner ye command use kar sakta hai.' }, { quoted: msg });
    const count = Array.isArray(botData.menuVideos) ? botData.menuVideos.length : 0;
    botData.menuVideos = [];
    saveBotData();
    return sock.sendMessage(from, { text: `✅ Menu videos cleared successfully! (${count} video(s) removed)` }, { quoted: msg });
};
