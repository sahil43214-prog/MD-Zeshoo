// disapproveall — disapprove/reject all pending group join requests
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData) => {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: '❌ Sirf group me ye command use kar sakte hain.' }, { quoted: msg });
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    try {
        const response = await sock.groupRequestParticipantsList(from);
        if (!response || response.length === 0) {
            return await sock.sendMessage(from, { text: 'ℹ️ Koi pending join request nahi hai.' }, { quoted: msg });
        }
        let disapprovedCount = 0;
        for (const participant of response) {
            try {
                await sock.groupRequestParticipantsUpdate(from, [participant.jid], 'reject');
                disapprovedCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.error(`Failed to reject ${participant.jid}:`, err.message);
            }
        }
        return await sock.sendMessage(from, { text: `✅ Successfully rejected ${disapprovedCount} pending join request(s).` }, { quoted: msg });
    } catch (e) {
        return await sock.sendMessage(from, { text: '❌ Failed to fetch pending requests: ' + (e.message || 'Unknown error') }, { quoted: msg });
    }
};
