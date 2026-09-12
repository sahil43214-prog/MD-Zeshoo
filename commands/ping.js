const { channelContextInfo } = require('./channel-button');

async function pingCommand(sock, from, msg) {
    const start = Date.now();
    await sock.sendMessage(from, { text: 'Testing Speed...' }, { quoted: msg });
    const end = Date.now();
    await sock.sendMessage(from, {
        text: `⚡ *Response Speed:* ${end - start}ms`,
        contextInfo: channelContextInfo()
    }, { quoted: msg });
}

module.exports = pingCommand;
