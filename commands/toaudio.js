const { findMedia, downloadMedia, convertBuffer } = require('./media-utils');

module.exports = async function toAudioCommand(sock, chatId, msg) {
    try {
        const media = findMedia(msg, ['video']);
        if (!media) return await sock.sendMessage(chatId, { text: '⚠️ Reply to or send a video to convert it to audio.' }, { quoted: msg });

        await sock.sendMessage(chatId, { text: '🎵 Converting video to audio...' }, { quoted: msg });
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
        await sock.sendMessage(chatId, { text: `❌ Video-to-audio conversion failed: ${error.message}` }, { quoted: msg });
    }
};
