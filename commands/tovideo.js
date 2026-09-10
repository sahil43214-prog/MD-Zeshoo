const { findMedia, downloadMedia, convertBuffer } = require('./media-utils');

module.exports = async function toVideoCommand(sock, chatId, msg) {
    try {
        const media = findMedia(msg, ['audio']);
        if (!media) return await sock.sendMessage(chatId, { text: '⚠️ Reply to or send an audio file to convert it to video.' }, { quoted: msg });

        await sock.sendMessage(chatId, { text: '🎬 Converting audio to video...' }, { quoted: msg });
        const input = await downloadMedia(media);
        const output = await convertBuffer(input, media.extension, '.mp4', (inputPath, outputPath) => [
            '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=30', '-i', inputPath,
            '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast',
            '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
            '-shortest', outputPath
        ]);

        await sock.sendMessage(chatId, {
            video: output,
            mimetype: 'video/mp4',
            fileName: 'converted.mp4',
            caption: '✅ Audio converted to video.'
        }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ Audio-to-video conversion failed: ${error.message}` }, { quoted: msg });
    }
};
