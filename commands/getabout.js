// getabout — fetch the about/bio text of a contact or group
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: '❌ Sirf group me ye command use kar sakte hain.' }, { quoted: msg });
    const q = (args.join(' ') || '').trim();
    let target = q ? q : from;
    if (!target.includes('@')) {
        if (!q || /^[0-9]{5,20}$/.test(q.replace(/[^0-9]/g, ''))) {
            target = `${q.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }
    }
    try {
        const fetchAbout = async (jid) => {
            try {
                if (jid.endsWith('@g.us')) {
                    const metadata = await sock.groupMetadata(jid);
                    return metadata.desc ? `📝 *Group About:*\n${metadata.desc}` : 'ℹ️ Group ka koi about/description set nahi hai.';
                }
                const resp = await sock.fetchStatus(jid);
                if (!resp || !resp.status) return 'ℹ️ Is user ne about set nahi kiya ya privacy setting on hai.';
                const date = resp.setAt ? new Date(resp.setAt * 1000).toLocaleDateString('en-IN') : '';
                return `👤 *User About:*\n\n${resp.status}${date ? `\n\n📅 Set: ${date}` : ''}`;
            } catch (e) {
                return '❌ About fetch nahi ho saka: ' + (e.message || 'Unknown error');
            }
        };
        const aboutText = await fetchAbout(target);
        return await sock.sendMessage(from, { text: `*𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧*\n\n${aboutText}` }, { quoted: msg });
    } catch (e) {
        return await sock.sendMessage(from, { text: '❌ Failed to fetch about: ' + (e.message || 'Unknown error') }, { quoted: msg });
    }
};
