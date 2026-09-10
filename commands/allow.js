// allow — manage allowed groups list (bot only responds in allowed groups)
module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const action = (args[0] || '').toLowerCase();
    const sub = (args.slice(1).join(' ') || '').trim();

    if (!botData.allowedGroups) botData.allowedGroups = {};

    if (action === 'on') {
        botData.allowedGroups.mode = 'strict';
        if (!botData.allowedGroups.list) botData.allowedGroups.list = [];
        if (!botData.allowedGroups.list.includes(from) && from.endsWith('@g.us')) {
            botData.allowedGroups.list.push(from);
        }
        saveBotData();
        return await sock.sendMessage(from, { text: '✅ *Allow Mode ON*\n\nBot ab sirf allowed groups me kaam karega. Is group ko allowed list me add kar diya gaya hai.\n\n📋 *Add karne ke liye:*\n.allow add <group-link-number>\n🗑 *Hatane ke liye:*\n.delallowed <group-id>' }, { quoted: msg });
    }
    if (action === 'off') {
        botData.allowedGroups.mode = 'off';
        saveBotData();
        return await sock.sendMessage(from, { text: '❌ *Allow Mode OFF*\n\nBot ab sabhi groups me kaam karega.' }, { quoted: msg });
    }
    if (action === 'add') {
        const target = sub.endsWith('@g.us') ? sub : sub ? `${sub}@g.us` : from;
        if (!botData.allowedGroups.list) botData.allowedGroups.list = [];
        if (botData.allowedGroups.list.includes(target)) {
            return await sock.sendMessage(from, { text: '⚠️ Ye group pehle se allowed list me hai.' }, { quoted: msg });
        }
        botData.allowedGroups.list.push(target);
        saveBotData();
        return await sock.sendMessage(from, { text: `✅ Group *${target}* allowed list me add ho gaya.` }, { quoted: msg });
    }
    if (action === 'list') {
        const list = botData.allowedGroups.list || [];
        let text = `𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧\n\n📋 *ALLOWED GROUPS*\n\nMode: *${botData.allowedGroups.mode || 'off'}*\n`;
        text += `Total: *${list.length}*\n\n`;
        if (list.length === 0) text += 'Allowed list khaali hai.';
        else list.forEach((g, i) => { text += `${i + 1}. ${g}\n`; });
        text += `\n© POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
        return await sock.sendMessage(from, { text }, { quoted: msg });
    }
    return await sock.sendMessage(from, { text: '❌ Usage: .allow [on/off/add/list]' }, { quoted: msg });
};
