const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

const ffmpegBinary = process.env.FFMPEG_PATH || (ffmpegStatic && fs.existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg');
ffmpeg.setFfmpegPath(ffmpegBinary);

const states = new Map();
const MAX_QUEUE = 25;
const MAX_LOOP_REPEATS = 25;
const API_TIMEOUT = 120000;

function getState(chatId) {
    if (!states.has(chatId)) {
        states.set(chatId, {
            queue: [],
            current: null,
            processing: false,
            paused: false,
            stopRequested: false,
            skipRequested: false,
            loop: false,
            loopRepeats: 0,
            volume: 100,
            lastPlayed: null
        });
    }
    return states.get(chatId);
}

function reply(sock, chatId, msg, text) {
    return sock.sendMessage(chatId, { text }, { quoted: msg });
}

function cleanFileName(value) {
    return String(value || 'audio').replace(/[^\w\s-]/g, '').trim().slice(0, 80) || 'audio';
}

function isUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
}

async function resolveTrack(query) {
    const input = String(query || '').trim();
    if (!input) throw new Error('Song name or YouTube URL required');
    if (isUrl(input)) return { url: input, title: 'YouTube Audio', query: input };
    const result = await yts(input);
    const video = result?.videos?.[0];
    if (!video?.url) throw new Error('Song not found');
    return {
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.timestamp || 'N/A',
        query: input
    };
}

