// .mediafire — MediaFire link se file download (mf ka doosra engine)
const axios = require('axios');
const cheerio = require('cheerio');

async function mediafireCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: '❌ Usage: `.mediafire <MediaFire link>`' }, { quoted: msg });
    if (!q.includes('mediafire.com')) return await sock.sendMessage(from, { text: '❌ Ye MediaFire link nahi lag raha. Sahi link bhejo.' }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

    try {
        const res = await axios.get(q, {
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        const $ = require('cheerio').load(res.data);

        // Try multiple selectors for the real download URL
        let downloadUrl = $('#downloadButton').attr('href') ||
            $('a#downloadButton').attr('href') ||
            $('.input.popsok').attr('onclick')?.match(/'(.*?)'/)?.[1] ||
            $('[onclick*="window.open"]').first().attr('onclick')?.match(/'(.*?)'/)?.[1];

        const fileName = $('.dl-btn-label').attr('title') ||
            $('.dl-info .promo_ss_file_name').text().trim() ||
            $('.dl-btn-label').text().trim() ||
            'mediafire-file';
        const fileSize = $('.dl-info .promo_ss_file_size').text().trim() || 'Unknown';

        if (!downloadUrl) {
            await sock.sendMessage(from, { text: '❌ MediaFire file ka download link nahi mila. Link check karo ya file private ho sakti hai.' }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            return;
        }

        const caption = `╭━━━〔 𝗠𝗘𝗗𝗜𝗔𝗙𝗜𝗥𝗘 𝗗𝗟 〕━━━┈⊷\n` +
            `┃ 📝 *FILE:* ${fileName}\n` +
            `┃ ⚖️ *SIZE:* ${fileSize}\n` +
            `╰━━━━━━━━━━━━━━━━━━┈⊷\n> © POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;

        await sock.sendMessage(from, {
            document: { url: downloadUrl },
            mimetype: 'application/octet-stream',
            fileName: fileName,
            caption
        }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (e) {
        console.error('[mediafire] Error:', e.message);
        await sock.sendMessage(from, { text: '❌ MediaFire download fail: ' + e.message }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = mediafireCommand;
