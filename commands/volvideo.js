const { findMedia, downloadMedia, convertBuffer } = require('./media-utils');

function parseVolume(value) {
    const requested = Number.parseFloat(String(value || '').replace('%', ''));
    if (!Number.isFinite(requested)) return 150;
    return Math.min(300, Math.max(0, requested));
}

module.exports = async function volumeVideoCommand(sock, chatId, msg, q) {
    try {
        const media = findMedia(msg, ['video']);
        if (!media) return await sock.sendMessage(chatId, { text: '⚠️ Reply to or send a video. Optional usage: .volvideo 200' }, { quoted: msg });

        const volume = parseVolume(q);
        await sock.sendMessage(chatId, { text: `🔊 Adjusting video volume to ${volume}%...` }, { quoted: msg });
        const input = await downloadMedia(media);
        const output = await convertBuffer(input, media.extension, '.mp4', (inputPath, outputPath) => [
            '-y', '-i', inputPath, '-c:v', 'copy', '-af', `volume=${(volume / 100).toFixed(2)}`,
            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath
        ]);

        await sock.sendMessage(chatId, {
            video: output,
            mimetype: 'video/mp4',
            fileName: 'volume-adjusted.mp4',
            caption: `✅ Video volume set to ${volume}%.`
        }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ Video volume conversion failed: ${error.message}` }, { quoted: msg });
    }
};
