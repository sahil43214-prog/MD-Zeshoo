// send — kept as a safe fallback because the original implementation is absent.
module.exports = async function send(sock, chatId, msg) {
    return sock.sendMessage(
        chatId,
        { text: '❌ The send command is unavailable in this Railway-safe build.' },
        { quoted: msg }
    );
};
