// announcements — set group announcement mode (admins-only messaging)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Ye command sirf group me kaam karti hai.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return await sock.sendMessage(from, { text: '❌ Sirf admins ye command use kar sakte hain.' }, { quoted: msg });
    }
    const mode = (args[0] || '').toLowerCase();
    try {
        if (mode === 'on') {
            await sock.groupSettingUpdate(from, 'announcement');
            return await sock.sendMessage(from, { text: '✅ *Announcements Mode ON*\n\nAb sirf admins message bhej sakte hain. Normal members sirf padh sakte hain.' }, { quoted: msg });
        }
        if (mode === 'off') {
            await sock.groupSettingUpdate(from, 'not_announcement');
            return await sock.sendMessage(from, { text: '❌ *Announcements Mode OFF*\n\nAb sabhi members message bhej sakte hain.' }, { quoted: msg });
        }
        return await sock.sendMessage(from, { text: '❌ Usage: .announcements [on/off]' }, { quoted: msg });
    } catch (e) {
        return await sock.sendMessage(from, { text: '❌ Error: ' + e.message + '\nBot ko admin banao tabhi kaam karega.' }, { quoted: msg });
    }
};
