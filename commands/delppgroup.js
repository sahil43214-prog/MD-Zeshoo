module.exports = async function(sock, chatId, msg, isAdmin) {
    if (!isAdmin) return sock.sendMessage(chatId, { text: '❌ Only group admins can change the group picture.' }, { quoted: msg });
    try {
        await sock.removeProfilePicture(chatId);
        await sock.sendMessage(chatId, { text: '✅ Group profile picture deleted.' }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ Could not delete the group picture: ${error.message}` }, { quoted: msg });
    }
};
