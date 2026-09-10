async function listblockedCommand(sock, from, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    try {
        const blocked = await sock.fetchBlocklist();
        const list = blocked && blocked.length > 0
            ? blocked.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`).join('\n')
            : '_No blocked numbers._';
        const header = `🚫 *Blocked Numbers* (${blocked ? blocked.length : 0})\n\n${list}`;
        const mentions = blocked || [];
        await sock.sendMessage(from, { text: header, mentions }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed to fetch blocked list: ' + e.message }, { quoted: msg });
    }
}
module.exports = listblockedCommand;
