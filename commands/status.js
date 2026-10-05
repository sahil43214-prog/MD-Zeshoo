const GROUP_STATUS_MAPS = [
    ['antilinkGroups', 'antilink'], ['antiStickerGroups', 'antisticker'], ['antiVoiceGroups', 'antivoice'],
    ['antiImageGroups', 'antiimage'], ['antiVideoGroups', 'antivideo'], ['antiStatusGroups', 'antistatus'],
    ['antiStatusLinkGroups', 'antistatuslink'], ['antiMessageGroups', 'antimessage'], ['antiBadwordGroups', 'antibadword'],
    ['antiBotGroups', 'antibot'], ['antiBugGroups', 'antibug'], ['antiReactionGroups', 'antireaction'],
    ['antiForwardGroups', 'antiforward'], ['antiGifGroups', 'antigif'], ['antiTagAdminGroups', 'antitagadmin'],
    ['antiViewOnceGroups', 'antiviewonce'], ['antiTagGroups', 'antitag'], ['antiPollGroups', 'antipoll'],
    ['antiLocationGroups', 'antilocation'], ['antiDocumentGroups', 'antidocument'], ['antiContactGroups', 'anticontact'],
    ['antiChannelPostGroups', 'antichannelpost'], ['antiPromote', 'antipromote'], ['antiDemote', 'antidemote'],
    ['antiEditGroups', 'antiedit'], ['antiDelete', 'antidelete'], ['antiCall', 'anticall'],
    ['autoReactGroups', 'autoreact'], ['welcomeEnabled', 'welcome'], ['goodbyeEnabled', 'goodbye']
];
const ACTIVE_MODES = new Set(['on', 'warn', 'kick', 'delete', 'del', 'warn-kick', 'warn-all', 'enabled', 'true', '1', 'all']);

function activeGroupMode(mapName, value) {
    if (mapName === 'antiStatusGroups') return ['delete', 'warn'].includes(String(value).toLowerCase());
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    return ACTIVE_MODES.has(String(value || '').trim().toLowerCase());
}

function getGroupStatus(botData, groupId) {
    return GROUP_STATUS_MAPS.flatMap(([mapName, command]) => {
        const value = botData[mapName]?.[groupId];
        if (!activeGroupMode(mapName, value)) return [];
        const mode = typeof value === 'boolean' ? 'on' : String(value).trim().toLowerCase();
        const displayMode = mapName === 'antiStatusLinkGroups' && mode === 'kick' ? 'warn-only (legacy setting)' : mode;
        return [{ command, mode: displayMode }];
    });
}

function getAutoStatusFeatures(botData, settings) {
    const features = [];
    if (settings.autoSeen || botData.autoViewStatusEnabled === true) features.push('Auto Seen');
    if (settings.autoLike || botData.autoReactStatus === 'on') features.push('Auto Like');
    if (settings.autoSaveStatus || botData.autoSaveStatusEnabled === true) features.push('Auto Save');
    // Auto Download and System were not wired to runtime behavior, so they are not reported as active.
    return features;
}

