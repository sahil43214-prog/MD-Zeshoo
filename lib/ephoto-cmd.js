// Generic EPHOTO360 command factory — shared logic for all text effect commands
const { ephoto360 } = require('./ephoto');

function ephotoCommand(commandName, effectUrl, effectTitle, emoji) {
    return async function (sock, from, msg, q) {
        if (!q) return await sock.sendMessage(from, { text: `❌ Usage: \`.${commandName} <apna text>\`\nExample: \`.${commandName} Zeshoo\`` }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '🎨', key: msg.key } });
        try {
            const imageUrl = await ephoto360(effectUrl, q);
            if (!imageUrl) throw new Error('Image URL nahi mila');
            const caption = `╭━━━〔 𝗘𝗣𝗛𝗢𝗧𝗢𝟯𝟲𝟬 〕━━━┈⊷\n` +
                `┃ ${emoji} *EFFECT:* ${effectTitle}\n` +
                `┃ ✍️ *TEXT:* ${q}\n` +
                `╰━━━━━━━━━━━━━━━━━━┈⊷\n> © POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
            await sock.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.error(`[${commandName}] Error:`, e.message);
            await sock.sendMessage(from, { text: `❌ Effect banane me error aaya: ${e.message}\n🔁 Ek baar aur try karo.` }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        }
    };
}

module.exports = { ephotoCommand };
