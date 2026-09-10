const fs = require('fs');

function normalizeNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function resolveSessionId(value, sessions, currentSessionId) {
    const query = String(value || '').trim();
    if (!query) return currentSessionId || null;
    if (sessions[query]) return query;

    const number = normalizeNumber(query);
    if (!number) return null;
    for (const [sessionId, session] of Object.entries(sessions)) {
        const knownNumbers = [session.phoneNumber, session.pairingNumber].map(normalizeNumber).filter(Boolean);
        if (knownNumbers.includes(number)) return sessionId;
    }
    return null;
}

function sessionStatus(session) {
    if (!session) return 'UNKNOWN';
    if (session.isConnected) return 'CONNECTED';
    if (session.isInitializing) return 'CONNECTING';
    if (session.intentionalDisconnect) return 'DISCONNECTED';
    return 'OFFLINE';
}

function sessionNumber(session) {
    return normalizeNumber(session?.phoneNumber || session?.pairingNumber) || 'not paired yet';
}

function sessionUsage(command) {
    return `⚠️ Usage: .${command} <sessionId or WhatsApp number>`;
}

async function send(sock, chatId, msg, text) {
    return sock.sendMessage(chatId, { text }, { quoted: msg });
}

async function sessionsCommand(sock, chatId, msg, _q, context = {}) {
    const sessions = context.sessions || {};
    const entries = Object.entries(sessions).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return send(sock, chatId, msg, 'ℹ️ No WhatsApp sessions found.');

    const lines = entries.map(([sessionId, session], index) => {
        const name = session.sock?.user?.name || context.botData?.userNames?.[sessionId] || 'Unknown';
        return `${index + 1}. ${sessionId}\n   Number: ${sessionNumber(session)}\n   Status: ${sessionStatus(session)}\n   Name: ${name}`;
    });
    return send(sock, chatId, msg,
        `🔗 *MULTISESSION LIST*\n\n${lines.join('\n\n')}\n\nTotal sessions: ${entries.length}\nUse .connect <sessionId or number> to reconnect.`
    );
}

async function connectCommand(sock, chatId, msg, q, context = {}) {
    const sessions = context.sessions || {};
    const targetId = resolveSessionId(q, sessions, context.currentSessionId);
    if (!targetId || !sessions[targetId]) {
        return send(sock, chatId, msg, `${sessionUsage('connect')}\nUse .sessions to view available sessions.`);
    }

    const session = sessions[targetId];
    if (session.isConnected) {
        return send(sock, chatId, msg, `✅ Session is already connected.\nID: ${targetId}\nNumber: ${sessionNumber(session)}`);
    }
    if (session.isInitializing) {
        return send(sock, chatId, msg, `⏳ Session is already connecting.\nID: ${targetId}`);
    }

    try {
        session.intentionalDisconnect = false;
        session.clearReconnectTimer?.();
        await session.initialize();
        return send(sock, chatId, msg, `🔄 Reconnect requested for session.\nID: ${targetId}\nNumber: ${sessionNumber(session)}`);
    } catch (error) {
        return send(sock, chatId, msg, `❌ Could not connect session ${targetId}: ${error.message}`);
    }
}

async function deleteSessionCommand(sock, chatId, msg, q, context = {}) {
    const sessions = context.sessions || {};
    const targetId = resolveSessionId(q, sessions, null);
    if (!String(q || '').trim()) {
        return send(sock, chatId, msg, `${sessionUsage('delsession')}\nThis command requires an explicit target for safety.`);
    }
    if (!targetId || !sessions[targetId]) {
        return send(sock, chatId, msg, `❌ Session not found.\nUse .sessions to view exact session IDs or paired numbers.`);
    }

    const session = sessions[targetId];
    const number = sessionNumber(session);
    const deletingCurrentSession = targetId === context.currentSessionId;
    try {
        if (deletingCurrentSession) {
            await send(sock, chatId, msg, `🗑️ Deleting current session ${targetId} (${number}) and its auth data...`);
        }
        session.intentionalDisconnect = true;
        session.clearReconnectTimer?.();
        session.stopPresenceKeepAlive?.();
        if (session.sock?.logout) {
            await session.sock.logout().catch(() => {});
        }
        session.isConnected = false;
        if (session.authPath) await fs.promises.rm(session.authPath, { recursive: true, force: true });

        delete sessions[targetId];
        if (context.userSockets) {
            delete context.userSockets[targetId];
            if (session.dashboardUserId) delete context.userSockets[session.dashboardUserId];
        }
        if (Array.isArray(context.settings?.connectedBots)) {
            context.settings.connectedBots = context.settings.connectedBots.filter(item => normalizeNumber(item) !== number);
        }
        if (context.botData?.statusSettings) delete context.botData.statusSettings[targetId];
        if (context.botData?.userNames) delete context.botData.userNames[targetId];
        context.saveBotData?.();

        if (deletingCurrentSession) return true;
        return send(sock, chatId, msg, `✅ Session deleted successfully.\nID: ${targetId}\nNumber: ${number}\nAuth data removed; it will not auto-reconnect.`);
    } catch (error) {
        session.intentionalDisconnect = true;
        return send(sock, chatId, msg, `❌ Could not fully delete session ${targetId}: ${error.message}`);
    }
}

module.exports = {
    sessions: sessionsCommand,
    connect: connectCommand,
    delsession: deleteSessionCommand,
    resolveSessionId
};
