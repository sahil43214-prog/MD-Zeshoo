const MAX_ANTI_LINK_WARNINGS = 3;
const USER_TEXT_KEYS = new Set([
    'conversation', 'text', 'caption', 'description', 'title',
    'selectedDisplayText', 'selectedButtonId', 'displayText', 'paramsJson',
    'sourceUrl', 'matchedText'
]);
const SKIP_LINK_SCAN_KEYS = new Set([
    'jpegThumbnail', 'thumbnail', 'mediaKey', 'fileSha256', 'fileEncSha256',
    'directPath', 'mediaKeyTimestamp', 'fileLength'
]);
const LINK_PATTERN = /(?:\b[a-z][a-z0-9+.-]{0,20}:\/\/[^\s<>]+|\b(?:mailto|tel|tg|magnet|whatsapp):[^\s<>]+|\bwww\d*\.[^\s<>]+|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,63}(?::\d+)?(?:\/[^\s<>]*)?|\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/[^\s<>]*)?)/iu;

function extractLinkText(messageContent) {
    const parts = [];
    const visit = (node, depth = 0) => {
        if (!node || typeof node !== 'object' || depth > 8 || Buffer.isBuffer(node)) return;
        if (Array.isArray(node)) {
            for (const value of node) visit(value, depth + 1);
            return;
        }
        for (const [key, value] of Object.entries(node)) {
            if (SKIP_LINK_SCAN_KEYS.has(key)) continue;
            if (typeof value === 'string' && USER_TEXT_KEYS.has(key)) parts.push(value);
            else if (value && typeof value === 'object') visit(value, depth + 1);
        }
    };
    visit(messageContent);
    return parts.join('\n');
}

function containsLink(value) {
    const normalized = String(value || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*dot\s*\}|\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+|\s+\.\s+/gi, '.');
    return LINK_PATTERN.test(normalized);
}

function nextStrike(currentWarnings) {
    const warnings = Math.max(0, Math.min(MAX_ANTI_LINK_WARNINGS, Math.floor(Number(currentWarnings) || 0)));
    if (warnings >= MAX_ANTI_LINK_WARNINGS) {
        return { warnings: MAX_ANTI_LINK_WARNINGS, kick: true };
    }
    return { warnings: warnings + 1, kick: false };
}

async function antilinkCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin || !from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Only a group admin can change AntiLink settings.' }, { quoted: msg });
    }

    const action = String(args?.[0] || '').toLowerCase();
    if (!botData.antilinkGroups) botData.antilinkGroups = {};
    if (!botData.antiLinkWarnings) botData.antiLinkWarnings = {};
    const clearGroupWarnings = () => {
        for (const key of Object.keys(botData.antiLinkWarnings)) {
            if (key.startsWith(`${from}:`)) delete botData.antiLinkWarnings[key];
        }
    };

    if (action === 'on' || action === 'kick') {
        botData.antilinkGroups[from] = 'warn-kick';
        clearGroupWarnings();
        saveBotData();
        return await sock.sendMessage(from, {
            text: '✅ *AntiLink enabled.*\n\nLink messages are deleted immediately. The sender gets 3 warnings; another link after the 3 warnings results in a kick attempt.'
        }, { quoted: msg });
    }
    if (action === 'del') {
        botData.antilinkGroups[from] = 'del';
        clearGroupWarnings();
        saveBotData();
        return await sock.sendMessage(from, {
            text: '✅ *AntiLink delete-only mode enabled.* Link messages are deleted immediately; no warnings or kick.'
        }, { quoted: msg });
    }
    if (action === 'off') {
        delete botData.antilinkGroups[from];
        clearGroupWarnings();
        saveBotData();
        return await sock.sendMessage(from, { text: '❌ AntiLink disabled.' }, { quoted: msg });
    }

    return await sock.sendMessage(from, {
        text: '❌ Usage: .antilink on (delete + 3 warnings + kick after the warnings) / .antilink del (delete only) / .antilink off'
    }, { quoted: msg });
}

antilinkCommand.extractLinkText = extractLinkText;
antilinkCommand.containsLink = containsLink;
antilinkCommand.nextStrike = nextStrike;
module.exports = antilinkCommand;
