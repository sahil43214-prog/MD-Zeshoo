const { buildCommandCategories, getCommandCounts } = require('./menu-registry');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../settings');

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8vvB1Fcow4AY0NeC1p';

// ── Single header style ──────────────────────────────
const headerStyles = [
    () => `「 ✦𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧✦ 」`,
    () => `「 ✦𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧✦ 」`,
    () => `「 ✦𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧✦ 」`
];

async function allMenu(sock, from, msg, session, commands) {
    const categories = buildCommandCategories(commands);
    const { unique: totalCommands, entries: totalCommandEntries } = getCommandCounts(categories);

    // COMMAND DIRECTORY: every registered command is rendered below.
    // TOTAL COMMANDS | Unique commands and Menu entries are reported here.
    // COMMAND DIRECTORY: every registered command is rendered below.
    // TOTAL COMMANDS | Unique commands and Menu entries are reported here.
    // ── Header (single style) ──
    const header = headerStyles[0]();

    // ── Stats ribbon with clean divider and requested marker ──
    let allMenuText = `┃ 🧿 ${header}\n`;
    allMenuText += `┃\n`;
    allMenuText += `┃ —͟͟͞͞𖣘 *COMMANDS* : *${totalCommands}*+\n`;
    allMenuText += `┃ —͟͟͞͞𖣘 FAST • SECURE • PRIVATE\n`;
    allMenuText += `┃ TOTAL COMMANDS: ${totalCommands}\n`;
    allMenuText += `┃ Unique commands: ${totalCommands} | Menu entries: ${totalCommandEntries}\n`;
    allMenuText += `┃ TOTAL COMMANDS: ${totalCommands}\n`;
    allMenuText += `┃ Unique commands: ${totalCommands} | Menu entries: ${totalCommandEntries}\n`;
    allMenuText += `┃\n`;

    // ── Category blocks with a distinct semantic emoji per menu ──
    const categoryIcons = {
        '👑 OWNER': '⚜️', '👥 GROUP': '🛡️', '🤖 AI COMMANDS': '🧠', '🔗 MULTISESSION COMMANDS': '🔗', '⬇️ DOWNLOAD': '🚀',
        '🛠️ TOOLS': '🧰', '🎉 FUN': '🎭', '🎮 GAME': '🎮', '🎌 ANIME': '🌌', 'ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ': '💞', '🔊 AUDIO COMMANDS': '🎧',
        '🏷️ STICKER': '🏷️', '🖼️ IMAGE': '🖼️', '✏️ TEXT MAKER': '✒️',
        '🏢 LOGO': '💎', '🕌 ISLAMIC': '🌙', '🎥 VIDEO': '🎞️', '🎵 MUSIC': '🎼', '🌤️ WEATHER & INFO': '🌦️', '🎯 MISC': '🧿', '🎬 EPHOTO360': '🎨'
    };
    const cleanName = (cat) => cat.replace(/^\P{Letter}{1,3}️?\s*/u, "").trim();

    for (const [category, cmds] of Object.entries(categories)) {
        const count = cmds.length;
        const icon = categoryIcons[category] || '✨';

        // ── Compact category block with requested marker ──
        allMenuText += `┃ ${icon} ⟨── —͟͟͞͞𖣘 *${cleanName(category)} (${count})* ──⟩\n`;
        const shortLabel = (cmd) => {
            const raw = cmd.label.split('(')[0].trim().split(' ').slice(0, 2).join(' ');
            return raw.length > 16 ? raw.slice(0, 16) + '…' : raw;
        };
        for (const cmd of cmds) {
            allMenuText += `┃ —͟͟͞͞𖣘 ${settings.prefix}${shortLabel(cmd)}\n`;
        }
        allMenuText += `┃\n`;
    }

    // ── Footer with requested marker ──
    allMenuText += `┃ ⟨──────────────────⟩\n`;
    allMenuText += `┃ —͟͟͞͞𖣘 Total Commands : *${totalCommands}*\n`;
    allMenuText += `┃ —͟͟͞͞𖣘 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧\n`;
    allMenuText += `┃ 𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧\n`;
    allMenuText += `┃ All registered commands are listed above.\n`;
    allMenuText += `┃ 𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧\n`;
    allMenuText += `┃ All registered commands are listed above.\n`;
    allMenuText += `┃ ⟨──────────────────⟩`;

    const footerText = allMenuText;

    // ── Send menu with image + channel CTA ──
    let menuSent = false;
    try {
        await sock.sendMessage(from, {
            image: { url: settings.startimage },
            caption: footerText,
            contextInfo: {
                externalAdReply: {
                    title: '𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧',
                    body: 'Follow official WhatsApp channel',
                    sourceUrl: CHANNEL_URL,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: msg });
        menuSent = true;
    } catch (imageError) {
        try {
            await sock.sendMessage(from, { text: footerText }, { quoted: msg });
            menuSent = true;
        } catch (textError) {
            if (session?.sendLog) session.sendLog(`[ALLMENU] Menu delivery failed: ${textError.message}`, 'error');
        }
    }

    // ── Native channel CTA after the main menu ──
    if (menuSent) {
        let channelCtaSent = false;
        try {
            const interactive = generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: '🔗 Official MD-SHOO-BT Channel' }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: '𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧' }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: 'Follow Official Channel', hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'FOLLOW OFFICIAL CHANNEL', url: CHANNEL_URL, merchant_url: CHANNEL_URL }) }]
                            })
                        })
                    }
                }
            }, { userJid: sock.user?.id, quoted: msg });
            await sock.relayMessage(from, interactive.message, { messageId: interactive.key.id });
            channelCtaSent = true;
        } catch (buttonError) {
            if (session?.sendLog) session.sendLog(`[ALLMENU] Native channel CTA unavailable: ${buttonError.message}`, 'warning');
        }
        if (!channelCtaSent) {
            try {
                await sock.sendMessage(from, {
                    text: `🔗 *FOLLOW MD-SHOO-BT OFFICIAL CHANNEL*\n${CHANNEL_URL}`
                }, { quoted: msg });
            } catch (fallbackError) {
                if (session?.sendLog) session.sendLog(`[ALLMENU] Channel URL fallback failed: ${fallbackError.message}`, 'warning');
            }
        }
    }
}

module.exports = allMenu;
