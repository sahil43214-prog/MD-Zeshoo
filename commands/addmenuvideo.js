const MAX_MENU_VIDEOS = 10;

async function addmenuvideoCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    if (!botData.menuVideos) botData.menuVideos = [];
    if (!args || args.length === 0) {
        const list = botData.menuVideos.length > 0
            ? botData.menuVideos.map((v, i) => `${i + 1}. ${v}`).join('\n')
            : '_No menu videos added yet._';
        return await sock.sendMessage(from, { text: `🎬 *Menu Videos* (${botData.menuVideos.length}/${MAX_MENU_VIDEOS})\n\n${list}\n\nUsage: \`.addmenuvideo <video url>\``, mentions: [] }, { quoted: msg });
    }
    const url = args.join(' ').trim();
    if (!/^https?:\/\//i.test(url) || !/\.(mp4|webm|gif)$/i.test(url) && !url.includes('.mp4')) {
        if (!/\.(mp4|webm|gif)$/i.test(url)) {
            return await sock.sendMessage(from, { text: '❌ Please provide a valid video URL ending with .mp4, .webm or .gif' }, { quoted: msg });
        }
    }
    if (botData.menuVideos.includes(url)) return await sock.sendMessage(from, { text: '⚠️ This video is already in the menu list.' }, { quoted: msg });
    if (botData.menuVideos.length >= MAX_MENU_VIDEOS) {
        botData.menuVideos.shift();
    }
    botData.menuVideos.push(url);
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Menu video added (${botData.menuVideos.length}/${MAX_MENU_VIDEOS})\nBot will now send a video with menu replies.` }, { quoted: msg });
}
module.exports = addmenuvideoCommand;
