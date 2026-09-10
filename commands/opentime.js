// opentime — show when the group was created and how long it has been open
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Ye command sirf group me kaam karti hai.' }, { quoted: msg });
    }
    try {
        const metadata = await sock.groupMetadata(from);
        const created = metadata.creation || 0; // unix timestamp
        const createdAt = new Date(created * 1000);
        const now = Date.now();
        const diff = now - created * 1000;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        const months = Math.floor(days / 30);
        const remainDays = days % 30;

        const dateStr = createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
        const timeStr = createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        let duration = '';
        if (months > 0) duration = `${months} mahine ${remainDays} din`;
        else if (days > 0) duration = `${days} din`;
        else duration = `${hours} ghante ${minutes} minute`;

        let text = `𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧\n\n`;
        text += `⏰ *GROUP OPEN TIME*\n\n`;
        text += `📅 *Kab khula:*\n${dateStr} • ${timeStr}\n\n`;
        text += `🕐 *Kitne time se open hai:*\n${duration}\n\n`;
        text += `© POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
        await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
