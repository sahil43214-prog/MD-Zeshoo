const { findMedia, downloadMedia, convertBuffer } = require('./media-utils');

function parseVolume(value) {
    const requested = Number.parseFloat(String(value || '').replace('%', ''));
    if (!Number.isFinite(requested)) return 150;
    return Math.min(300, Math.max(0, requested));
}

function mediaOrUsage(msg, command) {
    const media = findMedia(msg, ['audio', 'video']);
    return media || { usage: `⚠️ Reply to or send an audio/video file. Usage: .${command}` };
}

async function applyEffect(sock, chatId, msg, command, filter, q) {
    try {
        const media = mediaOrUsage(msg, command);
        if (media.usage) return await sock.sendMessage(chatId, { text: media.usage }, { quoted: msg });
        const volumeText = command === 'volaudio' ? ` to ${parseVolume(q)}%` : '';
        await sock.sendMessage(chatId, { text: `🎧 Applying .${command}${volumeText}...` }, { quoted: msg });
        const input = await downloadMedia(media);
        const output = await convertBuffer(input, media.extension, '.mp3', (inputPath, outputPath) => [
            '-y', '-i', inputPath, '-vn', '-af', typeof filter === 'function' ? filter(q) : filter,
            '-codec:a', 'libmp3lame', '-q:a', '2', outputPath
        ]);
        await sock.sendMessage(chatId, {
            audio: output,
            mimetype: 'audio/mpeg',
            fileName: `${command}.mp3`,
            caption: `✅ Audio effect applied: ${command}`
        }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ .${command} failed: ${error.message}` }, { quoted: msg });
    }
}

async function convertToPtt(sock, chatId, msg) {
    try {
        const media = mediaOrUsage(msg, 'toptt');
        if (media.usage) return await sock.sendMessage(chatId, { text: `${media.usage} (voice note me convert hoga)` }, { quoted: msg });
        await sock.sendMessage(chatId, { text: '🎙️ Converting audio to voice note...' }, { quoted: msg });
        const input = await downloadMedia(media);
        const output = await convertBuffer(input, media.extension, '.ogg', (inputPath, outputPath) => [
            '-y', '-i', inputPath, '-vn', '-c:a', 'libopus', '-b:a', '96k', '-ac', '1', '-ar', '48000', outputPath
        ]);
        await sock.sendMessage(chatId, {
            audio: output,
            mimetype: 'audio/ogg; codecs=opus',
            fileName: 'voice-note.ogg',
            ptt: true
        }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ .toptt failed: ${error.message}` }, { quoted: msg });
    }
}

async function convertVideoToMp3(sock, chatId, msg) {
    try {
        const media = findMedia(msg, ['video']);
        if (!media) return await sock.sendMessage(chatId, { text: '⚠️ Reply to or send a video. Usage: .tomp3' }, { quoted: msg });
        await sock.sendMessage(chatId, { text: '🎵 Converting video to MP3...' }, { quoted: msg });
        const input = await downloadMedia(media);
        const output = await convertBuffer(input, media.extension, '.mp3', (inputPath, outputPath) => [
            '-y', '-i', inputPath, '-vn', '-codec:a', 'libmp3lame', '-q:a', '2', outputPath
        ]);
        await sock.sendMessage(chatId, {
            audio: output,
            mimetype: 'audio/mpeg',
            fileName: 'converted.mp3'
        }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ .tomp3 failed: ${error.message}` }, { quoted: msg });
    }
}

module.exports = {
    earrape: (sock, chatId, msg) => applyEffect(sock, chatId, msg, 'earrape', 'volume=18dB,alimiter=limit=0.98'),
    reverse: (sock, chatId, msg) => applyEffect(sock, chatId, msg, 'reverse', 'areverse'),
    robot: (sock, chatId, msg) => applyEffect(sock, chatId, msg, 'robot', 'acrusher=bits=8:mix=0.65,aecho=0.8:0.88:60:0.35'),
    volaudio: (sock, chatId, msg, q) => applyEffect(sock, chatId, msg, 'volaudio', value => `volume=${(parseVolume(value) / 100).toFixed(2)}` , q),
    deep: (sock, chatId, msg) => applyEffect(sock, chatId, msg, 'deep', 'asetrate=33075,aresample=44100,atempo=1.3333'),
    blown: (sock, chatId, msg) => applyEffect(sock, chatId, msg, 'blown', 'acrusher=bits=8:mix=0.8,volume=4dB'),
    bass: (sock, chatId, msg) => applyEffect(sock, chatId, msg, 'bass', 'bass=g=10:f=100:w=0.5'),
    toptt: convertToPtt,
    tomp3: convertVideoToMp3
};