async function downloadTrack(track) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(track.url)}&format=mp3`;
    const metadata = await axios.get(apiUrl, { timeout: API_TIMEOUT, headers: { 'User-Agent': 'MD-ZESHOO-BOT/4.0' } });
    const downloadUrl = metadata.data?.downloadURL;
    if (!downloadUrl) throw new Error('Audio download source unavailable');
    const audio = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: API_TIMEOUT,
        maxContentLength: 50 * 1024 * 1024,
        headers: { 'User-Agent': 'MD-ZESHOO-BOT/4.0' }
    });
    const buffer = Buffer.from(audio.data);
    if (!buffer.length) throw new Error('Downloaded audio is empty');
    return { buffer, title: metadata.data.title || track.title };
}

async function applyVolume(buffer, percent) {
    const tempDir = path.resolve('./temp');
    await fs.ensureDir(tempDir);
    const id = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(tempDir, `${id}_in.mp3`);
    const outputPath = path.join(tempDir, `${id}_out.mp3`);
    try {
        await fs.writeFile(inputPath, buffer);
        await new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath).audioCodec('libmp3lame');
            if (percent !== 100) command.audioFilters(`volume=${percent / 100}`);
            command
                .format('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });
        return await fs.readFile(outputPath);
    } finally {
        await Promise.all([
            fs.remove(inputPath).catch(() => {}),
            fs.remove(outputPath).catch(() => {})
        ]);
    }
}

async function processQueue(sock, chatId, msg, state) {
    if (state.processing) return;
    state.processing = true;
    try {
        while (state.current || state.queue.length) {
            if (state.stopRequested || state.paused) break;
            if (!state.current) state.current = state.queue.shift();
            const track = state.current;
            state.skipRequested = false;
            try {
                const downloaded = await downloadTrack(track);
                if (state.stopRequested || state.skipRequested) {
                    state.current = null;
                    continue;
                }
                const audio = await applyVolume(downloaded.buffer, state.volume);
                if (state.stopRequested || state.skipRequested) {
                    state.current = null;
                    continue;
                }
                await sock.sendMessage(chatId, {
                    audio,
                    mimetype: 'audio/mpeg',
                    fileName: `${cleanFileName(downloaded.title)}.mp3`,
                    ptt: false
                }, { quoted: msg });
                state.lastPlayed = { ...track, title: downloaded.title };
            } catch (error) {
                await reply(sock, chatId, msg, `❌ Music error: ${error.message}`);
            }
            if (state.stopRequested) break;
            if (state.skipRequested) {
                state.current = null;
                continue;
            }
            if (state.loop && state.loopRepeats < MAX_LOOP_REPEATS) {
                state.loopRepeats += 1;
                state.queue.unshift({ ...track });
            } else {
                state.loopRepeats = 0;
            }
            state.current = null;
        }
    } finally {
        state.processing = false;
        if (state.stopRequested) {
            state.queue = [];
            state.current = null;
            state.stopRequested = false;
            state.skipRequested = false;
            state.loopRepeats = 0;
        }
    }
}

async function play(sock, chatId, msg, query) {
    if (!query) return reply(sock, chatId, msg, '⚠️ Usage: .play <song name or YouTube URL>');
    const state = getState(chatId);
    if (state.queue.length >= MAX_QUEUE) return reply(sock, chatId, msg, `❌ Queue full hai. Maximum ${MAX_QUEUE} tracks allowed hain.`);
    try {
        const track = await resolveTrack(query);
        state.queue.push(track);
        state.paused = false;
        state.stopRequested = false;
        const position = state.current ? state.queue.length : 1;
        await reply(sock, chatId, msg, `🎵 *Queued:* ${track.title}\n⏱ ${track.duration || 'N/A'}\n📍 Position: ${position}`);
        processQueue(sock, chatId, msg, state).catch(error => reply(sock, chatId, msg, `❌ Music queue error: ${error.message}`));
    } catch (error) {
        await reply(sock, chatId, msg, `❌ ${error.message}`);
    }
}

async function skip(sock, chatId, msg) {
    const state = getState(chatId);
    if (!state.current && !state.queue.length) return reply(sock, chatId, msg, 'ℹ️ Queue already empty hai.');
    state.skipRequested = true;
    if (!state.processing) state.current = null;
    await reply(sock, chatId, msg, '⏭️ Current track skip request set kar di gayi hai.');
    if (!state.processing) processQueue(sock, chatId, msg, state);
}

async function stop(sock, chatId, msg) {
    const state = getState(chatId);
    state.stopRequested = true;
    state.queue = [];
    state.current = null;
    state.paused = false;
    state.loopRepeats = 0;
    await reply(sock, chatId, msg, '⏹️ Music queue stop aur clear kar di gayi hai.');
}

async function pause(sock, chatId, msg) {
    const state = getState(chatId);
    state.paused = true;
    await reply(sock, chatId, msg, '⏸️ Music queue pause hai. Current WhatsApp audio ko remotely pause nahi kiya ja sakta; next queued track ruk jayega.');
}

async function resume(sock, chatId, msg) {
    const state = getState(chatId);
    state.paused = false;
    state.stopRequested = false;
    await reply(sock, chatId, msg, '▶️ Music queue resume kar di gayi hai.');
    processQueue(sock, chatId, msg, state).catch(error => reply(sock, chatId, msg, `❌ Music queue error: ${error.message}`));
}

async function queue(sock, chatId, msg) {
    const state = getState(chatId);
    const lines = [];
    if (state.current) lines.push(`▶️ Now: ${state.current.title}`);
    state.queue.forEach((track, index) => lines.push(`${index + 1}. ${track.title}`));
    if (!lines.length) return reply(sock, chatId, msg, '📭 Music queue empty hai.');
    return reply(sock, chatId, msg, `🎶 *MUSIC QUEUE*\n\n${lines.join('\n')}\n\nVolume: ${state.volume}% | Loop: ${state.loop ? 'on' : 'off'}`);
}

async function volume(sock, chatId, msg, query) {
    const state = getState(chatId);
    const value = Number(String(query || '').trim());
    if (!Number.isFinite(value) || value < 0 || value > 200) return reply(sock, chatId, msg, '⚠️ Usage: .volume <0-200>');
    state.volume = Math.round(value);
    return reply(sock, chatId, msg, `🔊 Music volume ${state.volume}% set hai. Ye next tracks par apply hoga.`);
}

async function loop(sock, chatId, msg, query) {
    const state = getState(chatId);
    const value = String(query || '').trim().toLowerCase();
    if (!['on', 'off'].includes(value)) return reply(sock, chatId, msg, `⚠️ Usage: .loop on/off\nCurrent: ${state.loop ? 'on' : 'off'}`);
    state.loop = value === 'on';
    state.loopRepeats = 0;
    return reply(sock, chatId, msg, `🔁 Loop ${state.loop ? 'on' : 'off'} hai.`);
}

async function shuffle(sock, chatId, msg) {
    const state = getState(chatId);
    for (let i = state.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
    }
    return reply(sock, chatId, msg, state.queue.length ? '🔀 Music queue shuffle ho gayi hai.' : '📭 Shuffle karne ke liye queue empty hai.');
}

async function nowplaying(sock, chatId, msg) {
    const state = getState(chatId);
    const track = state.current || state.lastPlayed;
    if (!track) return reply(sock, chatId, msg, 'ℹ️ Abhi koi track active nahi hai.');
    return reply(sock, chatId, msg, `🎧 *NOW PLAYING*\n\n${track.title}\n🔊 Volume: ${state.volume}%\n🔁 Loop: ${state.loop ? 'on' : 'off'}\n⏸️ Queue: ${state.paused ? 'paused' : 'active'}`);
}

module.exports = { play, skip, stop, pause, resume, queue, volume, loop, shuffle, nowplaying, states, resolveTrack, downloadTrack, applyVolume };
