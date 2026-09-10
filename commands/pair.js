const settings = require('../settings');

module.exports = async function pairCommand(sock, chatId, msg, q) {
    const dashboardUrl = process.env.PAIRING_URL || process.env.DASHBOARD_URL || 'https://zeshoo-md-production.up.railway.app/';
    const number = String(q || '').replace(/[^0-9]/g, '');
    const hint = number
        ? `\n📱 Number received: +${number}\nOpen the dashboard and enter this number to receive the pairing code.`
        : '\n📱 Usage: .pair 91XXXXXXXXXX';
    const text = [
        '╭─❰ ✨ ZESHOO PAIRING ✨ ❱',
        '│ 🔐 Secure multi-number pairing',
        `│ 🌐 Dashboard: ${dashboardUrl}`,
        hint,
        '│ ⚠️ Never share your pairing code or auth files.',
        '╰────────────────────────────',
        `𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗭𝗘𝗦𝗛𝗢𝗢 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧 ${settings?.version ? `v${settings.version}` : ''}`
    ].join('\n');
    return sock.sendMessage(chatId, { text }, { quoted: msg });
};

module.exports.menuCategory = '👑 OWNER';
module.exports.menuLabel = 'pair <number> (secure dashboard pairing)';
