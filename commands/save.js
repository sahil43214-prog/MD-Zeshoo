// save — kept as a safe fallback because the original implementation is absent.
module.exports = async function save(sock, chatId, msg) {
    return sock.sendMessage(
        chatId,
        { text: '❌ The save command is unavailable in this Railway-safe build.' },
        { quoted: msg }
    );
};
