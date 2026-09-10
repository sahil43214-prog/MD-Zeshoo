// listrequests — list pending group join requests (admin only)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Ye command sirf group me kaam karti hai.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return await sock.sendMessage(from, { text: '❌ Sirf admins ye command use kar sakte hain.' }, { quoted: msg });
    }
    try {
        let requests = [];
        try {
            requests = await sock.groupRequestParticipantsList(from);
        } catch (e) {
            return await sock.sendMessage(from, { text: '❌ Join requests list nahi mil rahi. Bot ko group me admin banao.' }, { quoted: msg });
        }
        if (!requests || requests.length === 0) {
            return await sock.sendMessage(from, { text: '✅ *Group Join Requests*\n\nKoi pending join request nahi hai — group me koi join karna nahi chahta abhi.' }, { quoted: msg });
        }
        let text = `𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧\n\n`;
        text += `📩 *GROUP JOIN REQUESTS*\n\n`;
        text += `Pending requests: *${requests.length}*\n\n`;
        text += `*Approve karne ke liye:*\n.approveall ya .approve <number>\n*Reject karne ke liye:*\n.disapprove <number>\n\n`;
        text += `*Request List:*\n`;
        requests.forEach((r, i) => {
            const requestTimestamp = r.request_time || r.code_expiration_timestamp;
            text += `${i + 1}. @${(r.jid || '').split('@')[0]}\n`;
        });
        text += `\n© POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
        await sock.sendMessage(from, { text, mentions: requests.map(r => r.jid) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