const toBold = (text) => {
    const boldChars = {
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return String(text).split('').map(char => boldChars[char] || char).join('');
};

async function statusCommand(sock, from, msg, isAdmin, botData, saveBotData, userId, args = []) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Only owner/admin can use this command.' }, { quoted: msg });
    if (!botData.statusSettings) botData.statusSettings = {};
    if (!botData.statusSettings[userId]) {
        botData.statusSettings[userId] = {
            autoStatus: false, autoSeen: false, autoLike: false,
            autoDownload: false, autoSaveStatus: false, system: 1, isPublic: false
        };
    }

    const action = String(args[0] || '').toLowerCase();
    if (!action) {
        const settings = botData.statusSettings[userId];
        const autoFeatures = getAutoStatusFeatures(botData, settings);
        const lines = [`╭━━━〔 ${toBold('BOT STATUS')} 〕━━━┈⊷`];

        if (from.endsWith('@g.us')) {
            const groupFeatures = getGroupStatus(botData, from);
            lines.push(`┃ ${toBold('Active group commands:')} ${groupFeatures.length}`);
            if (groupFeatures.length) {
                for (const feature of groupFeatures) lines.push(`┃ • .${feature.command} — ${feature.mode}`);
            } else {
                lines.push('┃ No group protection commands are enabled.');
            }
        }

        lines.push(`┃ ${toBold('Active status features:')} ${autoFeatures.length}`);
        if (autoFeatures.length) {
            for (const feature of autoFeatures) lines.push(`┃ • ${feature}`);
        } else {
            lines.push('┃ No auto-status features are enabled.');
        }
        lines.push('╰━━━━━━━━━━━━━━━━━━┈⊷');
        lines.push('', '*Controls:*', '.status on/off', '.status seen on/off', '.status like on/off', '.autosavestatus all/off');
        return sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg });
    }

    if (action === 'autosavestatus') {
        const value = String(args[1] || '').toLowerCase();
        if (value === 'all') {
            botData.statusSettings[userId].autoSaveStatus = true;
            botData.statusSettings[userId].autoStatus = true;
            saveBotData();
            return sock.sendMessage(from, { text: '✅ *AUTO SAVE STATUS: ON*\nReceived statuses will be saved to your personal inbox.' }, { quoted: msg });
        }
        if (value === 'off') {
            botData.statusSettings[userId].autoSaveStatus = false;
            saveBotData();
            return sock.sendMessage(from, { text: '❌ *Session Auto Save Status: OFF*' }, { quoted: msg });
        }
        return sock.sendMessage(from, { text: 'Usage: .autosavestatus all/off' }, { quoted: msg });
    }

    if (action === 'on') {
        botData.statusSettings[userId].autoStatus = true;
        botData.statusSettings[userId].autoSeen = true;
        botData.statusSettings[userId].autoLike = true;
        botData.statusSettings[userId].autoDownload = false;
        saveBotData();
        return sock.sendMessage(from, { text: '✅ *Auto Seen + Auto Like: ON*' }, { quoted: msg });
    }
    if (action === 'off') {
        botData.statusSettings[userId].autoStatus = false;
        botData.statusSettings[userId].autoSeen = false;
        botData.statusSettings[userId].autoLike = false;
        botData.statusSettings[userId].autoDownload = false;
        botData.statusSettings[userId].autoSaveStatus = false;
        saveBotData();
        return sock.sendMessage(from, { text: '❌ *Session Auto Status features: OFF*' }, { quoted: msg });
    }
    if (action === 'seen' || action === 'like') {
        const value = String(args[1] || '').toLowerCase();
        if (!['on', 'off'].includes(value)) {
            return sock.sendMessage(from, { text: `Usage: .status ${action} on/off` }, { quoted: msg });
        }
        const key = action === 'seen' ? 'autoSeen' : 'autoLike';
        botData.statusSettings[userId][key] = value === 'on';
        if (value === 'on') botData.statusSettings[userId].autoStatus = true;
        saveBotData();
        return sock.sendMessage(from, { text: `✅ *Auto ${action === 'seen' ? 'Seen' : 'Like'}: ${value.toUpperCase()}*` }, { quoted: msg });
    }
    if (action === 'download' || action === 'system') {
        return sock.sendMessage(from, {
            text: action === 'download'
                ? 'ℹ️ Auto Download is not connected to a working runtime feature, so it is not shown as active. Use .autosavestatus all/off for the working save feature.'
                : 'ℹ️ System selection is not connected to a runtime feature and is not reported as active.'
        }, { quoted: msg });
    }

    return sock.sendMessage(from, { text: '❌ Unknown status option. Use .status to view active settings.' }, { quoted: msg });
}

statusCommand.getGroupStatus = getGroupStatus;
statusCommand.getAutoStatusFeatures = getAutoStatusFeatures;
module.exports = statusCommand;
