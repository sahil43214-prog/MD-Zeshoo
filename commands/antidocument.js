module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Sirf group admin ye command use kar sakta hai.' }, { quoted: msg });
    if (!botData.antiDocumentGroups) botData.antiDocumentGroups = {};
    const mode = (args[0] || '').toLowerCase();
    if (!mode) {
        const current = botData.antiDocumentGroups[from] || 'off';
        return await sock.sendMessage(from, { text: `📄 *ANTI-DOCUMENT SYSTEM*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage:\n.antidocument on - block document files, delete & warn\n.antidocument warn - block documents, delete, warn & keep 3 warnings\n.antidocument kick - block documents, delete & kick on warn limit\n.antidocument off - disable system` }, { quoted: msg });
    }
    if (!['on', 'off', 'warn', 'kick'].includes(mode)) return await sock.sendMessage(from, { text: '❌ Invalid mode! Use: .antidocument on/off/warn/kick' }, { quoted: msg });
    botData.antiDocumentGroups[from] = mode;
    saveBotData();
    return await sock.sendMessage(from, { text: `✅ Anti-document system ${mode === 'off' ? 'disabled' : 'enabled'} successfully!` }, { quoted: msg });
};
