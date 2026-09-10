const axios = require('axios');
const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const USER_AGENT = 'MD-ZESHOO-BOT/4.0 MISC commands';

function quotedMessage(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function findImageMessage(msg) {
    const sources = [msg?.message, quotedMessage(msg)].filter(Boolean);
    for (const source of sources) {
        if (source.imageMessage) return { content: source.imageMessage, type: 'image' };
        if (source.stickerMessage) return { content: source.stickerMessage, type: 'sticker' };
    }
    return null;
}

async function downloadImage(msg) {
    const media = findImageMessage(msg);
    if (!media) return null;
    const stream = await downloadContentFromMessage(media.content, media.type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function sendText(sock, chatId, msg, text) {
    return sock.sendMessage(chatId, { text }, { quoted: msg });
}

function xml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function shortText(value, max = 180) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function svg(width, height, body, background = 'transparent') {
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${background}"/>${body}</svg>`);
}

function labelOverlay(width, height, title, color, subtitle = '') {
    const safeTitle = xml(title);
    const safeSubtitle = xml(subtitle);
    return svg(width, height, `
        <rect x="0" y="0" width="${width}" height="${height}" fill="${color}" opacity="0.22"/>
        <rect x="${Math.round(width * 0.04)}" y="${Math.round(height * 0.07)}" width="${Math.round(width * 0.92)}" height="${Math.round(height * 0.86)}" fill="none" stroke="${color}" stroke-width="${Math.max(8, Math.round(width / 90))}" opacity="0.9"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${Math.max(34, Math.round(width / 11))}" font-weight="900" fill="white" stroke="black" stroke-width="${Math.max(2, Math.round(width / 300))}" paint-order="stroke">${safeTitle}</text>
        ${safeSubtitle ? `<text x="50%" y="62%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(20, Math.round(width / 28))}" font-weight="700" fill="white" stroke="black" stroke-width="2" paint-order="stroke">${safeSubtitle}</text>` : ''}
    `);
}

async function normalizeImage(buffer) {
    const normalized = await sharp(buffer)
        .rotate()
        .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
    const metadata = await sharp(normalized).metadata();
    return { buffer: normalized, width: metadata.width || 600, height: metadata.height || 600 };
}

async function applyEffect(buffer, effect) {
    const image = await normalizeImage(buffer);
    const { buffer: normalized, width, height } = image;
    let pipeline = sharp(normalized);
    let overlay;

    if (effect === 'triggered') {
        pipeline = pipeline.modulate({ saturation: 1.8, brightness: 1.08 });
        overlay = labelOverlay(width, height, 'TRIGGERED', '#ff1744', 'calm down');
    } else if (effect === 'passed') {
        overlay = labelOverlay(width, height, 'PASSED', '#00c853', 'approved');
    } else if (effect === 'jail') {
        const bars = Array.from({ length: 7 }, (_, i) => {
            const x = Math.round((i + 0.4) * width / 7);
            return `<rect x="${x}" y="0" width="${Math.max(10, Math.round(width / 38))}" height="${height}" rx="6" fill="#111" opacity="0.82"/>`;
        }).join('');
        overlay = svg(width, height, `${bars}<text x="50%" y="92%" text-anchor="middle" font-family="Arial" font-size="${Math.max(26, Math.round(width / 18))}" font-weight="900" fill="white" stroke="black" stroke-width="3" paint-order="stroke">HORNY JAIL</text>`);
    } else if (effect === 'glass') {
        const cracks = [
            `M ${width * 0.52} 0 L ${width * 0.48} ${height * 0.34} L ${width * 0.22} ${height * 0.54}`,
            `M ${width * 0.49} ${height * 0.35} L ${width * 0.74} ${height * 0.52} L ${width * 0.9} ${height * 0.32}`,
            `M ${width * 0.48} ${height * 0.35} L ${width * 0.58} ${height * 0.72} L ${width * 0.42} ${height}`,
            `M ${width * 0.22} ${height * 0.54} L ${width * 0.1} ${height * 0.83}`
        ].map(d => `<path d="${d}" fill="none" stroke="white" stroke-width="${Math.max(4, Math.round(width / 180))}" opacity="0.9"/>`).join('');
        overlay = svg(width, height, `${cracks}<text x="50%" y="92%" text-anchor="middle" font-family="Arial" font-size="${Math.max(24, Math.round(width / 21))}" font-weight="900" fill="white" stroke="black" stroke-width="3" paint-order="stroke">GLASS BREAK</text>`);
    } else if (effect === 'gay' || effect === 'lgbt') {
        const colors = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
        const bands = colors.map((color, i) => `<rect x="0" y="${Math.round(i * height / colors.length)}" width="${width}" height="${Math.ceil(height / colors.length) + 2}" fill="${color}" opacity="0.24"/>`).join('');
        overlay = svg(width, height, `${bands}<text x="50%" y="90%" text-anchor="middle" font-family="Arial" font-size="${Math.max(26, Math.round(width / 18))}" font-weight="900" fill="white" stroke="black" stroke-width="3" paint-order="stroke">${effect.toUpperCase()}</text>`);
    } else if (effect === 'comrade') {
        overlay = labelOverlay(width, height, 'COMRADE', '#d50000', 'solidarity');
    } else if (effect === 'its-so-stupid') {
        overlay = labelOverlay(width, height, 'IT\'S SO STUPID', '#ffd600', 'bruh');
    } else if (effect === 'horny') {
        overlay = labelOverlay(width, height, 'BONK!', '#ff6d00', 'go to horny jail');
    } else if (effect === 'heart') {
        const heartPath = `M ${width / 2} ${height * 0.78} C ${width * 0.14} ${height * 0.54}, ${width * 0.22} ${height * 0.18}, ${width / 2} ${height * 0.4} C ${width * 0.78} ${height * 0.18}, ${width * 0.86} ${height * 0.54}, ${width / 2} ${height * 0.78} Z`;
        overlay = svg(width, height, `<path d="${heartPath}" fill="#ff1744" opacity="0.72" stroke="white" stroke-width="${Math.max(5, Math.round(width / 120))}"/><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="${Math.max(26, Math.round(width / 18))}" font-weight="900" fill="white" stroke="#b00020" stroke-width="3" paint-order="stroke">LOVE</text>`);
    } else if (effect === 'circle') {
        const mask = svg(width, height, `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.47}" fill="white"/>`);
        return sharp(normalized).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    }

    return pipeline.composite([{ input: overlay }]).png().toBuffer();
}

async function imageCommand(sock, chatId, msg, effect) {
    try {
        const buffer = await downloadImage(msg);
        if (!buffer) return sendText(sock, chatId, msg, `⚠️ Reply to an image or sticker to use .${effect}.`);
        const output = await applyEffect(buffer, effect);
        return sock.sendMessage(chatId, { image: output, caption: `✅ ${effect} effect applied.` }, { quoted: msg });
    } catch (error) {
        return sendText(sock, chatId, msg, `❌ .${effect} failed: ${error.message}`);
    }
}

async function oogway(sock, chatId, msg, q) {
    const text = String(q || '').trim() || 'Your choices shape your future.';
    try {
        const response = await axios.get('https://api.popcat.xyz/v2/oogway', {
            params: { text },
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': USER_AGENT }
        });
        const type = String(response.headers['content-type'] || '');
        if (response.status >= 200 && response.status < 300 && type.startsWith('image/')) {
            return sock.sendMessage(chatId, { image: Buffer.from(response.data), caption: '🐢 Oogway quote' }, { quoted: msg });
        }
        throw new Error('Oogway API returned an invalid image');
    } catch (_) {
        const card = await makeCard('OOGWAY', text, '#6a1b9a', '#ffca28');
        return sock.sendMessage(chatId, { image: card, caption: '🐢 Oogway quote' }, { quoted: msg });
    }
}

async function makeCard(title, body, start, end, footer = 'MD-ZESHOO-BOT') {
    const width = 1000;
    const height = 620;
    const safeTitle = xml(shortText(title, 45));
    const safeBody = xml(shortText(body, 220));
    const safeFooter = xml(footer);
    const card = svg(width, height, `
        <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs>
        <rect width="100%" height="100%" rx="40" fill="url(#bg)"/>
        <rect x="45" y="45" width="910" height="530" rx="30" fill="#000" opacity="0.22"/>
        <text x="80" y="145" font-family="Arial" font-size="64" font-weight="900" fill="white">${safeTitle}</text>
        <foreignObject x="80" y="205" width="840" height="240"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:42px;line-height:1.25;color:white;font-weight:700;word-wrap:break-word">${safeBody}</div></foreignObject>
        <text x="80" y="520" font-family="Arial" font-size="27" fill="white" opacity="0.85">${safeFooter}</text>
    `);
    return sharp(card).png().toBuffer();
}

async function ytcomment(sock, chatId, msg, q) {
    const comment = String(q || '').trim() || 'This bot is awesome!';
    const author = shortText(msg?.pushName || 'YouTube User', 40);
    const card = await makeCard(`@${author}`, comment, '#ff0000', '#282828', 'YouTube comment');
    return sock.sendMessage(chatId, { image: card, caption: '▶️ YouTube comment card' }, { quoted: msg });
}

async function namecard(sock, chatId, msg, q) {
    const name = String(q || '').trim() || msg?.pushName || 'ZESHOO USER';
    const card = await makeCard('NAME CARD', name, '#1565c0', '#00acc1', 'MD-ZESHOO-BOT');
    return sock.sendMessage(chatId, { image: card, caption: '🪪 Name card created.' }, { quoted: msg });
}

module.exports = {
    triggered: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'triggered'),
    passed: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'passed'),
    jail: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'jail'),
    glass: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'glass'),
    gay: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'gay'),
    comrade: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'comrade'),
    ytcomment,
    oogway,
    namecard,
    'its-so-stupid': (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'its-so-stupid'),
    lgbt: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'lgbt'),
    circle: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'circle'),
    horny: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'horny'),
    heart: (sock, chatId, msg) => imageCommand(sock, chatId, msg, 'heart')
};
