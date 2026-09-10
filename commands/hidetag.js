async function hidetagCommand(sock, from, msg, isAdmin, q) {
    if (!isAdmin || !from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ Only admin can use this command in groups." }, { quoted: msg });
    
    // Remove the command message first, then send the requested hidetag reply.
    // If the bot lacks delete permission, continue without breaking the command.
    if (msg?.key) {
        try {
            await sock.sendMessage(from, { delete: msg.key });
        } catch (error) {
            console.error(`[HIDETAG] Could not delete command message: ${error.message}`);
        }
    }

    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants.map(p => p.id);
    
    await sock.sendMessage(from, { 
        text: q || "Assalamu Alaikum Everyone!", 
        mentions: participants 
    });
}

module.exports = hidetagCommand;
