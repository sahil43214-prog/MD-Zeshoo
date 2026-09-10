// userid — detailed user ID info by mention / reply / number
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    const q = (args.join(' ') || '').trim();
    let targetJid = null;
    let context = msg.message?.extendedTextMessage?.contextInfo;

    if (context?.participant) targetJid = context.participant;
    else if (context?.mentionedJid?.length) targetJid = context.mentionedJid[0];
    else if (q && /^[0-9]{5,20}$/.test(q.replace(/[^0-9]/g, ''))) {
        targetJid = `${q.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    }
    if (!targetJid) {
        return await sock.sendMessage(from, { text: '❌ Usage: .userid (reply karo / mention karo / number likho)' }, { quoted: msg });
    }
    try {
        const normalized = jidNormalizedUser(targetJid);
        let username = 'Unknown';
        let businessName = '';
        let lid = '';
        try {
            const contacts = await sock.onWhatsApp(targetJid.split('@')[0]);
            const me = (contacts && contacts[0]) || null;
            if (me) {
                if (me.lid) lid = me.lid;
                if (me.notify) username = me.notify;
            }
        } catch (_) {}
        try {
            const store = await sock.contactStore ? sock.contactStore.get(targetJid) : null;
            if (store) username = store.notify || store.verifiedName || store.name || username;
        } catch (_) {}

        let text = `𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧\n\n`;
        text += `👤 *USER ID DETAILS*\n\n`;
        text += `📛 *Name:* ${username}\n`;
        text += `🔢 *ID:* ${normalized}\n`;
        if (lid) text += `🆔 *LID:* ${lid}\n`;
        text += `\n© POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
        await sock.sendMessage(from, { text, mentions: [normalized] }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
