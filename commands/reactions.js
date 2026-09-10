const axios = require('axios');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

let ffmpegExecutable = 'ffmpeg';
try {
    const bundledFfmpeg = require('ffmpeg-static');
    if (bundledFfmpeg && fs.existsSync(bundledFfmpeg)) ffmpegExecutable = bundledFfmpeg;
} catch (_) {
    // Use the system ffmpeg binary when the optional bundled binary is unavailable.
}

const API_TIMEOUT = 15000;
const USER_AGENT = 'ZeshooMini (https://github.com/sin272/web-pair-md-zeshoo)';
const ENDPOINTS = (action) => [
    `https://nekos.best/api/v2/${action}`
];

const TITLES = {
    wink: '😉 WINK',
    smile: '😊 SMILE',
    cuddle: '🤗 CUDDLE',
    poke: '👉 POKE',
    pat: '🫳 PAT',
    slap: '🖐️ SLAP',
    kiss: '💋 KISS',
    hug: '🫂 HUG',
    kill: '💀 KILL',
    kick: '🦵 KICK',
    sleep: '😴 SLEEP',
    shoot: '🔫 SHOOT',
    cry: '😭 CRY',
    wave: '👋 WAVE',
    angry: '😡 ANGRY',
    highfive: '🙌 HIGH FIVE',
    dance: '💃 DANCE',
    blush: '😊 BLUSH',
    happy: '😄 HAPPY'
};

function extractImageUrl(data) {
    const candidates = [
        data?.results?.[0]?.url,
        data?.url,
        data?.image,
        data?.images?.[0]?.url
    ];
    return candidates.find(url => typeof url === 'string' && /^https?:\/\//i.test(url));
}

async function fetchReactionUrl(action) {
    const fallbackActions = {
        kill: ['kill', 'shoot', 'kick']
    };
    const actionsToTry = fallbackActions[action] || [action];
    let lastError;
    for (const candidateAction of actionsToTry) {
        for (const endpoint of ENDPOINTS(candidateAction)) {
            try {
                const response = await axios.get(endpoint, {
                    timeout: API_TIMEOUT,
                    headers: {
                        'User-Agent': USER_AGENT,
                        Accept: 'application/json'
                    },
                    validateStatus: status => status >= 200 && status < 300
                });
                const url = extractImageUrl(response.data || {});
                if (url) return url;
                throw new Error('Reaction API returned no image URL');
            } catch (error) {
                lastError = error;
            }
        }
    }
    throw lastError || new Error('No reaction image API available');
}

async function fetchReactionGif(action) {
    const imageUrl = await fetchReactionUrl(action);
    const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: API_TIMEOUT,
        headers: { 'User-Agent': USER_AGENT }
    });
    return Buffer.from(response.data);
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

async function convertGifToMp4(gifBuffer) {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'md-zeshoo-reaction-'));
    const inputPath = path.join(tempDir, 'reaction.gif');
    const outputPath = path.join(tempDir, 'reaction.mp4');
    try {
        await fsp.writeFile(inputPath, gifBuffer);
        await runFfmpeg([
            '-y', '-i', inputPath,
            '-vf', 'fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p',
            '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', 'faststart', outputPath
        ]);
        return await fsp.readFile(outputPath);
    } finally {
        await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

function createReactionCommand(action) {
    const title = TITLES[action] || action.toUpperCase();
    return async function reactionCommand(sock, chatId, msg) {
        try {
            const gif = await fetchReactionGif(action);
            const video = await convertGifToMp4(gif);
            await sock.sendMessage(chatId, {
                video,
                mimetype: 'video/mp4',
                gifPlayback: true,
                caption: `${title}\n\n—͟͟͞͞𖣘 Animated SFW reaction powered by MD-ZESHOO BOT`
            }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ ${title} reaction abhi available nahi hai. Thodi der baad dobara try karein.`
            }, { quoted: msg });
        }
    };
}

module.exports = {
    wink: createReactionCommand('wink'),
    smile: createReactionCommand('smile'),
    cuddle: createReactionCommand('cuddle'),
    poke: createReactionCommand('poke'),
    pat: createReactionCommand('pat'),
    slap: createReactionCommand('slap'),
    kiss: createReactionCommand('kiss'),
    hug: createReactionCommand('hug'),
    kill: createReactionCommand('kill'),
    kick: createReactionCommand('kick'),
    sleep: createReactionCommand('sleep'),
    shoot: createReactionCommand('shoot'),
    cry: createReactionCommand('cry'),
    wave: createReactionCommand('wave'),
    angry: createReactionCommand('angry'),
    highfive: createReactionCommand('highfive'),
    dance: createReactionCommand('dance'),
    blush: createReactionCommand('blush'),
    happy: createReactionCommand('happy'),
    fetchReactionUrl,
    fetchReactionGif,
    convertGifToMp4
};
