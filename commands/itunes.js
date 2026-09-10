// .itunes — iTunes se song search + download
const axios = require('axios');

async function itunesCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: '❌ Usage: `.itunes <song ka naam>`' }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });

    try {
        const search = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=5`, {
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        const results = (search.data?.results || []).filter(r => r.kind === 'song');

        if (!results.length) {
            await sock.sendMessage(from, { text: '❌ iTunes par koi song nahi mila.' }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            return;
        }

        const top = results[0];
        const previewUrl = top.previewUrl;
        const caption = `╭━━━〔 𝗜𝗧𝗨𝗡𝗘𝗦 𝗗𝗟 〕━━━┈⊷\n` +
            `┃ 🎵 *TITLE:* ${top.trackName}\n` +
            `┃ 🎤 *ARTIST:* ${top.artistName}\n` +
            `┃ 💿 *ALBUM:* ${top.collectionName}\n` +
            `┃ 🕐 *DURATION:* ${Math.floor((top.trackTimeMillis || 0) / 60000)}:${String(Math.floor(((top.trackTimeMillis || 0) % 60000) / 1000)).padStart(2, '0')}\n` +
            `┃ 🌐 *STORE:* iTunes Store\n` +
            `╰━━━━━━━━━━━━━━━━━━┈⊷\n> © POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;

        if (top.artworkUrl100) {
            await sock.sendMessage(from, {
                image: { url: top.artworkUrl100.replace('100x100', '400x400') },
                caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: caption }, { quoted: msg });
        }

        if (previewUrl) {
            const audio = await axios.get(previewUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
            });
            const buffer = Buffer.from(audio.data);
            if (buffer && buffer.length > 0) {
                await sock.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${(top.trackName || 'song').replace(/[^\w\s-]/g, '')}.mp3`,
                    ptt: false
                }, { quoted: msg });
            }
            await sock.sendMessage(from, { text: '📎 Note: iTunes free preview (30 sec clip) diya gaya hai — poori song ke liye `.song2` try karo.' }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Song details mil gaye, lekin iska preview available nahi hai.' }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
        }
    } catch (e) {
        console.error('[itunes] Error:', e.message);
        await sock.sendMessage(from, { text: '❌ iTunes search fail: ' + e.message }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = itunesCommand;
