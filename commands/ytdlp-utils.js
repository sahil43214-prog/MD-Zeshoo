const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const ytdlp = require('youtube-dl-exec');

let ffmpegLocation;
try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) ffmpegLocation = path.dirname(ffmpegStatic);
} catch (_) {}

function tempOutput(extension) {
    return path.join(os.tmpdir(), `md-zeshoo-${crypto.randomBytes(8).toString('hex')}.${extension}`);
}

async function runYtDlp(url, output, options) {
    await ytdlp(url, {
        noPlaylist: true,
        noWarnings: true,
        quiet: true,
        noPart: true,
        output,
        ...(ffmpegLocation ? { ffmpegLocation } : {}),
        ...options
    });
    const buffer = await fs.readFile(output);
    if (!buffer.length) throw new Error('yt-dlp produced an empty file');
    return buffer;
}

async function downloadAudio(url) {
    const output = tempOutput('mp3');
    try {
        const buffer = await runYtDlp(url, output, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '0'
        });
        return { buffer, title: '' };
    } finally {
        await fs.remove(output).catch(() => {});
        await fs.remove(`${output}.part`).catch(() => {});
    }
}

async function downloadVideo(url) {
    const output = tempOutput('mp4');
    try {
        const buffer = await runYtDlp(url, output, {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            mergeOutputFormat: 'mp4'
        });
        return { buffer, title: '' };
    } finally {
        await fs.remove(output).catch(() => {});
        await fs.remove(`${output}.part`).catch(() => {});
    }
}

async function getInfo(url) {
    return ytdlp(url, { dumpSingleJson: true, noWarnings: true, skipDownload: true, quiet: true, noPlaylist: true });
}

module.exports = { downloadAudio, downloadVideo, getInfo };
