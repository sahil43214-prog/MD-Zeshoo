// Screenshot command is intentionally dependency-free for Railway Free.
// A browser screenshot provider is not bundled with this bot, so fail gracefully.
module.exports = async function screenshot(sock, chatId, msg) {
    return sock.sendMessage(
        chatId,
        { text: '❌ Screenshot command temporarily unavailable: no browser screenshot engine is installed.' },
        { quoted: msg }
    );
};
