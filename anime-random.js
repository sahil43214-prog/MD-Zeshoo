const axios = require('axios');

const API_TIMEOUT = 15000;
const ENDPOINTS = {
    waifu: [
        'https://api.waifu.pics/sfw/waifu',
        'https://nekos.life/api/v2/img/waifu'
    ],
    husbando: [
        'https://api.waifu.pics/sfw/husbando',
        'https://nekos.life/api/v2/img/husbando'
    ],
    neko: [
        'https://api.waifu.pics/sfw/neko',
        'https://nekos.life/api/v2/img/neko',
        'https://api.catboys.com/img'
    ]
};

async function fetchImageUrl(type) {
    let lastError;
    for (const endpoint of ENDPOINTS[type] || []) {
        try {
            const response = await axios.get(endpoint, {
                timeout: API_TIMEOUT,
                headers: { 'User-Agent': 'MD-ZESHOO-BOT/4.0', Accept: 'application/json' }
            });
            const data = response.data || {};
            const url = data.url || data.image || data.images?.[0]?.url || data.results?.[0]?.url;
            if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url;
            throw new Error('API returned no image URL');
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('No anime image API available');
}

function createCommand(type, title) {
    return async function randomAnimeCommand(sock, chatId, msg) {
        try {
            const imageUrl = await fetchImageUrl(type);
            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: `${title}\n\n—͟͟͞͞𖣘 Random image powered by public anime API`
            }, { quoted: msg });
        } catch (_) {
            await sock.sendMessage(chatId, {
                text: `❌ ${title} image abhi available nahi hai. Thodi der baad dobara try karein.`
            }, { quoted: msg });
        }
    };
}

module.exports = {
    waifu: createCommand('waifu', '🌸 WAIFU'),
    husbando: createCommand('husbando', '🖤 HUSBANDO'),
    neko: createCommand('neko', '🐾 NEKO'),
    fetchImageUrl
};
