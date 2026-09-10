const FONT_STYLES = {
    1: { name: 'Sans-Serif Bold', sample: '𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧' },
    2: { name: 'Serif Bold', sample: '𝐌𝐃-𝐙𝐄𝐒𝐇𝐎𝐎-𝐁𝐎𝐓' },
    3: { name: 'Italic', sample: '𝑀𝐷-𝑍𝐸𝑆𝐻𝑂𝑂-𝐵𝑂𝑇' },
    4: { name: 'Sans-Serif Italic', sample: '𝘔𝘋-𝘡𝘌𝘚𝘏𝘖𝘖-𝘉𝘖𝘛' },
    5: { name: 'Script', sample: '𝓜𝓓-𝓩𝓔𝓢𝓗𝓞𝓞-𝓑𝓞𝓣' },
    6: { name: 'Monospace', sample: '𝙼𝙳-𝚉𝙴𝚂𝙷𝙾𝙾-𝙱𝙾𝚃' },
    7: { name: 'Double-Struck', sample: '𝕄𝔻-ℤ𝔼𝕊ℍ𝕆𝕆-𝔹𝕆𝕋' },
    8: { name: 'Fraktur', sample: '𝔐𝔇-ℨ𝔈𝔖ℌ𝔒𝔒-𝔅𝔒𝔗' },
    9: { name: 'Small Caps', sample: 'Mᴅ-Zᴇsʜᴏᴏ-Bᴏᴛ' },
    10: { name: 'Circled', sample: 'ⓂⒹ-ⓏⒺⓈⒽⓄⓄ-ⒷⓄⓉ' }
};

async function setfontCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only admin can use this command.' }, { quoted: msg });
    const keys = Object.keys(FONT_STYLES);
    if (!args || args.length === 0) {
        const current = botData.fontStyle ? FONT_STYLES[botData.fontStyle] : null;
        let list = '🔤 *Available Fonts*\n\n';
        keys.forEach(k => {
            const style = FONT_STYLES[k];
            list += `${k}. ${style.name} — ${style.sample}\n`;
        });
        list += `\nCurrent font: ${current ? current.name + ' — ' + current.sample : 'Default (no font)'}`;
        list += `\n\nUsage: \`.setfont <number>\`\nExample: \`.setfont 1\``;
        return await sock.sendMessage(from, { text: list }, { quoted: msg });
    }
    const choice = parseInt(args[0], 10);
    if (!keys.includes(String(choice))) return await sock.sendMessage(from, { text: `❌ Invalid font. Choose 1-${keys.length}. Use \`.setfont\` to see the list.` }, { quoted: msg });
    botData.fontStyle = String(choice);
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Font set to *${FONT_STYLES[String(choice)].name}*\nExample: ${FONT_STYLES[String(choice)].sample}` }, { quoted: msg });
}
module.exports = setfontCommand;
