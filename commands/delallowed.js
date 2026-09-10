// delallowed — remove groups/users from the allowed list
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const sub = (args.join(' ') || '').trim();
    const target = sub ? (sub.endsWith('@g.us') ? sub : `${sub}@g.us`) : from;

    if (!botData.allowedGroups) botData.allowedGroups = {};
    const list = botData.allowedGroups.list || [];

    if (list.length === 0) {
        return await sock.sendMessage(from, { text: '❌ Allowed list pehle se khaali hai.' }, { quoted: msg });
    }
    if (!list.includes(target)) {
        return await sock.sendMessage(from, { text: `❌ ${target} allowed list me nahi hai.` }, { quoted: msg });
    }
    botData.allowedGroups.list = list.filter(g => g !== target);
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ *${target}* allowed list se hataya gaya.\n\nDekhe: .allow list` }, { quoted: msg });
};
