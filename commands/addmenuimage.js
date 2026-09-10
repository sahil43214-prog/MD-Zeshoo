module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const sender = (msg.key && msg.key.participant) || from;
    const url = (args[0] || '').trim();
    if (!url) return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n🖼️ *ADD MENU IMAGE*\n\nUsage: .addmenuimage <image url>\nExample: .addmenuimage https://example.com/photo.jpg` }, { quoted: msg });
    if (!/^https?:\/\//i.test(url)) return await sock.sendMessage(from, { text: '❌ Invalid URL! Provide a valid image link (jpg/png/gif/webp).' }, { quoted: msg });
    if (!Array.isArray(botData.menuImages)) botData.menuImages = [];
    if (botData.menuImages.includes(url)) return await sock.sendMessage(from, { text: '⚠️ Ye image URL pehle se menu list me hai.' }, { quoted: msg });
    botData.menuImages.push(url);
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Image added to menu list!\nTotal menu images: *${botData.menuImages.length}*` }, { quoted: msg });
};
