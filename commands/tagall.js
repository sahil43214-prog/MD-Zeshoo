const TAGALL_EMOJIS = ['🔹', '🔸', '🔺', '🔻', '⭐', '🌟', '⚡', '🎯', '💠', '🧿', '🌈', '🌀'];
let tagallEmojiIndex = 0;

function nextTagallEmoji() {
    const emoji = TAGALL_EMOJIS[tagallEmojiIndex];
    tagallEmojiIndex = (tagallEmojiIndex + 1) % TAGALL_EMOJIS.length;
    return emoji;
}

async function tagallCommand(sock, from, msg, isAdmin, q) {
    if (!isAdmin || !from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ Only admin can use this command in groups." }, { quoted: msg });
    
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    
    const mentionEmoji = nextTagallEmoji();
    const mentions = participants.map(mem => mem.id);
    const tagText = `📢 *TAG ALL*\n\n*Message:* ${q || 'No message'}\n\n${mentions.map(id => `${mentionEmoji} @${id.split('@')[0]}`).join('\n')}\n`;
    
    await sock.sendMessage(from, { 
        text: tagText, 
        mentions
    }, { quoted: msg });
}

module.exports = tagallCommand;
