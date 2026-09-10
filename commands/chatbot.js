module.exports = async function(sock, chatId, msg, session, args) {
    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
        session.aiEnabled = true;
        await sock.sendMessage(chatId, { text: '\u1F916 Chatbot AI ON! Group mein @mention karke sawaal poochein—main sabhi members ko respectful reply dunga. Personal chat mein auto-reply OFF hai.' }, { quoted: msg });
    } else if (action === 'off') {
        session.aiEnabled = false;
        await sock.sendMessage(chatId, { text: '\u274C Chatbot AI OFF!' }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, { 
            text: `*\u1F3AE Chatbot Settings*\n\n` +
                `Status: ${session.aiEnabled ? 'ON' : 'OFF'}\n` +
                `Mode: Group only + @mention required\n` +
                `Language: Respectful, no bad words\n\n` +
                `Use .chatbot on/off` 
        }, { quoted: msg });
    }
};
