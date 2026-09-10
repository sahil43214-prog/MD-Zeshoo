// totalmembers — group member / admin / owner counts with list
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Ye command sirf group me kaam karti hai.' }, { quoted: msg });
    }
    try {
        const metadata = await sock.groupMetadata(from);
        const members = metadata.participants || [];
        const admins = members.filter(m => m.admin === 'admin' || m.admin === 'superadmin');
        const owners = members.filter(m => m.admin === 'superadmin');
        const showList = args[0]?.toLowerCase() === 'list';

        let text = `𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧\n\n`;
        text += `👥 *TOTAL MEMBERS*\n\n`;
        text += `📊 *Total Members:* ${members.length}\n`;
        text += `🛡️ *Admins:* ${admins.length}\n`;
        text += `👑 *Group Owner:* ${owners.length}\n`;
        text += `👤 *Normal Members:* ${members.length - admins.length}\n`;
        if (metadata.size) text += `\n📌 *Size:* ${metadata.size}\n`;
        if (showList) {
            text += `\n*Admins List:*\n`;
            admins.forEach((a, i) => { text += `${i + 1}. @${a.id.split('@')[0]}\n`; });
        }
        text += `\n© POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
        await sock.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
