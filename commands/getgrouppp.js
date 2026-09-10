// getgrouppp — fetch the current group profile picture (DP) and send as image
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData) => {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: '❌ Sirf group me ye command use kar sakte hain.' }, { quoted: msg });
    try {
        const ppUrl = await sock.profilePictureUrl(from, 'image');
        if (!ppUrl) return await sock.sendMessage(from, { text: 'ℹ️ Is group ka koi profile picture nahi hai.' }, { quoted: msg });
        return await sock.sendMessage(from, { image: { url: ppUrl }, caption: '📷 *𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧* — Current group DP' }, { quoted: msg });
    } catch (e) {
        return await sock.sendMessage(from, { text: '❌ Group DP fetch nahi ho saka: ' + (e.message || 'Unknown error') }, { quoted: msg });
    }
};
