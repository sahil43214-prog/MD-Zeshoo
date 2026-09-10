// .song2 — Alternate YouTube song downloader (song command ka doosra engine)
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

async function song2Command(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: '❌ Usage: `.song2 <song ka naam ya YouTube link>`' }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '🎵', key: msg.key } });

    let video;
    try {
        if (q.includes('youtube.com') || q.includes('youtu.be')) {
            const info = await yts({ videoId: (q.split('v=')[1] || q.split('youtu.be/')[1] || '').split('&')[0] }).catch(() => null);
            video = { url: q, title: info?.title || 'YouTube Audio', thumbnail: info?.thumbnail || '', timestamp: info?.duration?.toString() || 'N/A' };
        } else {
            const search = await yts(q);
            if (!search || !search.videos.length) {
                await sock.sendMessage(from, { text: '❌ Koi result nahi mila.' }, { quoted: msg });
                return;
            }
            video = search.videos[0];
        }
    } catch (e) {
        video = { url: q, title: 'YouTube Audio', thumbnail: '', timestamp: 'N/A' };
    }

    if (video.thumbnail) {
        await sock.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: `🎵 *SONG2 Download*\n\n📌 ${video.title}\n⏱ Duration: ${video.timestamp || 'N/A'}\n🔗 ${video.url}`
        }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: `🎵 *SONG2 Download*\n\n📌 ${video.title}\n⏱ Duration: ${video.timestamp || 'N/A'}` }, { quoted: msg });
    }

    let audioBuffer;
    let downloadSuccess = false;
    let finalTitle = video.title;
    const cleanName = (finalTitle || 'audio').replace(/[^\w\s-]/g, '').trim();

    // Different API chain than .song — these engines are tried first
    const apiMethods = [
        { name: 'Siputzx', method: async () => {
            const res = await tryRequest(() => axios.get(`https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(video.url)}`, AXIOS_DEFAULTS));
            if (res?.data?.status && res?.data?.data?.dl) return { download: res.data.data.dl, title: res.data.data.title };
            throw new Error('Siputzx failed');
        }},
        { name: 'YtDlp', method: async () => {
            const res = await tryRequest(() => axios.get(`https://api.botcahx.eu.org/api/dowloader/ytplaymp3?url=${encodeURIComponent(video.url)}&apikey=botcahx`, AXIOS_DEFAULTS));
            if (res?.data?.status && (res.data.result?.audio?.url || res.data.result?.mp3)) {
                return { download: res.data.result?.audio?.url || res.data.result?.mp3, title: res.data.result?.title || video.title };
            }
            throw new Error('YtDlp failed');
        }},
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
        { name: 'Alya', method: async () => {
            const res = await tryRequest(() => axios.get(`https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(video.url)}&apikey=G7I6X7`, AXIOS_DEFAULTS));
            if (res.data.status && res.data.data.url) return { download: res.data.data.url, title: res.data.data.title };
            throw new Error('Alya failed');
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
                timeout: 60000,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
            });
            audioBuffer = Buffer.from(audioResponse.data);
            if (audioBuffer && audioBuffer.length > 0) { downloadSuccess = true; break; }
        } catch (err) {
            console.log(`[song2] ${apiMethod.name} failed:`, err.message);
        }
    }

    if (!downloadSuccess || !audioBuffer) {
        await sock.sendMessage(from, { text: '❌ Song download karne me error aaya. Link sahi check karo ya baad me try karo.' }, { quoted: msg });
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

    const caption = `╭━━━〔 𝗦𝗢𝗡𝗚𝟮 𝗗𝗟 〕━━━┈⊷\n` +
        `┃ 🎵 *TITLE:* ${finalTitle}\n` +
        `┃ 🔗 *LINK:* ${video.url}\n` +
        `╰━━━━━━━━━━━━━━━━━━┈⊷\n> © POWERED BY 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧`;
    await sock.sendMessage(from, {
        audio: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${cleanName || 'audio'}.mp3`,
        ptt: false,
        caption
    }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
}

module.exports = song2Command;
