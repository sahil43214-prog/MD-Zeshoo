const axios = require('axios');
const path = require('path');

const GITHUB_API = 'https://api.github.com';

function parseTarget(input) {
    const value = String(input || '').trim();
    if (!value) return null;
    const urlMatch = value.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#]+)(?:\/blob\/[^/]+\/(.+))?$/i);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, ''), filePath: urlMatch[3] || '' };
    const parts = value.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, ''), filePath: parts.slice(2).join('/') };
}

function headers() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    return {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'MD-ZESHOO-BOT',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

module.exports = async function repoCommand(sock, chatId, msg, q) {
    const target = parseTarget(q);
    if (!target) {
        return sock.sendMessage(chatId, {
            text: '⚠️ Usage:\n.repo owner/repository\n.repo owner/repository/path/to/file.js\n.repo https://github.com/owner/repository/blob/main/file.js'
        }, { quoted: msg });
    }
    try {
        const base = `${GITHUB_API}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
        const endpoint = target.filePath ? `${base}/contents/${target.filePath.split('/').map(encodeURIComponent).join('/')}` : base;
        const response = await axios.get(endpoint, { headers: headers(), timeout: 15000, maxContentLength: 15 * 1024 * 1024 });
        const data = response.data;
        if (Array.isArray(data)) {
            const names = data.slice(0, 80).map(item => `${item.type === 'dir' ? '📁' : '📄'} ${item.name}`).join('\n');
            return sock.sendMessage(chatId, { text: `📦 *${target.owner}/${target.repo}*\n\n${names}\n\nUse .repo ${target.owner}/${target.repo}/path/to/file` }, { quoted: msg });
        }
        if (!data.download_url || data.size > 15 * 1024 * 1024) {
            return sock.sendMessage(chatId, { text: '⚠️ This path is a directory, too large, or has no downloadable file URL.' }, { quoted: msg });
        }
        const file = await axios.get(data.download_url, { headers: headers(), responseType: 'arraybuffer', timeout: 30000, maxContentLength: 15 * 1024 * 1024 });
        const filename = path.basename(data.name || target.filePath || 'github-file');
        await sock.sendMessage(chatId, {
            document: Buffer.from(file.data),
            fileName: filename,
            mimetype: 'application/octet-stream',
            caption: `📦 ${target.owner}/${target.repo}\n📄 ${target.filePath || filename}`
        }, { quoted: msg });
    } catch (error) {
        const status = error.response?.status;
        const text = status === 404
            ? '❌ GitHub repository/file not found, or it is private without a valid server-side GITHUB_TOKEN.'
            : status === 403
                ? '❌ GitHub access denied or rate limit reached.'
                : '❌ GitHub download failed. Check the repository/file path.';
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    }
};

module.exports.menuCategory = '🛠️ TOOLS';
module.exports.menuLabel = 'repo <owner/repo[/file]> (download)';
