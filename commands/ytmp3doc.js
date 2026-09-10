// .ytmp3doc — Download YouTube video as MP3 DOCUMENT file (audio bheega hi nahi, file bhejta hai)
const axios = require('axios');
const yts = require('yt-search');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 2) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 250 * attempt));
            }
        }
    }
    throw lastError;
}

async function ytmp3docCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: '❌ Usage: `.ytmp3doc <YouTube link ya song ka naam>`' }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

    let video;
    try {
        if (q.includes('youtube.com') || q.includes('youtu.be')) {
            video = { url: q, title: 'YouTube Audio', timestamp: 'N/A' };
        } else {
            const search = await yts(q);
            if (!search || !search.videos.length) {
                await sock.sendMessage(from, { text: '❌ Koi result nahi mila.' }, { quoted: msg });
                return;
            }
            video = search.videos[0];
        }
    } catch (e) {
        video = { url: q, title: 'YouTube Audio', timestamp: 'N/A' };
    }

    await sock.sendMessage(from, { text: `📄 *YTMP3DOC Download*\n\n📌 ${video.title}\n⏱ Duration: ${video.timestamp || 'N/A'}\n\n📎 Audio FILE ke roop me bheja jayega.` }, { quoted: msg });

    let audioBuffer;
    let downloadSuccess = false;
    let finalTitle = video.title;
    const cleanName = (finalTitle || 'audio').replace(/[^\w\s-]/g, '').trim();

    const apiMethods = [
        { name: 'EliteProTech', method: async () => {
            const res = await tryRequest(() => axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(video.url)}&format=mp3`, AXIOS_DEFAULTS));
            if (res?.data?.success && res?.data?.downloadURL) return { download: res.data.downloadURL, title: res.data.title };
            throw new Error('EliteProTech failed');
        }},
        { name: 'Yupra', method: async () => {
            const res = await tryRequest(() => axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(video.url)}`, AXIOS_DEFAULTS));
            if (res?.data?.success && res?.data?.data?.download_url) return { download: res.data.data.download_url, title: res.data.data.title };
            throw new Error('Yupra failed');
        }},
        { name: 'Okatsu', method: async () => {
            const res = await tryRequest(() => axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(video.url)}`, AXIOS_DEFAULTS));
            if (res?.data?.dl) return { download: res.data.dl, title: res.data.title };
            throw new Error('Okatsu failed');
        }},
        { name: 'Alya', method: async () => {
            const res = await tryRequest(() => axios.get(`https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(video.url)}&apikey=G7I6X7`, AXIOS_DEFAULTS));
            if (res.data.status && res.data.data.url) return { download: res.data.data.url, title: res.data.data.title };
            throw new Error('Alya failed');
        }},
        { name: 'Siputzx', method: async () => {
            const res = await tryRequest(() => axios.get(`https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(video.url)}`, AXIOS_DEFAULTS));
            if (res?.data?.status && res?.data?.data?.dl) return { download: res.data.data.dl, title: res.data.data.title };
            throw new Error('Siputzx failed');
        }}
    ];

    for (const apiMethod of apiMethods) {
        try {
            const audioData = await apiMethod.method();
            const audioUrl = audioData.download;
            finalTitle = audioData.title || video.title;
            if (!audioUrl) continue;

            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
            });
            audioBuffer = Buffer.from(audioResponse.data);
            if (audioBuffer && audioBuffer.length > 0) { downloadSuccess = true; break; }
        } catch (err) {
            console.log(`[ytmp3doc] ${apiMethod.name} failed:`, err.message);
        }
    }

    if (!downloadSuccess || !audioBuffer) {
        await sock.sendMessage(from, { text: '❌ MP3 download karne me error aaya. Link sahi check karo ya baad me try karo.' }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        return;
    }

    // Detect format and convert to mp3 if needed
    const firstBytes = audioBuffer.slice(0, 4).toString('hex');
    let fileExtension = 'mp3';
    if (firstBytes.startsWith('000000') || audioBuffer.slice(4, 8).toString('ascii') === 'ftyp') fileExtension = 'm4a';
    else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') fileExtension = 'ogg';
    else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') fileExtension = 'wav';

    let finalBuffer = audioBuffer;
    if (fileExtension !== 'mp3') {
        try { finalBuffer = await toAudio(audioBuffer, fileExtension); }
        catch (_) { finalBuffer = audioBuffer; }
    }

    const caption = `╭━━━〔 𝗬𝗧𝗠𝗣𝟯𝗗𝗢𝗖 〕━━━┈⊷\n` +
        `┃ 📄 *TITLE:* ${finalTitle}\n` +
        `┃ 📎 *FORMAT:* MP3 Document\n` +
        `┃ 🔗 *LINK:* ${video.url}\n` +
        `╰━━━━━━━━━━━━━━━━━━┈⊷\n> © POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
    await sock.sendMessage(from, {
        document: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${cleanName || 'audio'}.mp3`,
        caption
    }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
}

module.exports = ytmp3docCommand;
