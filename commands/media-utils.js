const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

let ffmpegExecutable = 'ffmpeg';
try {
    ffmpegExecutable = require('ffmpeg-static') || ffmpegExecutable;
} catch (_) {
    // The production package includes ffmpeg-static; system ffmpeg remains a safe fallback.
}

function getQuotedMessage(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function findMedia(msg, allowedKinds) {
    const sources = [msg?.message, getQuotedMessage(msg)].filter(Boolean);
    for (const source of sources) {
        if (allowedKinds.includes('video') && source.videoMessage) {
            return { content: source.videoMessage, downloadType: 'video', extension: '.mp4', kind: 'video' };
        }
        if (allowedKinds.includes('audio') && source.audioMessage) {
            return { content: source.audioMessage, downloadType: 'audio', extension: '.mp3', kind: 'audio' };
        }
        if (source.documentMessage) {
            const mimetype = String(source.documentMessage.mimetype || '').toLowerCase();
            if (allowedKinds.includes('video') && mimetype.startsWith('video/')) {
                return { content: source.documentMessage, downloadType: 'document', extension: '.mp4', kind: 'video' };
            }
            if (allowedKinds.includes('audio') && mimetype.startsWith('audio/')) {
                return { content: source.documentMessage, downloadType: 'document', extension: '.mp3', kind: 'audio' };
            }
        }
    }
    return null;
}

async function downloadMedia(media) {
    const stream = await downloadContentFromMessage(media.content, media.downloadType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(ffmpegExecutable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        process.stderr.on('data', chunk => {
            stderr += chunk.toString();
            if (stderr.length > 5000) stderr = stderr.slice(-5000);
        });
        process.once('error', reject);
        process.once('close', code => {
            if (code === 0) return resolve();
            reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
        });
    });
}

async function convertBuffer(inputBuffer, inputExtension, outputExtension, buildArgs) {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'md-zeshoo-media-'));
    const inputPath = path.join(tempDir, `input${inputExtension || '.bin'}`);
    const outputPath = path.join(tempDir, `output${outputExtension}`);
    try {
        await fsp.writeFile(inputPath, inputBuffer);
        await runFfmpeg(buildArgs(inputPath, outputPath));
        return await fsp.readFile(outputPath);
    } finally {
        await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

module.exports = { findMedia, downloadMedia, convertBuffer };
