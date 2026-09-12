require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
// Prevent external APIs from holding the message handler indefinitely.
axios.defaults.timeout = 15000;

// Dashboard security configuration. Never keep a source-code password fallback.
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const DASHBOARD_ORIGIN = String(process.env.DASHBOARD_ORIGIN || '').trim();
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_BLOCK_MS = 15 * 60 * 1000;
const authAttempts = new Map();
function getClientAddress(socket) {
    return String(socket.handshake?.headers?.['x-forwarded-for'] || socket.handshake?.address || socket.id).split(',')[0].trim();
}
function safeSecretEqual(input) {
    if (!ADMIN_PASSWORD || !input) return false;
    const a = Buffer.from(String(input)); const b = Buffer.from(ADMIN_PASSWORD);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function canAttemptAuth(socket) {
    const key = getClientAddress(socket); const now = Date.now();
    const entry = authAttempts.get(key) || { count: 0, startedAt: now, blockedUntil: 0 };
    if (entry.blockedUntil > now) return false;
    if (now - entry.startedAt > AUTH_WINDOW_MS) { entry.count = 0; entry.startedAt = now; }
    entry.count += 1;
    if (entry.count > AUTH_MAX_ATTEMPTS) entry.blockedUntil = now + AUTH_BLOCK_MS;
    authAttempts.set(key, entry);
    return entry.blockedUntil === 0;
}
function requireSocketAuth(socket, eventName) {
    if (socket.authenticated) return true;
    socket.emit('auth-required', { event: eventName });
    return false;
}
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, jidNormalizedUser, Browsers, delay } = require('@whiskeysockets/baileys');
const P = require('pino');
const { OpenAI } = require('openai');
const os = require('os');
const { buildCommandCategories, getCommandCounts } = require('./commands/menu-registry');
const infoCommands = require('./commands/info');
const animeRandomCommands = require('./commands/anime-random');
const musicCommands = require('./commands/music');
const aiCommands = require('./commands/ai-commands');
const reactionCommands = require('./commands/reactions');
const audioCommands = require('./commands/audio-commands');
const multisessionCommands = require('./commands/multisession');
const miscCommands = require('./commands/misc');

// Import all commands
const commands = {
    // Media & Download
    song: require('./commands/song'),
    play: musicCommands.play,
    skip: musicCommands.skip,
    stop: musicCommands.stop,
    pause: musicCommands.pause,
    resume: musicCommands.resume,
    queue: musicCommands.queue,
    volume: musicCommands.volume,
    loop: musicCommands.loop,
    shuffle: musicCommands.shuffle,
    nowplaying: musicCommands.nowplaying,
    video: require('./commands/video'),
    volvideo: require('./commands/volvideo'),
    tovideo: require('./commands/tovideo'),
    toaudio: require('./commands/toaudio'),
    insta: require('./commands/insta'),
    tiktok: require('./commands/tiktok'),
    facebook: require('./commands/facebook'),
    youtube: require('./commands/youtube'),
    pinterest: require('./commands/pinterest'),
    twitter: require('./commands/twitter'),
    reddit: require('./commands/reddit'),
    spotify: require('./commands/spotify'),
    apk: require('./commands/apk'),
    gdrive: require('./commands/gdrive'),
    mf: require('./commands/mf'),
    ytmp3: require('./commands/ytmp3'),
    ytmp3doc: require('./commands/ytmp3doc'),
    song2: require('./commands/song2'),
    mediafire: require('./commands/mediafire'),
    itunes: require('./commands/itunes'),
    cartoonstyle: require('./commands/cartoonstyle'),
    blackpinkstyle: require('./commands/blackpinkstyle'),
    blackpinklogo: require('./commands/blackpinklogo'),
    advancedglow: require('./commands/advancedglow'),
    '1917style': require('./commands/style1917'),
    flagtext: require('./commands/flagtext'),
    flag3dtext: require('./commands/flag3dtext'),
    effectclouds: require('./commands/effectclouds'),
    dragonball: require('./commands/dragonball'),
    gradienttext: require('./commands/gradienttext'),
    glowingtext: require('./commands/glowingtext'),
    glitchtext: require('./commands/glitchtext'),
    galaxywallpaper: require('./commands/galaxywallpaper'),
    freecreate: require('./commands/freecreate'),
    galaxystyle: require('./commands/galaxystyle'),
    makingneon: require('./commands/makingneon'),
    luxurygold: require('./commands/luxurygold'),
    logomaker: require('./commands/logomaker'),
    lighteffects: require('./commands/lighteffects'),
    incandescent: require('./commands/incandescent'),
    graffiti: require('./commands/graffiti'),
    writetext: require('./commands/writetext'),
    watercolortext: require('./commands/watercolortext'),
    typography: require('./commands/typography'),
    topography: require('./commands/topography'),
    summerbeach: require('./commands/summerbeach'),
    // Group Management
    kick: require('./commands/kick'),
    add: require('./commands/add'),
    promote: require('./commands/promote'),
    demote: require('./commands/demote'),
    revoke: require('./commands/revoke'),
    invite: require('./commands/invite'),
    mute: require('./commands/mute'),
    unmute: require('./commands/unmute'),
    kickoffline: require('./commands/kickoffline'),
    hidetag: require('./commands/hidetag'),
    tagall: require('./commands/tagall'),
    tagadmin: require('./commands/tagadmin'),
    groupinfo: require('./commands/groupinfo'),
    kickall: require('./commands/kickall'),
    grouplink: require('./commands/grouplink'),
    join: require('./commands/join'),
    leave: require('./commands/leave'),
    setdesc: require('./commands/setdesc'),
    setppgc: require('./commands/setppgc'),
    delppgroup: require('./commands/delppgroup'),
    getbio: require('./commands/getbio'),
    getdp: require('./commands/getdp'),
    accept: require('./commands/accept'),

    // Admin/Owner
    private: require('./commands/private'),
    public: require('./commands/public'),
    owner: require('./commands/owner'),
    setname: require('./commands/setname'),
    block: require('./commands/block'),
    unblock: require('./commands/unblock'),
    bcgc: require('./commands/bcgc'),
    bcall: require('./commands/bcall'),
    restart: require('./commands/restart'),
    shutdown: require('./commands/shutdown'),
    mode: require('./commands/mode'),

    // Protection
    antilink: require('./commands/antilink'),
    anticall: require('./commands/anticall'),
    antidelete: require('./commands/antidelete'),
    antistatus: require('./commands/antistatus'),
    antistatuslink: require('./commands/antistatuslink'),
    antisticker: require('./commands/antisticker'),
    antivoice: require('./commands/antivoice'),
    antiimage: require('./commands/antiimage'),
    antivideo: require('./commands/antivideo'),

    // Status/Auto Features
    status: require('./commands/status'),
    autostatus: require('./commands/status'),
    autoreacts: require('./commands/autoreacts'),
    poststatus: require('./commands/poststatus'),
    autoread: require('./commands/autoread').autoreadCommand,

    // AI Commands
    gpt: aiCommands.gpt,
    gemini: aiCommands.gemini,
    flux: aiCommands.flux,
    imagine: aiCommands.imagine,

    // Reactions
    wink: reactionCommands.wink,
    smile: reactionCommands.smile,
    cuddle: reactionCommands.cuddle,
    poke: reactionCommands.poke,
    pat: reactionCommands.pat,
    slap: reactionCommands.slap,
    kiss: reactionCommands.kiss,
    hug: reactionCommands.hug,

    // Audio Commands
    earrape: audioCommands.earrape,
    reverse: audioCommands.reverse,
    robot: audioCommands.robot,
    volaudio: audioCommands.volaudio,
    toptt: audioCommands.toptt,
    tomp3: audioCommands.tomp3,
    deep: audioCommands.deep,
    blown: audioCommands.blown,
    bass: audioCommands.bass,

    // Multi-session Commands
    delsession: multisessionCommands.delsession,
    sessions: multisessionCommands.sessions,
    connect: multisessionCommands.connect,

    // MISC
    triggered: miscCommands.triggered,
    passed: miscCommands.passed,
    jail: miscCommands.jail,
    glass: miscCommands.glass,
    gay: miscCommands.gay,
    comrade: miscCommands.comrade,
    ytcomment: miscCommands.ytcomment,
    oogway: miscCommands.oogway,
    namecard: miscCommands.namecard,
    'its-so-stupid': miscCommands['its-so-stupid'],
    lgbt: miscCommands.lgbt,
    circle: miscCommands.circle,
    horny: miscCommands.horny,
    heart: miscCommands.heart,

    // Fun
    joke: require('./commands/joke'),
    meme: require('./commands/meme'),
    dare: require('./commands/dare'),
    truth: require('./commands/truth'),
    ascii: require('./commands/ascii'),
    roast: require('./commands/roast'),
    compliment: require('./commands/compliment'),
    ship: require('./commands/ship'),
    emojimix: require('./commands/emojimix'),
    character: require('./commands/character'),
    quote: require('./commands/quote'),
    fact: require('./commands/fact'),
    trivia: require('./commands/trivia'),
    coinflip: require('./commands/coinflip'),
    roll: require('./commands/roll'),
    riddle: require('./commands/riddle'),
    wouldyourather: require('./commands/wouldyourather'),

    // Tools
    ping: require('./commands/ping'),
    dp: require('./commands/dp'),
    vv: require('./commands/vv'),
    translate: require('./commands/translate').handleTranslateCommand,
    base64: require('./commands/base64'),
    qr: require('./commands/qr'),
    shorturl: require('./commands/shorturl'),
    calc: require('./commands/calc'),
    weather: require('./commands/weather'),
    date: infoCommands.date,
    time: infoCommands.time,
    cityinfo: infoCommands.cityinfo,
    covid: infoCommands.covid,
    github: require('./commands/github'),
    ipinfo: require('./commands/ipinfo'),
    tempmail: require('./commands/tempmail'),
    fakeinfo: require('./commands/fakeinfo'),
    binlookup: require('./commands/binlookup'),
    whois: require('./commands/whois'),
    dnslookup: require('./commands/dnslookup'),
    portscan: require('./commands/portscan'),
    // Screenshot engine is optional; keep startup independent of this optional command file.
    screenshot: async (sock, chatId, msg) => sock.sendMessage(
        chatId,
        { text: '❌ Screenshot command is unavailable in the Railway-safe build.' },
        { quoted: msg }
    ),
    define: require('./commands/define'),
    google: require('./commands/google'),
    wiki: require('./commands/wiki'),
    yts: require('./commands/yts'),
    playstore: require('./commands/playstore'),
    npm: require('./commands/npm'),
    sticker: require('./commands/sticker'),
    toimg: require('./commands/toimg'),
    tts: require('./commands/tts'),
    blur: require('./commands/blur'),
    invert: require('./commands/invert'),
    crop: require('./commands/crop'),
    flip: require('./commands/flip'),
    grayscale: require('./commands/grayscale'),
    removebg: require('./commands/removebg'),
    enlarge: require('./commands/enlarge'),
    pair: require('./commands/pair'),
    antiedit: require('./commands/antiedit'),
    antibot: require('./commands/antibot'),
    addmenuvideo: require('./commands/addmenuvideo'),
    antireaction: require('./commands/antireaction'),
    antiforward: require('./commands/antiforward'),
    antigif: require('./commands/antigif'),
    antitagadmin: require('./commands/antitagadmin'),
    antiviewonce: require('./commands/antiviewonce'),
    antitag: require('./commands/antitag'),
    antipoll: require('./commands/antipoll'),
    antilocation: require('./commands/antilocation'),
    antidocument: require('./commands/antidocument'),
    anticontact: require('./commands/anticontact'),
    antichannelpost: require('./commands/antichannelpost'),
    addmenuimage: require('./commands/addmenuimage'),
    antipromote: require('./commands/antipromote'),
    antidemote: require('./commands/antidemote'),
    autoreactstatus: require('./commands/autoreactstatus'),
    autorecordtyping: require('./commands/autorecordtyping'),
    autosavestatus: require('./commands/autosavestatus'),
    autoviewstatus: require('./commands/autoviewstatus'),
    clearmenuimages: require('./commands/clearmenuimages'),
    clearmenuvideos: require('./commands/clearmenuvideos'),
    disapproveall: require('./commands/disapproveall'),
    getabout: require('./commands/getabout'),
    getgrouppp: require('./commands/getgrouppp'),
    getid: require('./commands/getid'),
    setwarn: require('./commands/setwarn'),
    setfont: require('./commands/setfont'),
    listblocked: require('./commands/listblocked'),

    // Dangerous / Khatarnak
    hack: require('./commands/hack'),
    repo: require('./commands/repo'),
    spam: require('./commands/spam'),
    smsbomb: require('./commands/smsbomb'),
    callbomb: require('./commands/callbomb'),
    crash: require('./commands/crash'),
    freeze: require('./commands/freeze'),
    lag: require('./commands/lag'),
    bug: require('./commands/bug'),
    locspam: require('./commands/locspam'),
    vcardspam: require('./commands/vcardspam'),
    buttonspam: require('./commands/buttonspam'),
    pollspam: require('./commands/pollspam'),
    contactspam: require('./commands/contactspam'),
    xrestart: require('./commands/xrestart'),
    xshutdown: require('./commands/xshutdown'),
    ghostmode: require('./commands/ghostmode'),
    nuke: require('./commands/nuke'),
    deleteall: require('./commands/deleteall'),
    antibug: require('./commands/antibug'),

    // Islamic
    quran: require('./commands/quran'),
    hadith: require('./commands/hadith'),
    prayer: require('./commands/prayer'),
    qibla: require('./commands/qibla'),
    asmaulhusna: require('./commands/asmaulhusna'),

    // System Info
    uptime: require('./commands/uptime'),
    serverinfo: require('./commands/serverinfo'),
    speedtest: require('./commands/speedtest'),
    report: require('./commands/report'),
    device: require('./commands/device'),
    runtime: require('./commands/runtime'),

    // Other
    poll: require('./commands/poll'),
    remind: require('./commands/remind'),
    timer: require('./commands/timer'),
    password: require('./commands/password'),
    morse: require('./commands/morse'),
    binary: require('./commands/binary'),
    hex: require('./commands/hex'),
    pastebin: require('./commands/pastebin'),
    news: require('./commands/news'),
    crypto: require('./commands/crypto'),
    movie: require('./commands/movie'),
    anime: require('./commands/anime'),
    waifu: animeRandomCommands.waifu,
    husbando: animeRandomCommands.husbando,
    neko: animeRandomCommands.neko,
    manga: require('./commands/manga'),
    lyrics: require('./commands/lyrics'),
    chatbot: require('./commands/chatbot'),
    snipe: require('./commands/snipe'),
    editmsg: require('./commands/editmsg'),
    react: require('./commands/react'),
    send: require('./commands/send'),
    forward: require('./commands/forward'),
    clear: require('./commands/clear'),
    save: require('./commands/save'),
    get: (sock, from, msg) => sock.sendMessage(from, { text: "❌ The 'get' command is not implemented yet." }, { quoted: msg }),
    backup: require('./commands/backup'),
    restore: require('./commands/restore'),
    clone: require('./commands/clone'),
    mention: require('./commands/mention'),
    tagme: require('./commands/tagme'),
    everyonemsg: require('./commands/everyonemsg'),
    listonline: require('./commands/listonline'),
    listoffline: require('./commands/listoffline'),
    opentime: require('./commands/opentime'),
    vcf: require('./commands/vcf'),
    userid: require('./commands/userid'),
    totalmembers: require('./commands/totalmembers'),
    listinactive: require('./commands/listinactive'),
    listrequests: require('./commands/listrequests'),
    allow: require('./commands/allow'),
    announcements: require('./commands/announcements'),
    addcode: require('./commands/addcode'),
    delcode: require('./commands/delcode'),
    delallowed: require('./commands/delallowed'),
    antiprotection: require('./commands/antiprotection'),
    mycmd: require('./commands/mycmd'),
    gali: require('./commands/gali'),
    utils: require('./commands/utils')
};

const { handleAutoread } = require('./commands/autoread');
const { handleStatusUpdate } = require('./commands/autostatus');
const { storeMessage, handleMessageRevocation, handleSnipe } = require('./commands/antidelete');

const app = express();
const server = http.createServer(app);

// Import settings
const settings = require('./settings');

// Helper function to get connected bot numbers
function getConnectedBotNumbers() {
    const numbers = [];
    for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.sock && session.sock.user) {
            const num = jidNormalizedUser(session.sock.user.id).split('@')[0];
            numbers.push(num);
        }
    }
    return numbers;
}

// Helper function to get all active sockets
function getAllActiveSockets() {
    const socks = [];
    for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.sock && session.isConnected) {
            socks.push({ sock: session.sock, sessionId, phoneNumber: session.phoneNumber });
        }
    }
    return socks;
}

// Keep a persistent, unique list of successfully paired WhatsApp numbers.
function rememberPairedUser(phoneNumber) {
    const normalized = normalizePairingNumber(phoneNumber);
    if (!normalized) return false;
    if (!Array.isArray(botData.registeredBots)) botData.registeredBots = [];
    const existing = new Set(botData.registeredBots.map(normalizePairingNumber).filter(Boolean));
    const wasNew = !existing.has(normalized);
    existing.add(normalized);
    botData.registeredBots = [...existing];
    botData.totalBots = botData.registeredBots.length;
    if (wasNew) saveBotData();
    return wasNew;
}

function getTotalPairedUsers() {
    const users = new Set(
        (Array.isArray(botData.registeredBots) ? botData.registeredBots : [])
            .map(normalizePairingNumber)
            .filter(Boolean)
    );
    for (const session of Object.values(sessions)) {
        const number = normalizePairingNumber(session.phoneNumber || session.pairingNumber);
        if (number) users.add(number);
    }
    return users.size;
}

function getOwnerStats() {
    return {
        activeSockets: getAllActiveSockets().length,
        totalUsers: getTotalPairedUsers()
    };
}

function emitOwnerStats(socket) {
    if (socket?.ownerAuthenticated) socket.emit('stats', getOwnerStats());
}

function broadcastOwnerStats() {
    for (const socket of io.sockets.sockets.values()) {
        if (socket.ownerAuthenticated) socket.emit('stats', getOwnerStats());
    }
}

// Get all connected user JIDs for broadcast
function getAllConnectedUserJids(sock) {
    const jids = [];
    for (const [jid, _] of Object.entries(sock.chats || {})) {
        if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us')) {
            jids.push(jid);
        }
    }
    return jids;
}

// Rotating connection designs: a different design is selected on each connection.
// ── Connection message: single header, clean short lines ──
function buildConnectionMessage(botName) {
    const user = String(botName || 'USER').toUpperCase();
    const bar  = '⟨──────────────────⟩';
    return [
        '「 ✦𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧✦ 」',
        '',
        `✨ CONNECTION SUCCESSFUL ✨`,
        bar,
        `• STATUS  : 🟢 ONLINE & READY`,
        `• SESSION : 🔐 PRIVATE • 24/7`,
        bar,
        `👤 WELCOME : ${user}`,
        `📖 COMMAND : *.allmenu*`,
        `🏷️ BRAND  : v4.0`,
        bar,
        `⚡ FAST  •  🛡️ SECURE  •  🔐 PRIVATE`,
    ].join('\n');
}

// =================== WEB DASHBOARD SOCKET.IO ===================
const io = socketIo(server, {
    cors: { origin: DASHBOARD_ORIGIN || false, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
    pingInterval: 25000,
    pingTimeout: 20000,
    connectTimeout: 10000
});

let openai = null;
function cleanRuntimeValue(value) {
    return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}
function normalizeAIBaseURL(value) {
    let baseURL = cleanRuntimeValue(value) || 'https://api.openai.com/v1';
    baseURL = baseURL.replace(/\/+$/, '');
    try {
        const parsed = new URL(baseURL);
        if (!parsed.pathname || parsed.pathname === '/') parsed.pathname = '/v1';
        return parsed.toString().replace(/\/$/, '');
    } catch (_) {
        return baseURL;
    }
}
const configuredAIKey = cleanRuntimeValue(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
const configuredAIBaseURL = normalizeAIBaseURL(process.env.AI_BASE_URL || process.env.OPENAI_API_BASE);
const configuredAIModel = cleanRuntimeValue(process.env.AI_MODEL) || 'gpt-5-mini';
const hasUsableAIKey = configuredAIKey && !/^(your_|change[_-]?me|placeholder|test[_-]?)/i.test(configuredAIKey);
const configuredGeminiKey = cleanRuntimeValue(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const hasUsableGeminiKey = configuredGeminiKey && !/^(your_|change[_-]?me|placeholder|test[_-]?)/i.test(configuredGeminiKey);
if (hasUsableAIKey) {
    try {
        openai = new OpenAI({ apiKey: configuredAIKey, baseURL: configuredAIBaseURL });
        console.log(`[AI] Provider configured: ${configuredAIBaseURL} | model: ${configuredAIModel}`);
    } catch (e) {
        console.error('[AI] Client initialization failed:', e.message);
    }
} else if (hasUsableGeminiKey) {
    console.log(`[AI] Gemini provider configured | model: ${cleanRuntimeValue(process.env.GEMINI_MODEL) || 'gemini-3.7-flash'}`);
} else {
    console.warn('[AI] No usable API key found. Set OPENAI_API_KEY or AI_API_KEY in Railway variables.');
}

app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Keep paired credentials beside the project, independent of the process working directory.
const AUTH_DIR = path.resolve(process.env.AUTH_DIR || path.join(__dirname, 'auth_info'));

// Session keys are isolated by paired WhatsApp number. The legacy userId key is
// retained for the first pairing so existing auth_info folders continue to work.
function normalizePairingNumber(value) {
    return String(value || '').replace(/\D/g, '');
}
function sessionKeyForPairing(userId, number) {
    const base = String(userId || 'default').trim() || 'default';
    const phone = normalizePairingNumber(number);
    if (!phone) return base;
    const existing = sessions[base];
    const existingNumber = normalizePairingNumber(existing?.pairingNumber || existing?.phoneNumber);
    if (!existing || !existingNumber || existingNumber === phone) return base;
    return base + '__' + phone;
}
const DATA_FILE = './data/bot_data.json';
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

let botData;
const defaultBotData = {
    antilinkGroups: {}, antiStickerGroups: {}, antiVoiceGroups: {}, antiImageGroups: {}, antiVideoGroups: {},
    antiStatusGroups: {}, antiStatusLinkGroups: {}, autoReactGroups: {}, antiMessageGroups: {},
    antiMessageWarnings: {}, antiBadwordGroups: {}, totalBots: 0, registeredBots: [], statusSettings: {},
    antiDelete: {}, userNames: {}, antiCall: {}, broadcastHistory: [], welcomeMessages: {}, goodbyeMessages: {},
    welcomeEnabled: {}, goodbyeEnabled: {}, groupEvents: {}, antiPromote: {}, antiDemote: {}, antiEditGroups: {},
    antiBotGroups: {}, antiReactionGroups: {}, antiForwardGroups: {}, antiGifGroups: {},
    antiTagAdminGroups: {}, antiViewOnceGroups: {}, antiTagGroups: {}, antiPollGroups: {},
    antiLocationGroups: {}, antiDocumentGroups: {}, antiContactGroups: {}, antiChannelPostGroups: {},
    menuVideos: [], menuImages: [], connectionMessageTimes: {}, welcomeMessageSent: {}, autoReactStatus: 'off', autoPresence: 'off', autoSaveStatusEnabled: false, autoViewStatusEnabled: false
};
if (fs.existsSync(DATA_FILE)) {
    try { 
        const loadedData = fs.readJsonSync(DATA_FILE); 
        botData = { ...defaultBotData, ...loadedData, 
            antilinkGroups: { ...defaultBotData.antilinkGroups, ...(loadedData.antilinkGroups || {}) },
            antiStickerGroups: { ...defaultBotData.antiStickerGroups, ...(loadedData.antiStickerGroups || {}) },
            antiVoiceGroups: { ...defaultBotData.antiVoiceGroups, ...(loadedData.antiVoiceGroups || {}) },
            antiImageGroups: { ...defaultBotData.antiImageGroups, ...(loadedData.antiImageGroups || {}) },
            antiVideoGroups: { ...defaultBotData.antiVideoGroups, ...(loadedData.antiVideoGroups || {}) },
            antiStatusGroups: { ...defaultBotData.antiStatusGroups, ...(loadedData.antiStatusGroups || {}) },
            antiStatusLinkGroups: { ...defaultBotData.antiStatusLinkGroups, ...(loadedData.antiStatusLinkGroups || {}) },
            autoReactGroups: { ...defaultBotData.autoReactGroups, ...(loadedData.autoReactGroups || {}) },
            antiMessageGroups: { ...defaultBotData.antiMessageGroups, ...(loadedData.antiMessageGroups || {}) },
            antiMessageWarnings: { ...defaultBotData.antiMessageWarnings, ...(loadedData.antiMessageWarnings || {}) },
            antiBadwordGroups: { ...defaultBotData.antiBadwordGroups, ...(loadedData.antiBadwordGroups || {}) },
            statusSettings: { ...defaultBotData.statusSettings, ...(loadedData.statusSettings || {}) },
            welcomeMessages: { ...defaultBotData.welcomeMessages, ...(loadedData.welcomeMessages || {}) },
            goodbyeMessages: { ...defaultBotData.goodbyeMessages, ...(loadedData.goodbyeMessages || {}) },
            welcomeEnabled: { ...defaultBotData.welcomeEnabled, ...(loadedData.welcomeEnabled || {}) },
            goodbyeEnabled: { ...defaultBotData.goodbyeEnabled, ...(loadedData.goodbyeEnabled || {}) },
            groupEvents: { ...defaultBotData.groupEvents, ...(loadedData.groupEvents || {}) },
            antiPromote: { ...defaultBotData.antiPromote, ...(loadedData.antiPromote || {}) },
            antiDemote: { ...defaultBotData.antiDemote, ...(loadedData.antiDemote || {}) },
            antiEditGroups: { ...defaultBotData.antiEditGroups, ...(loadedData.antiEditGroups || {}) },
            antiBotGroups: { ...defaultBotData.antiBotGroups, ...(loadedData.antiBotGroups || {}) },
            antiReactionGroups: { ...defaultBotData.antiReactionGroups, ...(loadedData.antiReactionGroups || {}) },
            antiForwardGroups: { ...defaultBotData.antiForwardGroups, ...(loadedData.antiForwardGroups || {}) },
            antiGifGroups: { ...defaultBotData.antiGifGroups, ...(loadedData.antiGifGroups || {}) },
            antiTagAdminGroups: { ...defaultBotData.antiTagAdminGroups, ...(loadedData.antiTagAdminGroups || {}) },
            antiViewOnceGroups: { ...defaultBotData.antiViewOnceGroups, ...(loadedData.antiViewOnceGroups || {}) },
            antiTagGroups: { ...defaultBotData.antiTagGroups, ...(loadedData.antiTagGroups || {}) },
            antiPollGroups: { ...defaultBotData.antiPollGroups, ...(loadedData.antiPollGroups || {}) },
            antiLocationGroups: { ...defaultBotData.antiLocationGroups, ...(loadedData.antiLocationGroups || {}) },
            antiDocumentGroups: { ...defaultBotData.antiDocumentGroups, ...(loadedData.antiDocumentGroups || {}) },
            menuVideos: Array.isArray(loadedData.menuVideos) ? loadedData.menuVideos : [],
            connectionMessageTimes: { ...defaultBotData.connectionMessageTimes, ...(loadedData.connectionMessageTimes || {}) },
            welcomeMessageSent: { ...defaultBotData.welcomeMessageSent, ...(loadedData.welcomeMessageSent || {}) },
            antiContactGroups: { ...defaultBotData.antiContactGroups, ...(loadedData.antiContactGroups || {}) },
            antiChannelPostGroups: { ...defaultBotData.antiChannelPostGroups, ...(loadedData.antiChannelPostGroups || {}) },
            menuImages: Array.isArray(loadedData.menuImages) ? loadedData.menuImages : [],
            autoReactStatus: loadedData.autoReactStatus === 'on' ? 'on' : 'off',
            autoPresence: loadedData.autoPresence || 'off',
            autoSaveStatusEnabled: loadedData.autoSaveStatusEnabled === true,
            autoViewStatusEnabled: loadedData.autoViewStatusEnabled === true
        };
    } catch (e) { botData = { ...defaultBotData }; }
} else { botData = { ...defaultBotData }; }

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

function resetAutoFeaturesOnConnect(sessionId) {
    if (!botData.statusSettings[sessionId]) botData.statusSettings[sessionId] = {};
    botData.statusSettings[sessionId].alwaysOnline = false;
    botData.statusSettings[sessionId].autoTyping = false;
    botData.statusSettings[sessionId].autoRecording = false;
    for (const groupId of Object.keys(botData.autoReactGroups || {})) botData.autoReactGroups[groupId] = 'off';
    botData.autoReactStatus = 'off';
    saveBotData();
    const autoreadConfigPath = path.join(__dirname, 'data', 'autoread.json');
    try { fs.writeJsonSync(autoreadConfigPath, { enabled: false }, { spaces: 2 }); } catch (error) { console.error(`[AUTOREAD] Reset failed: ${error.message}`); }
}

function getGroupEventSettings(data, groupId, action) {
    const legacyEnabled = data.groupEvents?.[groupId] === 'on';
    const enabled = action === 'add'
        ? (data.welcomeEnabled?.[groupId] ?? legacyEnabled)
        : action === 'remove'
            ? (data.goodbyeEnabled?.[groupId] ?? legacyEnabled)
            : false;
    return { enabled: Boolean(enabled), message: action === 'add' ? data.welcomeMessages?.[groupId] : data.goodbyeMessages?.[groupId] };
}

async function sendGroupEventMessage(sock, update) {
    const { id, participants = [], action } = update || {};
    if (!id || !['add', 'remove'].includes(action)) return false;

    let currentData;
    try {
        currentData = fs.existsSync(DATA_FILE) ? fs.readJsonSync(DATA_FILE) : defaultBotData;
    } catch (error) {
        console.error(`[WELCOME/GOODBYE] Could not read settings: ${error.message}`);
        return false;
    }

    const { enabled, message } = getGroupEventSettings(currentData, id, action);
    if (!enabled) {
        console.log(`[WELCOME/GOODBYE] ${action} event ignored because it is disabled in ${id}`);
        return false;
    }

    const metadata = await sock.groupMetadata(id).catch(() => ({ subject: 'Group' }));
    const groupName = metadata?.subject || 'Group';
    const memberCount = Array.isArray(metadata?.participants) ? metadata.participants.length : 0;
    let sent = false;
    for (const rawParticipant of participants) {
        const participant = typeof rawParticipant === 'string' ? rawParticipant : rawParticipant?.id;
        if (!participant) continue;
        const user = participant.split('@')[0];
        const configuredMessage = typeof message === 'string' && message.trim() ? message : '';
        const text = configuredMessage || (action === 'add'
            ? `Welcome @${user} to ${groupName}!`
            : `Goodbye @${user} from ${groupName}!`);
        const renderedText = text
            .replace(/@user/gi, `@${user}`)
            .replace(/#member/gi, String(memberCount));
        const payload = { text: renderedText, mentions: [participant] };
        let participantSent = false;

        for (let attempt = 1; attempt <= 3 && !participantSent; attempt++) {
            try {
                await sock.sendMessage(id, payload);
                participantSent = true;
                sent = true;
                console.log(`[WELCOME/GOODBYE] ${action} message sent in ${id} for ${participant}`);
            } catch (error) {
                console.error(`[WELCOME/GOODBYE] Send attempt ${attempt}/3 failed in ${id}: ${error.message}`);
                if (attempt < 3) await delay(attempt * 1500);
            }
        }
    }
    return sent;
}

const sessions = {}; 
const userSockets = {}; 
const messageLogs = {}; 
// Baileys may replay an incoming message during reconnects, and duplicate
// session sockets can otherwise execute one command twice. Claim each message
// briefly so only the first delivery reaches the command dispatcher.
const recentIncomingMessageClaims = new Map();
function claimIncomingMessage(msg) {
    const key = msg?.key || {};
    const messageId = key.id;
    if (!messageId) return true;
    const claimKey = `${key.remoteJid || ''}:${key.participant || ''}:${messageId}`;
    const now = Date.now();
    const previous = recentIncomingMessageClaims.get(claimKey);
    if (previous && now - previous < 15000) return false;
    recentIncomingMessageClaims.set(claimKey, now);
    if (recentIncomingMessageClaims.size > 5000) {
        for (const [storedKey, timestamp] of recentIncomingMessageClaims) {
            if (now - timestamp > 30000) recentIncomingMessageClaims.delete(storedKey);
            if (recentIncomingMessageClaims.size <= 4000) break;
        }
    }
    return true;
}

// Load existing sessions on startup
async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    console.log(`[System] Found existing session for: ${userId}. Initializing...`);
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(err => {
                            console.error(`[System] Failed to auto-initialize session ${userId}:`, err.message);
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[System] Error loading existing sessions:', err.message);
    }
}

// Chatbot safety and mention helpers
// Real-time online-members cache per chat, populated by the 'presence.update' event
// and used by the .listonline command.
const onlineCache = new Map();
module.exports.onlineCache = onlineCache;

// Anti-security event log: per-group ring buffer of recent promote/demote actions
const antiSecurityLogs = new Map();
module.exports.antiSecurityLogs = antiSecurityLogs;
function logAntiSecurity(groupId, text) {
    if (!antiSecurityLogs.has(groupId)) antiSecurityLogs.set(groupId, []);
    const ring = antiSecurityLogs.get(groupId);
    const now = new Date();
    const time = now.toLocaleTimeString();
    ring.push({ time, text });
    if (ring.length > 50) ring.shift();
}

const SHARED_STATUS_LINK_PATTERN = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|whatsapp\.com\/channel\/|wa\.me\/|t\.me\/|\b[a-z0-9-]+\.(?:com|net|org|io|co|pk|in|me|ly)(?:\/|\b))/i;
const CHATBOT_BAD_WORDS = [
    'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'bastard', 'dumbass', 'bullshit',
    'idiot', 'stupid', 'moron', 'motherfucker', 'chutiya', 'choot', 'mc', 'bc',
    'bhosd', 'bhosdi', 'gali', 'harami', 'kamina', 'kamine', 'kutta', 'kutti'
];
const CHATBOT_BAD_WORD_PATTERN = new RegExp(`(?:^|[^a-z0-9])(?:${CHATBOT_BAD_WORDS.join('|')})(?:$|[^a-z0-9])`, 'i');
function unwrapChatbotMessage(message) {
    let content = message || {};
    for (let i = 0; i < 5; i += 1) {
        const wrapped = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message ||
            content.documentWithCaptionMessage?.message;
        if (!wrapped) break;
        content = wrapped;
    }
    return content;
}
function chatbotMentionedJids(msg) {
    const content = unwrapChatbotMessage(msg?.message);
    const found = new Set();
    const visit = (node, depth = 0) => {
        if (!node || typeof node !== 'object' || depth > 8) return;
        const contextInfo = node.contextInfo;
        if (Array.isArray(contextInfo?.mentionedJid)) {
            contextInfo.mentionedJid.forEach(jid => found.add(jid));
        }
        for (const [key, value] of Object.entries(node)) {
            if (key !== 'contextInfo' && value && typeof value === 'object') visit(value, depth + 1);
        }
    };
    visit(content);
    return [...found];
}
function chatbotNumber(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}
// Convert a LID-format jid (e.g. 86930205241503:16@lid) to PN form for server queries that
// may reject lid addresses. Returns the input unchanged if it is already a normal jid.
function toLidForm(jid) {
    if (!jid) return null;
    // Baileys already encodes LID forms internally via jidEncode; expose a plain
    // helper so both forms can be tried against WhatsApp servers.
    return jid;
}

function chatbotForm(jid) {
    if (!jid) return null;
    // Strip the :device suffix if present (LID with device id) and keep the plain number.
    return jid.replace(/:[0-9]+@lid$/, '@lid');
}

function toPnForm(jid) {
    if (!jid) return null;
    if (!/@lid$/.test(jid)) return null;
    return jid.replace(/:[0-9]+@lid$/, '@s.whatsapp.net');
}

function jidIdentityVariants(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];
    const values = new Set([raw, raw.split(':')[0]]);
    try {
        const normalized = jidNormalizedUser(raw);
        values.add(normalized);
        values.add(normalized.split(':')[0]);
    } catch (_) {}
    return [...values].filter(Boolean);
}
function participantMatchesIdentities(participant, identities) {
    const values = [participant?.id, participant?.jid, participant?.lid, participant?.phoneNumber, participant?.phone_number];
    return values.flatMap(jidIdentityVariants).some(value => identities.has(value));
}
function isBotMentioned(msg, sock) {
    const botUser = sock?.user || {};
    const botIdentities = [
        botUser.id,
        botUser.lid,
        botUser.jid,
        botUser.phoneNumber,
        sock?.authState?.creds?.me?.id,
        sock?.authState?.creds?.me?.lid
    ].flatMap(jidIdentityVariants);
    const identitySet = new Set(botIdentities);
    const botNumbers = new Set(botIdentities.map(chatbotNumber).filter(Boolean));
    const mentioned = chatbotMentionedJids(msg);
    if (mentioned.some(jid => jidIdentityVariants(jid).some(identity => identitySet.has(identity)))) return true;
    if (mentioned.some(jid => botNumbers.has(chatbotNumber(jid)))) return true;

    // Some WhatsApp clients include the visible @number in text but omit
    // contextInfo.mentionedJid. Keep this fallback limited to the bot number.
    const text = String(msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.text || '');
    return [...text.matchAll(/@(\d{5,20})/g)].some(match => botNumbers.has(match[1]));
}
function makeSafeChatbotReply(response) {
    const text = String(response || '').trim();
    if (!text) return 'Main aapki madad karne ke liye yahan hoon. Please apna sawaal dobara likhein.';
    if (CHATBOT_BAD_WORD_PATTERN.test(text)) {
        return 'Main respectful language mein hi jawab deta hoon. Aap apna sawaal pooch sakte hain.';
    }
    return text;
}

// Bold font converter
const toBold = (text) => {
    const boldChars = {
        'a': '\u{1D5EE}', 'b': '\u{1D5EF}', 'c': '\u{1D5F0}', 'd': '\u{1D5F1}', 'e': '\u{1D5F2}', 'f': '\u{1D5F3}', 'g': '\u{1D5F4}', 'h': '\u{1D5F5}', 'i': '\u{1D5F6}', 'j': '\u{1D5F7}', 'k': '\u{1D5F8}', 'l': '\u{1D5F9}', 'm': '\u{1D5FA}', 'n': '\u{1D5FB}', 'o': '\u{1D5FC}', 'p': '\u{1D5FD}', 'q': '\u{1D5FE}', 'r': '\u{1D5FF}', 's': '\u{1D600}', 't': '\u{1D601}', 'u': '\u{1D602}', 'v': '\u{1D603}', 'w': '\u{1D604}', 'x': '\u{1D605}', 'y': '\u{1D606}', 'z': '\u{1D607}',
        'A': '\u{1D5D4}', 'B': '\u{1D5D5}', 'C': '\u{1D5D6}', 'D': '\u{1D5D7}', 'E': '\u{1D5D8}', 'F': '\u{1D5D9}', 'G': '\u{1D5DA}', 'H': '\u{1D5DB}', 'I': '\u{1D5DC}', 'J': '\u{1D5DD}', 'K': '\u{1D5DE}', 'L': '\u{1D5DF}', 'M': '\u{1D5E0}', 'N': '\u{1D5E1}', 'O': '\u{1D5E2}', 'P': '\u{1D5E3}', 'Q': '\u{1D5E4}', 'R': '\u{1D5E5}', 'S': '\u{1D5E6}', 'T': '\u{1D5E7}', 'U': '\u{1D5E8}', 'V': '\u{1D5E9}', 'W': '\u{1D5EA}', 'X': '\u{1D5EB}', 'Y': '\u{1D5EC}', 'Z': '\u{1D5ED}',
        '0': '\u{1D7EC}', '1': '\u{1D7ED}', '2': '\u{1D7EE}', '3': '\u{1D7EF}', '4': '\u{1D7F0}', '5': '\u{1D7F1}', '6': '\u{1D7F2}', '7': '\u{1D7F3}', '8': '\u{1D7F4}', '9': '\u{1D7F5}'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

// Italic font converter
const toItalic = (text) => {
    const italicChars = {
        'a': '\u{1D608}', 'b': '\u{1D609}', 'c': '\u{1D60A}', 'd': '\u{1D60B}', 'e': '\u{1D60C}', 'f': '\u{1D60D}', 'g': '\u{1D60E}', 'h': '\u{1D60F}', 'i': '\u{1D610}', 'j': '\u{1D611}', 'k': '\u{1D612}', 'l': '\u{1D613}', 'm': '\u{1D614}', 'n': '\u{1D615}', 'o': '\u{1D616}', 'p': '\u{1D617}', 'q': '\u{1D618}', 'r': '\u{1D619}', 's': '\u{1D61A}', 't': '\u{1D61B}', 'u': '\u{1D61C}', 'v': '\u{1D61D}', 'w': '\u{1D61E}', 'x': '\u{1D61F}', 'y': '\u{1D620}', 'z': '\u{1D621}',
        'A': '\u{1D5CE}', 'B': '\u{1D5CF}', 'C': '\u{1D5D0}', 'D': '\u{1D5D1}', 'E': '\u{1D5D2}', 'F': '\u{1D5D3}'
    };
    return text.split('').map(c => italicChars[c] || c).join('');
};

class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.aiEnabled = botData.statusSettings[userId]?.aiEnabled === true;
        this.autoReact = botData.statusSettings[userId]?.autoReact || false;
        // Every newly connected session starts PRIVATE; owner may explicitly use .public later.
        this.isPublic = false;
        this.authPath = path.join(AUTH_DIR, userId);
        this.processedMessages = new Set();
        this.activeInterval = null;
        this.isInitializing = false;
        this.reconnectTimer = null;
        this.reconnectAttempt = 0;
        this.intentionalDisconnect = false;
        this.userChats = {}; 
        // A legacy timestamp counts as already sent; the new flag is permanent.
        this.welcomeMessageSent = Boolean(
            botData.welcomeMessageSent?.[userId] || botData.connectionMessageTimes?.[userId]
        );
        this.phoneNumber = null;
        this.pairingNumber = null;
        this.dashboardUserId = null;
        this.ghostMode = false;
        this.groupMetadataCache = new Map();
    }

    async getGroupMetadata(groupJid, ttlMs = 30000) {
        const cached = this.groupMetadataCache.get(groupJid);
        if (cached && (Date.now() - cached.timestamp) < ttlMs) return cached.value;
        const value = await this.sock.groupMetadata(groupJid);
        this.groupMetadataCache.set(groupJid, { value, timestamp: Date.now() });
        if (this.groupMetadataCache.size > 100) {
            const oldest = this.groupMetadataCache.keys().next().value;
            this.groupMetadataCache.delete(oldest);
        }
        return value;
    }

    sendLog(message, type = 'info') {
        const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type };
        const socketId = userSockets[this.userId];
        if (socketId) io.to(socketId).emit('console', logEntry);
        console.log(`[${this.userId}] ${message}`);
    }

    sendConnectionStatus() {
        const socketId = userSockets[this.userId] || userSockets[this.dashboardUserId];
        if (socketId) {
            io.to(socketId).emit('connection-status', {
                connected: this.isConnected,
                user: this.userId
            });
        }
        io.emit('total-active', Object.values(sessions).filter(s => s.isConnected).length);
        broadcastOwnerStats();
    }

    async getAIResponse(userJid, userMessage, systemPrompt = "You are a respectful WhatsApp group assistant. Reply helpfully to every question, never use profanity, insults, harassment, hate speech, sexual abuse, or bad words, and do not insult any person. If the user is rude, stay calm and answer politely.") {
        const quotaCooldownMs = Math.max(30000, Number(process.env.AI_QUOTA_COOLDOWN_MS || 60000));
        if (this.aiQuotaUntil && Date.now() < this.aiQuotaUntil) {
            return '⚠️ AI quota limit active hai. Provider billing/quota reset hone ke baad dobara try karein.';
        }
        if (!openai) {
            this.sendLog('[AI] No usable OPENAI_API_KEY is configured for the chatbot.', 'warning');
            return '⚠️ AI service abhi configure nahi hai. Admin se OPENAI_API_KEY set karne ko kahen.';
        }
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: String(userMessage || '').slice(0, 4000) }
            ];
            const fallbackModel = cleanRuntimeValue(process.env.AI_FALLBACK_MODEL) || 'gpt-4o-mini';
            const models = [...new Set([configuredAIModel, fallbackModel])];
            let lastError;
            for (const model of models) {
                const tokenOptions = /^gpt-5(?:[.-]|$)/i.test(model)
                    ? { max_completion_tokens: 500 }
                    : { max_tokens: 500 };
                const attempts = [tokenOptions];
                // Some compatible providers reject both token parameter names.
                if (!/^gpt-5(?:[.-]|$)/i.test(model)) attempts.push({});
                for (const options of attempts) {
                    try {
                        const completion = await openai.chat.completions.create({ model, messages, ...options });
                        const answer = completion?.choices?.[0]?.message?.content;
                        if (!answer || !String(answer).trim()) throw new Error('Empty AI response');
                        return String(answer).trim();
                    } catch (error) {
                        lastError = error;
                        const status = Number(error?.status || error?.response?.status || 0);
                        if (![400, 404].includes(status)) throw error;
                    }
                }
            }
            throw lastError || new Error('No compatible AI model succeeded');
        } catch (error) {
            const status = Number(error?.status || error?.response?.status || 0);
            let userMessage = '⚠️ AI service abhi temporarily unavailable hai. Thodi der baad dobara try karein.';
            if (status === 401) userMessage = '⚠️ AI key invalid hai ya revoke ho chuki hai. Railway Variables mein nayi key set karein.';
            else if (status === 404) userMessage = '⚠️ AI model ya API URL galat hai. AI_BASE_URL mein https://api.openai.com/v1 aur valid AI_MODEL set karein.';
            else if (status === 429) {
                this.aiQuotaUntil = Date.now() + quotaCooldownMs;
                userMessage = '⚠️ AI quota/billing limit reached hai. Provider billing/quota check karein. Bot 1 minute tak repeat requests nahi bhejega.';
            }
            else if (status === 400) userMessage = '⚠️ AI request reject hui. Railway mein AI_MODEL ko gpt-5-mini ya gpt-3.5-turbo mein se provider-supported model par set karein.';
            const providerMessage = String(error?.error?.message || error?.response?.data?.error?.message || error?.message || 'unknown error').slice(0, 300);
            this.sendLog(`[AI] Chat completion failed (${status || 'network'}): ${providerMessage}`, 'error');
            return userMessage;
        }
    }

    startPresenceKeepAlive() {
        if (this.presenceInterval) clearInterval(this.presenceInterval);
        const sendAvailable = async () => {
            if (!this.isConnected || !this.sock?.user || !botData.statusSettings[this.userId]?.alwaysOnline) return;
            try {
                await this.sock.sendPresenceUpdate('available');
            } catch (error) {
                this.sendLog(`Always-online update failed: ${error.message}`, 'warning');
            }
        };
        sendAvailable();
        this.presenceInterval = setInterval(sendAvailable, 25000);
    }
    stopPresenceKeepAlive() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
    }
    async showAutoPresence(jid) {
        if (!jid || jid === 'status@broadcast' || jid === this.userId) return;
        const settingsForBot = botData.statusSettings[this.userId] || {};
        const autoPresence = (botData.autoPresence || 'off').toLowerCase();
        const presence = settingsForBot.autoRecording ? 'recording' : settingsForBot.autoTyping ? 'composing' : (autoPresence === 'recording' ? 'recording' : autoPresence === 'typing' ? 'composing' : autoPresence === 'on' ? (Math.random() < 0.5 ? 'recording' : 'composing') : null);
        if (!presence || !this.isConnected) return;
        try {
            await this.sock.sendPresenceUpdate(presence, jid);
            setTimeout(() => this.sock.sendPresenceUpdate('paused', jid).catch(() => {}), 4500);
        } catch (error) {
            this.sendLog(`Auto-presence update failed: ${error.message}`, 'warning');
        }
    }
    startActiveCheck() {
        if (this.activeInterval) clearInterval(this.activeInterval);
        this.activeInterval = null;
        // Disabled intentionally: do not send periodic “24/7 Active System” self-DMs.
        // Connection state and presence controls continue to work independently.
    }

    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    scheduleReconnect(delayMs = null) {
        if (this.intentionalDisconnect || sessions[this.userId] !== this || this.reconnectTimer) return;
        const baseDelay = delayMs ?? Math.min(30000, 3000 * Math.max(1, this.reconnectAttempt + 1));
        const waitMs = Math.min(60000, baseDelay + Math.floor(Math.random() * 1000));
        this.reconnectAttempt += 1;
        this.sendLog(`Reconnecting in ${Math.ceil(waitMs / 1000)}s (attempt ${this.reconnectAttempt})...`, 'warning');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.intentionalDisconnect || sessions[this.userId] !== this) return;
            this.initialize().catch((error) => {
                this.sendLog(`Reconnect attempt failed: ${error.message}`, 'error');
                this.scheduleReconnect();
            });
        }, waitMs);
    }

    async initialize(pairingNumber = null) {
        if (pairingNumber) this.pairingNumber = normalizePairingNumber(pairingNumber);
        if (this.intentionalDisconnect) return;
        if (this.isInitializing) {
            this.sendLog("Initialization already in progress...", "info");
            return;
        }
        this.clearReconnectTimer();
        this.isInitializing = true;
        const requestedPairingNumber = pairingNumber ? normalizePairingNumber(pairingNumber) : this.pairingNumber;
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: true,
                // Correct Baileys keepalive option; the old misspelled option was ignored.
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                qrTimeout: 120000,
                emitOwnEvents: true,
                retryRequestDelayMs: 5000,
                maxMsgRetryCount: 5,
                linkPreviewImageThumbnailWidth: 192,
                transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
                getMessage: async (key) => {
                    const storedText = String(messageLogs[key.id]?.text || '').trim();
                    if (storedText) {
                        return { conversation: storedText };
                    }
                    // Never fabricate a user-facing fallback message. Returning undefined
                    // prevents Baileys retries from emitting empty or “Bot is active” messages.
                    return undefined;
                },
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                    if (requiresPatch) {
                        return {
                            viewOnceMessage: {
                                message: {
                                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                    ...message
                                }
                            }
                        };
                    }
                    return message;
                },
                generateHighQualityLinkPreview: true,
            });

            if (requestedPairingNumber && !state.creds.registered) {
                if (!this.sock.authState.creds.registered) {
                    await delay(3000);
                    try {
                        let code = await this.sock.requestPairingCode(requestedPairingNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        this.sendLog(`\u{1F511} Pairing Code: ${code}`, 'success');

                        const socketId = userSockets[this.userId] || userSockets[this.dashboardUserId];
                        if (socketId) io.to(socketId).emit('pairing-code', code);
                    } catch (err) {
                        this.sendLog(`\u{274C} Pairing error: ${err.message}`, 'error');
                        this.sendLog(`Pairing error: ${err.message}`, 'error');
                    }
                }
            }

            this.sock.ev.on('creds.update', saveCreds);

            // Group Participants Update (Welcome/Goodbye/Anti-Promote/Anti-Demote)
            this.sock.ev.on('group-participants.update', async (update) => {
                const { id, participants, action, author } = update;
                console.log(`[DEBUG] Group event received: ${action} in ${id} (${(participants || []).length} participant(s))`);
                if (['add', 'remove'].includes(action)) {
                    await sendGroupEventMessage(this.sock, update);
                    return;
                }
                if (!['promote', 'demote'].includes(action)) return;

                // Anti-Promote / Anti-Demote Logic. Baileys may expose the actor as
                // author, actor, or executor depending on the WhatsApp event shape.
                const actor = update.author || update.actor || update.executor || null;
                const promoteMode = botData.antiPromote?.[id];
                const demoteMode = botData.antiDemote?.[id];
                const protectedAction = (action === 'promote' && ['on', 'kick'].includes(promoteMode)) || (action === 'demote' && ['on', 'kick'].includes(demoteMode));
                // Bot owner exemption: when the bot's owner promotes/demotes someone,
                // the anti system stays silent — no reverse, no kick.
                const actorNumeric = actor ? chatbotNumber(actor) : '';
                const ownerNumbers = String(settings.ownerNumber || '').split(',').map(n => normalizePairingNumber(n)).filter(Boolean);
                const actorIsOwner = actorNumeric !== '' && (ownerNumbers.includes(actorNumeric) || actorNumeric === chatbotNumber(this.sock.user.id));
                if (protectedAction && actorIsOwner) {
                    console.log(`[DEBUG] Anti-${action}: action taken by bot owner (${actor}) — skipped by owner exemption`);
                    logAntiSecurity(id, `Anti-${action} SKIPPED (bot owner ${'@' + actorNumeric} performed it)`);
                    return;
                }
                if (protectedAction) {
                    try {
                        // Fetch fresh metadata (skip the in-memory cache so we always see the
                        // current admin state). groupMetadata with no cache key goes straight
                        // to WhatsApp when we invalidate here.
                        let metadata;
                        try {
                            metadata = await this.sock.groupMetadata(id);
                        } catch (metaErr) {
                            console.log(`[DEBUG] Anti-${action}: metadata fetch failed in ${id}: ${metaErr.message}`);
                            metadata = await this.getGroupMetadata(id);
                        }
                        if (!metadata || !metadata.participants || !metadata.participants.length) {
                            console.log(`[DEBUG] Anti-${action}: metadata empty in ${id}`);
                            return;
                        }
                        const botUser = this.sock.user || {};
                        const botIdentities = new Set([
                            botUser.id,
                            botUser.lid,
                            botUser.jid,
                            botUser.phoneNumber,
                            this.sock.authState?.creds?.me?.id,
                            this.sock.authState?.creds?.me?.lid
                        ].flatMap(jidIdentityVariants));
                        const botParticipant = metadata.participants.find(p => participantMatchesIdentities(p, botIdentities));
                        // Bot exemption: actions performed by the bot itself are ignored by this
                        // system. Owner and bot may promote/demote freely; only other admins are targeted.
                        if (actor && botParticipant && participantMatchesIdentities(botParticipant, new Set(jidIdentityVariants(actor)))) {
                            console.log(`[DEBUG] Anti-${action}: action performed by the bot itself — skipped`);
                            logAntiSecurity(id, `Anti-${action} SKIPPED (performed by the bot)`);
                            return;
                        }
                        const botIsAdmin = Boolean(botParticipant && ['admin', 'superadmin'].includes(botParticipant.admin));
                        if (!botIsAdmin) {
                            console.log(`[DEBUG] Anti-Security active but bot is not admin in ${id}`);
                            await this.sock.sendMessage(id, { text: '⚠️ Anti-' + action + ' system on hai, lekin bot is group ka admin nahi hai. Bot ko admin banao tabhi reverse/kick kaam karega.' });
                            return;
                        }

                        const targetParticipants = (participants || []).map(p => jidNormalizedUser(p)).filter(Boolean);
                        const actorJid = actor ? jidNormalizedUser(actor) : null;
                        console.log(`[DEBUG] Anti-${action} detected in ${id}: mode=${action === 'promote' ? promoteMode : demoteMode}, actor=${actor || 'unknown'}, participants=${JSON.stringify(participants || [])}`);
                        // If WhatsApp sent an empty participants list (common in some versions),
                        // resolve targets from the fresh metadata: for a promote, anyone who is
                        // newly an admin; for a demote, anyone who lost admin.
                        let effectiveTargets = targetParticipants;
                        if (effectiveTargets.length === 0) {
                            try {
                                if (action === 'promote') {
                                    effectiveTargets = metadata.participants
                                        .filter(p => p.admin && !jidIdentityVariants(p.id).some(v => v === actorJid))
                                        .map(p => jidNormalizedUser(p.id));
                                } else {
                                    // demote with no participants: cannot know who was demoted
                                    // without previous state; act only on explicit lists.
                                    effectiveTargets = [];
                                }
                            } catch (_) {}
                        }
                        const logTargets = effectiveTargets.length ? effectiveTargets.map(j => '@' + j.split('@')[0]).join(', ') : (targetParticipants.length ? targetParticipants.map(j => '@' + j.split('@')[0]).join(', ') : 'unknown');
                        logAntiSecurity(id, `Anti-${action} (${promoteMode || demoteMode}): ${actorJid ? '@' + actorJid.split('@')[0] : 'unknown actor'} — targets: ${logTargets}`);
                        // If WhatsApp does not attach an actor, attribute the action to the admin
                        // who is not one of the targets (heuristic attribution from metadata).
                        let reversed = [];
                        for (const participant of effectiveTargets) {
                            // Try both PN and LID forms: some WhatsApp gateways only accept one.
                            for (const candidate of [chatbotForm(participant), toLidForm(participant)].filter(Boolean)) {
                                try {
                                    const results = await this.sock.groupParticipantsUpdate(id, [candidate], action === 'promote' ? 'demote' : 'promote');
                                    const status = (results || []).find(r => jidNormalizedUser(r.jid) === jidNormalizedUser(candidate))?.status || '200';
                                    console.log(`[DEBUG] Anti-${action} reverse result for ${candidate}: status ${status}`);
                                    if (status === '200') { reversed.push(participant); break; }
                                } catch (revErr) {
                                    console.error(`[DEBUG] Anti-${action} reverse failed for ${candidate}: ${revErr.message}`);
                                }
                            }
                        }

                        const mode = action === 'promote' ? promoteMode : demoteMode;
                        const shouldKick = mode === 'kick';
                        const actorClean = actorJid ? actorJid.split('@')[0] : 'the action taker';
                        const actionLabel = action === 'promote' ? 'promote someone' : 'demote an admin';
                        const botJid = jidNormalizedUser(this.sock.user.id);
                        const actorIsBot = actorJid && participantMatchesIdentities(botParticipant, new Set(jidIdentityVariants(actorJid)));
                        if (shouldKick) {
                            // Resolve the actor to a real group participant. The event's actor may be a
                            // LID-format jid that does not match metadata verbatim, so identity matching
                            // is used. If the actor cannot be resolved, fall back to other admins.
                            // Owner (superadmin) and the bot are NEVER kicked — hard exclusions.
                            let kickList = [];
                            const resolvedActor = metadata.participants.find(p => participantMatchesIdentities(p, new Set(actorJid ? jidIdentityVariants(actorJid) : [])));
                            const owner = metadata.participants.find(p => p.admin === 'superadmin');
                            const ownerIsActor = owner && participantMatchesIdentities(owner, new Set(actorJid ? jidIdentityVariants(actorJid) : []));
                            // Bot-owner numeric numbers are always protected from kicks.
                            const ownerNumbers = String(settings.ownerNumber || '').split(',').map(n => normalizePairingNumber(n)).filter(Boolean);
                            const isOwnerNumber = (jid) => ownerNumbers.includes(chatbotNumber(jid));
                            if (resolvedActor && !actorIsBot && !ownerIsActor && !isOwnerNumber(resolvedActor.id)) {
                                // Action taker is a protected non-owner, non-bot-owner admin → kick.
                                kickList = [jidNormalizedUser(resolvedActor.id)];
                            } else if (!actorJid || actorIsBot || ownerIsActor) {
                                // Owner did it, bot did it, or actor unknown → NEVER punish the owner.
                                // When the actor is UNKNOWN we cannot know who did it — kicking a
                                // random admin risks punishing the innocent, so we skip the kick.
                                if (!actorJid) {
                                    console.log(`[DEBUG] Anti-${action}: actor unknown in this event — skipping kick to avoid punishing the wrong admin`);
                                }
                                if (actorIsBot) console.log(`[DEBUG] Anti-${action}: actor was the bot itself, skipping kick`);
                                if (ownerIsActor) console.log(`[DEBUG] Anti-${action}: action taken by the group owner — protected, no kick`);
                            }
                            for (const kickJid of kickList) {
                                let kicked = false;
                                // Try normalized, PN, and lid forms — some WhatsApp gateways reject one of them.
                                for (const candidate of [kickJid, toPnForm(kickJid), chatbotForm(kickJid)].filter(Boolean)) {
                                    try {
                                        const results = await this.sock.groupParticipantsUpdate(id, [candidate], 'remove');
                                        const status = (results || []).find(r => jidNormalizedUser(r.jid) === jidNormalizedUser(candidate))?.status || '200';
                                        console.log(`[DEBUG] Anti-${action} kick result for ${candidate}: status ${status}`);
                                        if (status === '200') { kicked = true; break; }
                                        if (status !== '200') {
                                            console.log(`[DEBUG] Anti-${action} kick status ${status} for ${candidate}`);
                                        }
                                    } catch (kickError) {
                                        console.error(`[DEBUG] Anti-${action} kick failed for ${candidate}: ${kickError.message}`);
                                    }
                                }
                                if (!kicked) {
                                    await this.sock.sendMessage(id, { text: `⚠️ @${kickJid.split('@')[0]} ko kick karne ki koshish ki gayi, lekin WhatsApp ne allow nahi kiya. Ye group owner ho sakta hai, ya bot ki admin power kaafi nahi hai (owner ne banaya hai toh sirf owner kick kar sakta hai).`, mentions: [kickJid] });
                                }
                            }
                        }
                        const noticeText = effectiveTargets.length === 0
                            ? `⚠️ Anti-${action} (${mode}) active hai, lekin WhatsApp ne event me targets ki list nahi bheji — kisi ko reverse nahi kiya gaya.`
                            : `🚫 *ANTI-${action.toUpperCase()} DETECTED*\n\n${actorJid ? `@${actorClean} ne ${actionLabel}.` : `${actionLabel} ka attempt detect hua.`} ${action === 'promote' ? 'Promotion' : 'Demotion'}${reversed.length ? ` wapas reverse kar di gayi (${reversed.length} user).` : ' ki reverse ki koshish ki gayi, lekin WhatsApp ne allow nahi kiya.'}${shouldKick && kickList.length > 0 ? '\nAction taker ko turant kick kar diya gaya.' : ''}`;
                        await this.sock.sendMessage(id, { text: noticeText, ...(actorJid ? { mentions: [actorJid] } : {}) });
                    } catch (e) {
                        console.error(`[DEBUG] Anti-Security error: ${e.message}`);
                    }
                }
            });

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                // Properly reject call
                                await this.sock.rejectCall(call.id, call.from);
                                
                                // Send professional rejection message
                                await this.sock.sendMessage(call.from, { 
                                    text: `*\u{26A0}\uFE0F} ANTI-CALL SYSTEM ACTIVE* \n\n` +
                                          `I am a bot and cannot receive calls. \n` +
                                          `Please send a text message instead. \n\n` +
                                          `> © POWERED BY MD-ZESHOO-BOT`
                                });
                            } catch (e) {}
                        }
                    }
                }
            });

            // ===== ONLINE MEMBERS CACHE (for .listonline) =====
            // Track real-time presence updates so the bot knows which group members
            // are actually online instead of listing every participant.
            // presence.update payload in baileys is a SINGLE object:
            // { id: chatJid, presences: { [participantJid]: { lastKnownPresence, lastSeen } } }
            this.sock.ev.on('presence.update', (event) => {
                if (!event || !event.presences) return;
                const chatId = event.id;
                for (const [participant, p] of Object.entries(event.presences)) {
                    const seen = (p.lastKnownPresence === 'available' ||
                                p.lastKnownPresence === 'composing' ||
                                p.lastKnownPresence === 'recording');
                    if (!onlineCache.has(chatId)) onlineCache.set(chatId, new Map());
                    const cache = onlineCache.get(chatId);
                    if (seen) {
                        cache.set(participant, Date.now());
                    } else {
                        cache.delete(participant);
                    }
                    // keep cache bounded
                    while (cache.size > 500) {
                        let oldestKey = null, oldestAt = Infinity;
                        for (const [k, v] of cache) {
                            if (v < oldestAt) { oldestAt = v; oldestKey = k; }
                        }
                        if (oldestKey) cache.delete(oldestKey);
                    }
                }
            });
            // ===== END ONLINE MEMBERS CACHE =====

                        this.sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;
                await Promise.all(m.messages.map(async (msg) => {
                    if (!claimIncomingMessage(msg)) return;
                    if (msg.messageStubType === 1 || msg.messageStubType === 2) {
                        this.sendLog('Received an undecryptable message. This might be due to a session conflict.', 'warning');
                    }

                    try {
                        const from = msg.key.remoteJid;
                        const isMe = msg.key.fromMe;
                        const isGroup = from.endsWith('@g.us');
                        const isStatus = from === 'status@broadcast';

                        // Delete (revocation) events only carry a protocolMessage, so handle
                        // antidelete BEFORE the empty-message early return — otherwise antidelete
                        // could never fire because this handler would return immediately.
                        if (msg.message?.protocolMessage?.type === 0) {
                            await handleMessageRevocation(this.sock, msg);
                            return;
                        }

                        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                                                if (!messageContent) return;
                        if (!isMe && !isStatus) await this.showAutoPresence(from);
                        let type = Object.keys(messageContent)[0];
                        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();

                        // Handle snipe for deleted messages
                        if (!isMe && !isStatus) {
                            await handleAutoread(this.sock, msg);
                            await storeMessage(msg);
                            handleSnipe(msg);
                        }

                        // Fallback Group Event Handler (Stub Types). Some WhatsApp clients
                        // deliver membership changes as message stubs instead of the event above.
                        if (isGroup && msg.messageStubType) {
                            const stubType = msg.messageStubType;
                            const eventAction = (stubType === 27 || stubType === 31)
                                ? 'add'
                                : (stubType === 28 || stubType === 32) ? 'remove' : null;
                            if (eventAction) {
                                await sendGroupEventMessage(this.sock, {
                                    id: from,
                                    action: eventAction,
                                    participants: msg.messageStubParameters || []
                                });
                            }
                        }

                        const msgId = msg.key.id;
                        if (this.processedMessages.has(msgId)) return;
                        this.processedMessages.add(msgId);
                        if (this.processedMessages.size > 1000) this.processedMessages.delete(this.processedMessages.values().next().value);

                        if (!isStatus) {
                            let logEntry = {
                                text,
                                type,
                                isViewOnce: Boolean(
                                    msg.message?.viewOnceMessage ||
                                    msg.message?.viewOnceMessageV2 ||
                                    msg.message?.viewOnceMessageV2Extension ||
                                    messageContent?.imageMessage?.viewOnce === true ||
                                    messageContent?.videoMessage?.viewOnce === true
                                )
                            };
                            if (['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
                                try {
                                    const mContent = messageContent[type];
                                    if (mContent && (mContent.directPath || mContent.url)) {
                                        const stream = await downloadContentFromMessage(mContent, type.replace('Message', ''));
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        logEntry.buffer = buffer;
                                    }
                                } catch (e) {}
                            }
                            logEntry.pushName = msg.pushName || 'User';
                            messageLogs[msgId] = logEntry;
                            if (Object.keys(messageLogs).length > 2000) delete messageLogs[Object.keys(messageLogs)[0]];
                        }

                        // Chatbot auto-reply: groups only, and only when a member mentions the bot.
                        // Personal-message auto-replies are intentionally disabled.
                        if (this.aiEnabled && !isMe && isGroup && text && !text.startsWith(settings.prefix) && isBotMentioned(msg, this.sock)) {
                            try {
                                const question = text.replace(/@\d{5,20}/g, '').replace(/\s+/g, ' ').trim();
                                if (!question) return;
                                const chatbotPrompt = 'You are MD-ZESHOO-BOT, a friendly and respectful WhatsApp group AI assistant. Answer every genuine question clearly and briefly. Never use bad words, profanity, insults, slurs, harassment, threats, or abusive language toward anyone. Do not repeat abusive words even when asked; politely refuse that part and continue helpfully. Reply in the language used by the member.';
                                const aiResponse = makeSafeChatbotReply(await this.getAIResponse(from, question, chatbotPrompt));
                                await this.sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
                            } catch (e) {
                                console.error('Group chatbot auto-reply error:', e);
                            }
                        }

                        // Status handling
                        if (isStatus && !isMe) {
                            await handleStatusUpdate(this.sock, msg, botData, this.userId);
                            return;
                        }

                        // =================== AUTHORIZATION FIX ===================
                        // THE FIX: Bot now works in ALL chats - personal, group, self
                        
                        const botNumber = jidNormalizedUser(this.sock.user.id);
                        const botNumberClean = chatbotNumber(botNumber);

                        const sender = msg.key.participant || from;
                        const senderClean = chatbotNumber(sender);

                        const ownerNumbers = String(settings.ownerNumber).split(',').map(n => normalizePairingNumber(n)).filter(Boolean);
                        const isOwner = isMe || senderClean === botNumberClean || ownerNumbers.includes(senderClean);

                        // The WhatsApp account that paired this session is its session owner.
                        const isSessionUser = senderClean === normalizePairingNumber(this.phoneNumber) && senderClean !== '';

                        // Calculate sender and bot admin status once for authorization.
                        let isAdmin = isOwner;
                        let botIsAdmin = false;
                        if (isGroup) {
                            try {
                                const groupMetadata = await this.getGroupMetadata(from);
                                const senderIdentities = new Set(jidIdentityVariants(sender));
                                const botUser = this.sock.user || {};
                                const botIdentities = new Set([
                                    botUser.id,
                                    botUser.lid,
                                    botUser.jid,
                                    botUser.phoneNumber,
                                    this.sock.authState?.creds?.me?.id,
                                    this.sock.authState?.creds?.me?.lid
                                ].flatMap(jidIdentityVariants));
                                const participant = groupMetadata.participants.find(p => participantMatchesIdentities(p, senderIdentities));
                                const botParticipant = groupMetadata.participants.find(p => participantMatchesIdentities(p, botIdentities));
                                isAdmin = Boolean(isAdmin || (participant && ['admin', 'superadmin'].includes(participant.admin)));
                                botIsAdmin = Boolean(botParticipant && ['admin', 'superadmin'].includes(botParticipant.admin));
                            } catch (e) {
                                isAdmin = isOwner;
                                botIsAdmin = false;
                            }
                        }

                        // Private mode allows the configured owner and the WhatsApp account
                        // that paired this session. Ordinary group members remain restricted.
                        const isAuthorized = this.isPublic || isOwner || isSessionUser;

                        // Owner-only view-once recovery. The owner replies to a view-once
                        // image/video with any emoji; the bot sends a normal downloadable
                        // copy only to the configured owner inbox and removes the trigger.
                        const emojiText = String(
                            text ||
                            messageContent?.reactionMessage?.text ||
                            msg.message?.reactionMessage?.text ||
                            ''
                        ).replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, '').trim();
                        const emojiTrigger = Boolean(
                            emojiText &&
                            /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(emojiText) &&
                            !/[a-z0-9]/i.test(emojiText)
                        );
                        const rawMessage = msg.message || {};
                        const quotedMessage =
                            messageContent?.extendedTextMessage?.contextInfo?.quotedMessage ||
                            messageContent?.contextInfo?.quotedMessage ||
                            rawMessage.extendedTextMessage?.contextInfo?.quotedMessage ||
                            rawMessage.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                            rawMessage.viewOnceMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                            rawMessage.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                        const unwrapQuoted = (value) => {
                            let current = value;
                            for (let depth = 0; depth < 8 && current; depth += 1) {
                                const wrapper = current.viewOnceMessage || current.viewOnceMessageV2 || current.viewOnceMessageV2Extension || current.ephemeralMessage || current.documentWithCaptionMessage;
                                if (!wrapper?.message) break;
                                current = wrapper.message;
                            }
                            return current;
                        };
                        const quotedContent = unwrapQuoted(quotedMessage);
                        const quotedMediaType = quotedContent?.imageMessage ? 'image' : quotedContent?.videoMessage ? 'video' : null;
                        const quotedMedia = quotedMediaType === 'image' ? quotedContent.imageMessage : quotedMediaType === 'video' ? quotedContent.videoMessage : null;
                        const quotedIsViewOnce = Boolean(
                            quotedMessage?.viewOnceMessage || quotedMessage?.viewOnceMessageV2 || quotedMessage?.viewOnceMessageV2Extension ||
                            quotedContent?.viewOnceMessage || quotedContent?.viewOnceMessageV2 ||
                            quotedMedia?.viewOnce === true || quotedMedia?.viewOnceV2 === true || quotedMedia?.isViewOnce === true
                        );
                        const reactionKeyId = rawMessage.reactionMessage?.key?.id;
                        const storedViewOnce = reactionKeyId ? messageLogs[reactionKeyId] : null;
                        const ownerInbox = ownerNumbers[0] ? `${ownerNumbers[0]}@s.whatsapp.net` : sender;
                        const sendRecoveredMedia = async (mediaType, mediaBuffer, mimetype) => {
                            if (!mediaBuffer || !mediaBuffer.length) throw new Error('Downloaded media is empty');
                            const mediaPayload = mediaType === 'image'
                                ? { image: mediaBuffer, mimetype: mimetype || 'image/jpeg', caption: '✅ View-once copy recovered privately by ZESHOO MINI BOT.' }
                                : { video: mediaBuffer, mimetype: mimetype || 'video/mp4', caption: '✅ View-once copy recovered privately by ZESHOO MINI BOT.' };
                            await this.sock.sendMessage(ownerInbox, mediaPayload);
                            if (isGroup || from !== ownerInbox) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (deleteError) { this.sendLog(`[ONEVIEW] Trigger cleanup failed: ${deleteError.message}`, 'warning'); }
                            }
                        };
                        if (isOwner && emojiTrigger && quotedIsViewOnce && quotedMediaType && quotedMedia) {
                            try {
                                const stream = await downloadContentFromMessage(quotedMedia, quotedMediaType);
                                let mediaBuffer = Buffer.alloc(0);
                                for await (const chunk of stream) mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                                await sendRecoveredMedia(quotedMediaType, mediaBuffer, quotedMedia.mimetype);
                            } catch (oneViewError) {
                                this.sendLog(`[ONEVIEW] Recovery failed: ${oneViewError.message}`, 'error');
                                await this.sock.sendMessage(ownerInbox, { text: '⚠️ View-once media recover nahi ho saka. Media expire ya unavailable ho sakta hai.' });
                            }
                            return;
                        }
                        if (isOwner && emojiTrigger && storedViewOnce?.isViewOnce && storedViewOnce.buffer && ['imageMessage', 'videoMessage'].includes(storedViewOnce.type)) {
                            try {
                                await sendRecoveredMedia(storedViewOnce.type === 'imageMessage' ? 'image' : 'video', storedViewOnce.buffer, storedViewOnce.type === 'imageMessage' ? 'image/jpeg' : 'video/mp4');
                            } catch (oneViewStoredError) {
                                this.sendLog(`[ONEVIEW] Stored recovery failed: ${oneViewStoredError.message}`, 'error');
                                await this.sock.sendMessage(ownerInbox, { text: '⚠️ View-once media recover nahi ho saka. Media expire ya unavailable ho sakta hai.' });
                            }
                            return;
                        }

                        // Anti-message mode: only the bot may speak in the group.
                        // The toggle command itself is exempt so admins can turn it off.
                        const isAntiMessageCommand = text.toLowerCase().startsWith(`${settings.prefix}antimessage`);
                        if (isGroup && !isMe && !isStatus && !isAntiMessageCommand && botData.antiMessageGroups?.[from] === 'on') {
                            try {
                                const groupMetadata = await this.getGroupMetadata(from);
                                const ownJid = jidNormalizedUser(this.sock.user?.id || botNumber);
                                const botParticipant = groupMetadata.participants.find(p => {
                                    const participantJid = jidNormalizedUser(p.id || p.jid || '');
                                    return participantJid === ownJid || participantJid.split(':')[0] === ownJid.split(':')[0];
                                });
                                const botIsAdmin = Boolean(botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin');
                                let deleted = false;
                                try {
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    deleted = true;
                                } catch (deleteError) {
                                    this.sendLog(`[ANTIMESSAGE] Delete failed in ${from}: ${deleteError.message}`, 'error');
                                }
                                if (!deleted) {
                                    await this.sock.sendMessage(from, { text: `⚠️ Anti-message could not delete this message. Make the bot a group admin and try again.\nBot admin detected: ${botIsAdmin ? 'YES' : 'NO'}` }, { quoted: msg });
                                } else {
                                    const warningKey = `${from}:${jidNormalizedUser(sender)}`;
                                    const warningCount = (botData.antiMessageWarnings?.[warningKey] || 0) + 1;
                                    botData.antiMessageWarnings[warningKey] = warningCount;
                                    saveBotData();
                                    if (warningCount >= 3) {
                                        await this.sock.sendMessage(from, { text: `🚫 @${senderClean} has been removed after ${warningCount} anti-message violations.`, mentions: [sender] });
                                        try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickError) {
                                            await this.sock.sendMessage(from, { text: `⚠️ @${senderClean} reached the limit, but WhatsApp did not allow removal.`, mentions: [sender] });
                                        }
                                        delete botData.antiMessageWarnings[warningKey];
                                        saveBotData();
                                    } else {
                                        await this.sock.sendMessage(from, { text: `⚠️ @${senderClean}, messages are disabled in this group. Warning ${warningCount}/3.`, mentions: [sender] });
                                    }
                                }
                            } catch (error) {
                                console.error(`[ANTIMESSAGE] ${from}: ${error.message}`);
                            }
                            return;
                        }

                        // Anti-bad-word moderation: delete, warn, or kick.
                        const badwordMode = botData.antiBadwordGroups?.[from];
                        if (isGroup && !isMe && !isStatus && text && !text.startsWith(settings.prefix) && ['delete', 'warn', 'kick'].includes(badwordMode) && CHATBOT_BAD_WORD_PATTERN.test(text)) {
                            try {
                                await this.sock.sendMessage(from, { delete: msg.key });
                                if (badwordMode === 'warn') {
                                    await this.sock.sendMessage(from, { text: `⚠️ @${senderClean}, abusive language is not allowed. Your message was deleted.`, mentions: [sender] });
                                } else if (badwordMode === 'kick') {
                                    const metadata = await this.getGroupMetadata(from);
                                    const botJid = jidNormalizedUser(this.sock.user.id);
                                    const botParticipant = metadata.participants.find(participant => jidNormalizedUser(participant.id) === botJid);
                                    const botIsAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
                                    if (isAdmin || isOwner) {
                                        await this.sock.sendMessage(from, { text: `⚠️ @${senderClean}, abusive language is not allowed. Your message was deleted; admins/owner are not kicked automatically.`, mentions: [sender] });
                                    } else if (botIsAdmin) {
                                        await this.sock.sendMessage(from, { text: `🚫 @${senderClean} was kicked for abusive language.`, mentions: [sender] });
                                        await this.sock.groupParticipantsUpdate(from, [sender], 'remove');
                                    } else {
                                        await this.sock.sendMessage(from, { text: `⚠️ @${senderClean}, abusive language is not allowed. Message deleted, but I need admin permission to kick.`, mentions: [sender] });
                                    }
                                }
                            } catch (error) {
                                console.error(`[ANTIBADWORD] ${from}: ${error.message}`);
                            }
                            return;
                        }
                        // Auto-react to everyone's messages except the bot's own.
                        // Admins are no longer excluded — only the bot skips itself.
                        if (isGroup && !isMe && !isStatus && botData.autoReactGroups?.[from] === 'on') {
                            const emojis = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩','😘','😗','☺','😚','😙','🥲','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😌','😔','😪','🤤','😴','😷','🤠','🥳','😎','🤓','🧐','😕','🫤','😮','😱','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','🫣','🥱','😤','💯','🚀','✨','🤙','🙏','💖','🤝','👑','🦁','🐺','⚡','💎','🍕','🍿','👾','🏆','🎮','🎯','🎰','❌','ℹ️','❓','🔔','🎭','🐸','💅','🌍','🏖️','🛸','🔮','🤞','🤛','🤜','🦊','💮','💬','💤','🌪️','🌊','☄️','🍄','🍁','🏋️','🥊','🛹','🥷','💻','⛓️','🧲','🧬','🛰️','🖤','🤍','💜','💛','🤎','👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌','🫰','🤟','🤘','👈','👉','👆','👇','☝','👍','✊','👊','👏','🙌','👐','🤲','✍','🤳','💪','🦾','👂','🦻','🧠','🫀','🫁','👀','👁','👅','👄','👶','🧒','👦','👧','🧑','👱','👨','🧓','👩','🧑‍🦰','🧑‍🦱','🧑‍🦳','🧑‍🦲','👩‍🦰','👩‍🦱','👩‍🦳','👩‍🦲','👨‍🦰','👨‍🦱','👨‍🦳','👨‍🦲','🧕','🤵','👰','🫅','👒','🎓','⛑','🎒','🥻','👘','🩳','👔','👕','🧣','🧥','🥼','🦺','🐯','🪶','🦫','🐊','🐢','🦎','🐍','🐲','🐉','🦕','🦖','🐳','🐋','🐬','🦭','🐟','🐠','🐡','🦈','🐙','🐚','🪼','🪱','🪰','🪲','🪳','🧫','🔬','🌙','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌎','🌏','🪐','💫','⭐','🌟','💥','🔥','🌫','💨','🌧','⛈','☔','❄','☃','🌋','🌈','🌲','🌴','🌵','🌾','🌿','🍀','🍂','💐','🌹','🥀','🌺','🌻','🌽','🌶','🍏','🍎','🍇','🍓','🍒','🍑','🍉','🍈','🍍','🫚','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🥕','🫑','🧅','🧄','🥞','🥩','🥓','🍔','🍟','🌭','🥪','🌮','🌯','🫓','🥚','🍳','🥘','🍲','🥗','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🥮','🍡','🥟','🍩','🍪','🎂','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🥛','🍼','☕','🍵','🧃','🥤','🍺','🍻','🥂','🍷','🥃','🍹','🧉','🍾','🧊','🍴','🥄','🏆','🥇','🥈','🥉','🏅','🎖','🎟','🎫','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🎺','🎻','🪘','🪇','🪈','🎳','🎯','🧩','🕹','🎲','♟','🚗','🚕','🚙','🚌','🚎','🏎','🏍','🛵','🚲','🛺','🚃','🚅','🚄','🚆','🚇','🚂','✈️','🛬','🚁','⛵','🛶','🛳','🚢','🛰','💺','⛺','🎡','🎢','🏯','🏰','🏟','🏠','🏡','🏢','🏣','🏪','🏫','🏥','🏦','🏛','⛪','🕌','🕋','⛩','🪨','🌃','🌠','🎆','🌌','🌄','🏙','🌃','⌚','📲','💻','⌨️','🖱','🖨','📷','📸','🎥','📞','🎙','🎚','🎛','🔋','🔌','💡','🔦','🕯','🪙','💵','💴','💷','💶','💳','💠','⚖️','🧱','🔧','🔨','🪓','🪢','⚙️','🪜','🪝','🗡','🛡','⚱','🧿','📿','🏺','💈','🩺','🩻','🩹','🌡','🧬','🔑','🗝','🚪','🪞','🧼','🚿','🪒','🧻','🛍','🛒','🎈','🎉','🎊','🖼','🪆','🪡','🧶','🧷','🏷','📪','📬','📦','📥','📤','📜','📃','📄','📑','📊','📈','📉','🗓','📅','📂','📁','🗄','⏳','⌛','⏰','🗞','📌','📍','📎','✏','✒','🔏','🔐','💼','🔒','❤️','🧡','🩵','🩶','🩷','💟','💕','💞','💓','💗','💝','💘','💌','🪯'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            try {
                                await this.sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } });
                            } catch (error) {
                                console.error(`[AUTOREACT] Failed in ${from}: ${error.message}`);
                            }
                        }

                        // Link protection for forwarded/shared statuses in groups.
                        const antiStatusLinkMode = botData.antiStatusLinkGroups?.[from];
                        if (isGroup && !isMe && !isStatus && ['delete', 'warn', 'kick'].includes(antiStatusLinkMode)) {
                            const rawMessage = JSON.stringify(msg.message || {});
                            const contextInfo = messageContent?.contextInfo || messageContent?.extendedTextMessage?.contextInfo || messageContent?.imageMessage?.contextInfo || messageContent?.videoMessage?.contextInfo || {};
                            const isForwardedStatus = Boolean(
                                contextInfo.isForwarded || contextInfo.forwardingScore > 0 || contextInfo.forwardedNewsletterMessageInfo ||
                                rawMessage.includes('status@broadcast') || rawMessage.includes('newsletter') || rawMessage.includes('forwardingScore') || rawMessage.includes('isForwarded')
                            );
                            const isViewOnce = Boolean(messageContent?.viewOnceMessage || messageContent?.viewOnceMessageV2 || messageContent?.viewOnceMessageV2Extension);
                            const isStatusLike = isForwardedStatus || isViewOnce;
                            const sharedContent = `${text || ''} ${rawMessage}`;
                            if (isStatusLike && SHARED_STATUS_LINK_PATTERN.test(sharedContent)) {
                                try {
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (antiStatusLinkMode === 'warn') {
                                        await this.sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]}, links in shared/forwarded statuses are not allowed. Your message was deleted.`, mentions: [sender] });
                                    } else if (antiStatusLinkMode === 'kick') {
                                        const gMeta = await this.getGroupMetadata(from);
                                        const botJid = jidNormalizedUser(this.sock.user.id);
                                        const botP = gMeta.participants.find(p => jidNormalizedUser(p.id) === botJid);
                                        const botIsAdmin = botP && (botP.admin === 'admin' || botP.admin === 'superadmin');
                                        if (isAdmin || isOwner) {
                                            await this.sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]}, linked status sharing is not allowed. Your message was deleted; admins/owner are not kicked automatically.`, mentions: [sender] });
                                        } else if (botIsAdmin) {
                                            await this.sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} was kicked for sharing a status containing a link.`, mentions: [sender] });
                                            await this.sock.groupParticipantsUpdate(from, [sender], 'remove');
                                        } else {
                                            await this.sock.sendMessage(from, { text: `⚠️ Linked status deleted for @${sender.split('@')[0]}, but I need admin permission to kick.`, mentions: [sender] });
                                        }
                                    }
                                } catch (error) {
                                    console.error(`[ANTISTATUSLINK] ${from}: ${error.message}`);
                                }
                                return;
                            }
                        }
                        // Anti-status in groups
                        if (isGroup && botData.antiStatusGroups && botData.antiStatusGroups[from]) {
                            const mode = botData.antiStatusGroups[from];
                            const isForwarded = (msg.message?.forwardingScore > 0 || messageContent?.contextInfo?.forwardingScore > 0);
                            const containsStatus = JSON.stringify(msg.message).includes('status@broadcast') || JSON.stringify(msg.message).includes('newsletter');
                            const isViewOnce = !!(messageContent?.viewOnceMessage || messageContent?.viewOnceMessageV2 || messageContent?.viewOnceMessageV2Extension);

                            if ((isForwarded || containsStatus || isViewOnce) && !isMe) {
                                if (isAdmin && !isOwner) {
                                    // Skip admins unless owner
                                } else {
                                    try {
                                        await this.sock.sendMessage(from, { delete: msg.key });
                                        if (mode === 'warn') {
                                            await this.sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]}, Status sharing is not allowed!`, mentions: [sender] });
                                        } else if (mode === 'kick') {
                                            const gMeta = await this.getGroupMetadata(from);
                                            const botJid = jidNormalizedUser(this.sock.user.id);
                                            const botP = gMeta.participants.find(p => p.id === botJid);
                                            if (botP && (botP.admin === 'admin' || botP.admin === 'superadmin')) {
                                                await this.sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} kicked for sharing status!`, mentions: [sender] });
                                                await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                            } else {
                                                await this.sock.sendMessage(from, { text: `⚠️ Status shared by @${sender.split('@')[0]}, but I am not admin!`, mentions: [sender] });
                                            }
                                        }
                                        return;
                                    } catch (e) {}
                                }
                            }
                        }


                        // ===== ANTI-STICKER SYSTEM =====
                        // This runs BEFORE any command processing to catch ALL sticker messages
                        if (isGroup && botData.antiStickerGroups && botData.antiStickerGroups[from] && botData.antiStickerGroups[from] !== false && botData.antiStickerGroups[from] !== 'false') {
                            const antiStickerMode = botData.antiStickerGroups[from];
                            
                            // Robust sticker detection - checks EVERY possible way a sticker can arrive
                            let isStickerMsg = false;
                            
                            // Method 1: Check raw msg.message for stickerMessage key at any level
                            if (msg.message) {
                                const rawStr = JSON.stringify(msg.message);
                                if (rawStr.includes('stickerMessage')) isStickerMsg = true;
                            }
                            
                            // Method 2: Check the unwrapped messageContent
                            if (messageContent && messageContent.stickerMessage) isStickerMsg = true;
                            
                            // Method 3: Check if type is stickerMessage
                            if (type === 'stickerMessage') isStickerMsg = true;
                            
                            // Method 4: Check inside ephemeralMessage specifically
                            if (msg.message?.ephemeralMessage?.message?.stickerMessage) isStickerMsg = true;
                            
                            // Method 5: Check inside viewOnceMessage specifically
                            if (msg.message?.viewOnceMessage?.message?.stickerMessage) isStickerMsg = true;
                            
                            // Method 6: Check inside viewOnceMessageV2 specifically
                            if (msg.message?.viewOnceMessageV2?.message?.stickerMessage) isStickerMsg = true;
                            
                            if (isStickerMsg && !isMe) {
                                this.sendLog(`[AntiSticker] Sticker detected in ${from} from ${sender} | Mode: ${antiStickerMode}`, 'info');
                                
                                // Skip if sender is admin (unless they are owner)
                                if (isAdmin && !isOwner) {
                                    this.sendLog(`[AntiSticker] Admin ${sender} sent sticker - skipped (admin exempt)`, 'info');
                                } else {
                                    try {
                                        // Step 1: ALWAYS delete the sticker message
                                        try {
                                            await this.sock.sendMessage(from, { delete: msg.key });
                                            this.sendLog(`[AntiSticker] Deleted sticker from ${sender.split('@')[0]}`, 'info');
                                        } catch (delErr) {
                                            this.sendLog(`[AntiSticker] Delete error: ${delErr.message}`, 'error');
                                        }

                                        // Step 2: Take action based on mode
                                        if (antiStickerMode === 'warn') {
                                            try {
                                                await this.sock.sendMessage(from, { 
                                                    text: `⚠️ *ANTI-STICKER ALERT*\n\n@${sender.split('@')[0]} Stickers are NOT allowed in this group!\n_Your sticker has been deleted._\n_Next time you will be kicked._`, 
                                                    mentions: [sender] 
                                                });
                                                this.sendLog(`[AntiSticker] Warned ${sender.split('@')[0]}`, 'info');
                                            } catch (warnErr) {
                                                this.sendLog(`[AntiSticker] Warn error: ${warnErr.message}`, 'error');
                                            }
                                        } else if (antiStickerMode === 'kick') {
                                            try {
                                                const gMeta = await this.getGroupMetadata(from);
                                                const botJid = jidNormalizedUser(this.sock.user.id);
                                                const botIsAdmin = gMeta.participants.find(p => p.id === botJid);
                                                
                                                if (botIsAdmin && (botIsAdmin.admin === 'admin' || botIsAdmin.admin === 'superadmin')) {
                                                    try {
                                                        await this.sock.sendMessage(from, { 
                                                            text: `🚫 *ANTI-STICKER - KICKED*\n\n@${sender.split('@')[0]} has been kicked for sharing sticker!`, 
                                                            mentions: [sender] 
                                                        });
                                                        await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                                        this.sendLog(`[AntiSticker] Kicked ${sender.split('@')[0]}`, 'info');
                                                    } catch (kickErr) {
                                                        this.sendLog(`[AntiSticker] Kick execution error: ${kickErr.message}`, 'error');
                                                    }
                                                } else {
                                                    try {
                                                        await this.sock.sendMessage(from, { 
                                                            text: `⚠️ @${sender.split('@')[0]} shared a sticker! I need admin role to kick.`, 
                                                            mentions: [sender] 
                                                        });
                                                    } catch (notifErr) {}
                                                }
                                            } catch (metaErr) {
                                                this.sendLog(`[AntiSticker] Group metadata error: ${metaErr.message}`, 'error');
                                            }
                                        } else if (antiStickerMode === 'delete') {
                                            // Already deleted above, no extra action needed
                                            this.sendLog(`[AntiSticker] Sticker deleted (delete mode)`, 'info');
                                        }
                                    } catch (e) {
                                        this.sendLog(`[AntiSticker] Critical error: ${e.message}`, 'error');
                                    }
                                    return; // Stop processing this message further
                                }
                            }
                        }
                        // ===== END ANTI-STICKER SYSTEM =====
                        
                        // ===== ANTI-MEDIA SYSTEM (VOICE, IMAGE, VIDEO) =====
                        if (isGroup && !isMe && (!isAdmin || isOwner)) {
                            let mediaAction = null;
                            let mediaType = null;
                            let mediaLabel = "";

                            // 1. Check Voice/Audio
                            if (botData.antiVoiceGroups && botData.antiVoiceGroups[from]) {
                                if (type === 'audioMessage') {
                                    mediaAction = botData.antiVoiceGroups[from];
                                    mediaType = 'voice note';
                                    mediaLabel = 'AntiVoice';
                                }
                            }

                            // 2. Check Image
                            if (!mediaAction && botData.antiImageGroups && botData.antiImageGroups[from]) {
                                if (type === 'imageMessage') {
                                    mediaAction = botData.antiImageGroups[from];
                                    mediaType = 'image';
                                    mediaLabel = 'AntiImage';
                                }
                            }

                            // 3. Check Video
                            if (!mediaAction && botData.antiVideoGroups && botData.antiVideoGroups[from]) {
                                if (type === 'videoMessage') {
                                    mediaAction = botData.antiVideoGroups[from];
                                    mediaType = 'video';
                                    mediaLabel = 'AntiVideo';
                                }
                            }

                            if (mediaAction && mediaAction !== 'false') {
                                // Skip if sender is admin (unless they are owner)
                                if (isAdmin && !isOwner) {
                                    // Skip
                                } else {
                                    try {
                                        this.sendLog(`[${mediaLabel}] ${mediaType} detected in ${from} from ${sender} | Mode: ${mediaAction}`, 'info');
                                        
                                        // Step 1: ALWAYS delete the message
                                        try {
                                            await this.sock.sendMessage(from, { delete: msg.key });
                                        } catch (delErr) {
                                            this.sendLog(`[${mediaLabel}] Delete error: ${delErr.message}`, 'error');
                                        }

                                        // Step 2: Take action based on mode
                                        if (mediaAction === 'warn') {
                                            await this.sock.sendMessage(from, { 
                                                text: `⚠️ *${mediaLabel.toUpperCase()} ALERT*\n\n@${sender.split('@')[0]} ${mediaType.toUpperCase()}S are NOT allowed in this group!\n_Your message has been deleted._\n_Next time you will be kicked._`, 
                                                mentions: [sender] 
                                            });
                                        } else if (mediaAction === 'kick') {
                                            const gMeta = await this.getGroupMetadata(from);
                                            const botJid = jidNormalizedUser(this.sock.user.id);
                                            const botIsAdmin = gMeta.participants.find(p => p.id === botJid);
                                            
                                            if (botIsAdmin && (botIsAdmin.admin === 'admin' || botIsAdmin.admin === 'superadmin')) {
                                                await this.sock.sendMessage(from, { 
                                                    text: `🚫 *${mediaLabel.toUpperCase()} - KICKED*\n\n@${sender.split('@')[0]} has been kicked for sharing ${mediaType}!`, 
                                                    mentions: [sender] 
                                                });
                                                await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                            } else {
                                                await this.sock.sendMessage(from, { 
                                                    text: `⚠️ @${sender.split('@')[0]} shared a ${mediaType}! I need admin role to kick.`, 
                                                    mentions: [sender] 
                                                });
                                            }
                                        }
                                        return; // Stop processing this message
                                    } catch (e) {
                                        this.sendLog(`[${mediaLabel}] Critical error: ${e.message}`, 'error');
                                    }
                                }
                            }
                        }
                        // ===== END ANTI-MEDIA SYSTEM =====

                        // ===== ANTI-BOT SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiBotGroups && botData.antiBotGroups[from] && botData.antiBotGroups[from] !== 'off') {
                            try {
                                const pNum = sender.split('@')[0];
                                const messageText = String(text || '').trim();
                                const isPingPongBotMessage = /\b(?:ping|pong)\b/i.test(messageText);
                                const isCustomBotKeywordMessage = /\b(?:robot|automated|auto-reply|autoreply|uptime|latency)\b|\b(?:status\s+bot|bot\s+status|check\s+bot|bot\s+check|response\s+time|bot\s+online|online\s+bot|bot\s+alive|alive\s+bot|robot\s+online)\b/i.test(messageText);
                                const isBotPingMessage = isPingPongBotMessage || isCustomBotKeywordMessage;
                                const isBotLike = isBotPingMessage || (pNum.length > 15) || /[A-Za-z_-]/.test(pNum) || /bot|selenium|puppeteer|automation|whatsmeow/i.test(msg.pushName || '');
                                if (isBotLike) {
                                    const antiBotMode = botData.antiBotGroups[from];
                                    try {
                                        await this.sock.sendMessage(from, { delete: msg.key });
                                    } catch (delErr) { this.sendLog(`[ANTIBOT] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    if (isBotPingMessage) {
                                        try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIBOT] Bot-ping kick failed: ${kickErr.message}`, 'error'); }
                                    } else if (antiBotMode === 'kick' || antiBotMode === 'warn') {
                                        try { await this.sock.sendMessage(from, { text: `🤖 @${pNum} is not allowed here (other bots are restricted).`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIBOT] Warning failed: ${warnErr.message}`, 'error'); }
                                        if (antiBotMode === 'kick') {
                                            try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIBOT] Kick failed: ${kickErr.message}`, 'error'); }
                                        }
                                    } else {
                                        try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIBOT] Kick failed: ${kickErr.message}`, 'error'); }
                                    }
                                    return;
                                }
                            } catch (antiBotErr) { this.sendLog(`[ANTIBOT] Check failed: ${antiBotErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-BOT SYSTEM =====
                        // ===== ANTI-EDIT SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiEditGroups && botData.antiEditGroups[from] && botData.antiEditGroups[from] !== 'off') {
                            try {
                                const stored = messageLogs[msg.key.id];
                                if (stored && stored.text !== text && text) {
                                    const antiEditMode = botData.antiEditGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTIEDIT] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    if (antiEditMode === 'warn' || antiEditMode === 'kick') {
                                        try { await this.sock.sendMessage(from, { text: `✏️ @${sender.split('@')[0]}, editing messages is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIEDIT] Warning failed: ${warnErr.message}`, 'error'); }
                                        if (antiEditMode === 'kick') {
                                            try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIEDIT] Kick failed: ${kickErr.message}`, 'error'); }
                                        }
                                    } else {
                                        try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIEDIT] Kick failed: ${kickErr.message}`, 'error'); }
                                    }
                                    return;
                                }
                            } catch (antiEditErr) { this.sendLog(`[ANTIEDIT] Check failed: ${antiEditErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-EDIT SYSTEM =====
                        // ===== ANTI-GIF SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiGifGroups && botData.antiGifGroups[from] && botData.antiGifGroups[from] !== 'off') {
                            try {
                                const isGif = type === 'videoMessage' && Boolean(messageContent.videoMessage?.gifPlayback);
                                if (isGif) {
                                    const gifMode = botData.antiGifGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTIGIF] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    if (gifMode === 'warn' || gifMode === 'kick') {
                                        try { await this.sock.sendMessage(from, { text: `🎞️ @${sender.split('@')[0]}, GIFs are not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIGIF] Warning failed: ${warnErr.message}`, 'error'); }
                                        if (gifMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIGIF] Kick failed: ${kickErr.message}`, 'error'); } }
                                    } else {
                                        try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIGIF] Kick failed: ${kickErr.message}`, 'error'); }
                                    }
                                    return;
                                }
                            } catch (antiGifErr) { this.sendLog(`[ANTIGIF] Check failed: ${antiGifErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-GIF SYSTEM =====
                        // ===== ANTI-FORWARD SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiForwardGroups && botData.antiForwardGroups[from] && botData.antiForwardGroups[from] !== 'off') {
                            try {
                                const ctx = messageContent.conversation ? undefined : messageContent.extendedTextMessage?.contextInfo;
                                const isForwarded = Boolean((ctx || msg.message?.extendedTextMessage?.contextInfo)?.forwardingScore || (ctx || msg.message?.extendedTextMessage?.contextInfo)?.isForwarded);
                                if (isForwarded) {
                                    const fwdMode = botData.antiForwardGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTIFORWARD] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    if (fwdMode === 'warn' || fwdMode === 'kick') {
                                        try { await this.sock.sendMessage(from, { text: `↗️ @${sender.split('@')[0]}, forwarded messages are not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIFORWARD] Warning failed: ${warnErr.message}`, 'error'); }
                                        if (fwdMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIFORWARD] Kick failed: ${kickErr.message}`, 'error'); } }
                                    } else {
                                        try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIFORWARD] Kick failed: ${kickErr.message}`, 'error'); }
                                    }
                                    return;
                                }
                            } catch (antiForwardErr) { this.sendLog(`[ANTIFORWARD] Check failed: ${antiForwardErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-FORWARD SYSTEM =====
                        // ===== ANTI-REACTION SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && type === 'reactionMessage' && botData.antiReactionGroups && botData.antiReactionGroups[from] && botData.antiReactionGroups[from] !== 'off') {
                            try {
                                const reaction = messageContent.reactionMessage || {};
                                const reactKey = reaction.key || {};
                                const reactSender = reactKey.participant || msg.key.participant || sender;
                                const reactSenderClean = reactSender.split('@')[0];
                                const reactMode = botData.antiReactionGroups[from];
                                try { await this.sock.sendMessage(from, { text: `😶 @${reactSenderClean}, reactions are not allowed in this group.`, mentions: [reactSender] }); } catch (warnErr) { this.sendLog(`[ANTIREACTION] Warning failed: ${warnErr.message}`, 'error'); }
                                if (reactMode === 'kick') {
                                    try { await this.sock.groupParticipantsUpdate(from, [reactSender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIREACTION] Kick failed: ${kickErr.message}`, 'error'); }
                                }
                                return;
                            } catch (antiReactErr) { this.sendLog(`[ANTIREACTION] Check failed: ${antiReactErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-REACTION SYSTEM =====
                        // ===== ANTI-POLL SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiPollGroups && botData.antiPollGroups[from] && botData.antiPollGroups[from] !== 'off') {
                            try {
                                if (messageContent.pollCreationMessage || messageContent.pollCreationMessageV2 || messageContent.pollCreationMessageV3) {
                                    const pollMode = botData.antiPollGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTIPOLL] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    try { await this.sock.sendMessage(from, { text: `📊 @${sender.split('@')[0]}, polls are not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIPOLL] Warning failed: ${warnErr.message}`, 'error'); }
                                    if (pollMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIPOLL] Kick failed: ${kickErr.message}`, 'error'); } }
                                    return;
                                }
                            } catch (antiPollErr) { this.sendLog(`[ANTIPOLL] Check failed: ${antiPollErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-POLL SYSTEM =====
                        // ===== ANTI-LOCATION SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiLocationGroups && botData.antiLocationGroups[from] && botData.antiLocationGroups[from] !== 'off') {
                            try {
                                if (messageContent.locationMessage || messageContent.liveLocationMessage) {
                                    const locMode = botData.antiLocationGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTILOCATION] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    try { await this.sock.sendMessage(from, { text: `📍 @${sender.split('@')[0]}, sharing location is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTILOCATION] Warning failed: ${warnErr.message}`, 'error'); }
                                    if (locMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTILOCATION] Kick failed: ${kickErr.message}`, 'error'); } }
                                    return;
                                }
                            } catch (antiLocErr) { this.sendLog(`[ANTILOCATION] Check failed: ${antiLocErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-LOCATION SYSTEM =====
                        // ===== ANTI-DOCUMENT SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiDocumentGroups && botData.antiDocumentGroups[from] && botData.antiDocumentGroups[from] !== 'off') {
                            try {
                                if (messageContent.documentMessage) {
                                    const docMode = botData.antiDocumentGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTIDOCUMENT] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    try { await this.sock.sendMessage(from, { text: `📄 @${sender.split('@')[0]}, sharing document files is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIDOCUMENT] Warning failed: ${warnErr.message}`, 'error'); }
                                    if (docMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIDOCUMENT] Kick failed: ${kickErr.message}`, 'error'); } }
                                    return;
                                }
                            } catch (antiDocErr) { this.sendLog(`[ANTIDOCUMENT] Check failed: ${antiDocErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-DOCUMENT SYSTEM =====
                        // ===== ANTI-CONTACT SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiContactGroups && botData.antiContactGroups[from] && botData.antiContactGroups[from] !== 'off') {
                            try {
                                if (messageContent.contactMessage) {
                                    const contactMode = botData.antiContactGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTICONTACT] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    try { await this.sock.sendMessage(from, { text: `📇 @${sender.split('@')[0]}, sharing contacts is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTICONTACT] Warning failed: ${warnErr.message}`, 'error'); }
                                    if (contactMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTICONTACT] Kick failed: ${kickErr.message}`, 'error'); } }
                                    return;
                                }
                            } catch (antiContactErr) { this.sendLog(`[ANTICONTACT] Check failed: ${antiContactErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-CONTACT SYSTEM =====
                        // ===== ANTI-CHANNEL-POST SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiChannelPostGroups && botData.antiChannelPostGroups[from] && botData.antiChannelPostGroups[from] !== 'off') {
                            try {
                                const proto = msg.message;
                                if (proto && proto.extendedTextMessage && proto.extendedTextMessage.contextInfo) {
                                    const ci = proto.extendedTextMessage.contextInfo;
                                    if (typeof ci.remoteJid === 'string' && ci.remoteJid.endsWith('@newsletter')) {
                                        const channelMode = botData.antiChannelPostGroups[from];
                                        try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTICHANNELPOST] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                        try { await this.sock.sendMessage(from, { text: `📢 @${sender.split('@')[0]}, channel posts are not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTICHANNELPOST] Warning failed: ${warnErr.message}`, 'error'); }
                                        if (channelMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTICHANNELPOST] Kick failed: ${kickErr.message}`, 'error'); } }
                                        return;
                                    }
                                }
                            } catch (antiChannelErr) { this.sendLog(`[ANTICHANNELPOST] Check failed: ${antiChannelErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-CHANNEL-POST SYSTEM =====
                        // ===== ANTI-VIEW-ONCE SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiViewOnceGroups && botData.antiViewOnceGroups[from] && botData.antiViewOnceGroups[from] !== 'off') {
                            try {
                                const wrapped = messageContent.viewOnceMessage || messageContent.viewOnceMessageV2;
                                const logged = messageLogs[msg.key.id];
                                const isViewOnce = Boolean(wrapped || wrapped?.viewOnceImageMessage || wrapped?.viewOnceVideoMessage || logged?.isViewOnce);
                                if (isViewOnce) {
                                    const voMode = botData.antiViewOnceGroups[from];
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTIVIEWONCE] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    try { await this.sock.sendMessage(from, { text: `👁️ @${sender.split('@')[0]}, view-once media is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTIVIEWONCE] Warning failed: ${warnErr.message}`, 'error'); }
                                    if (voMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTIVIEWONCE] Kick failed: ${kickErr.message}`, 'error'); } }
                                    return;
                                }
                            } catch (antiViewOnceErr) { this.sendLog(`[ANTIVIEWONCE] Check failed: ${antiViewOnceErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-VIEW-ONCE SYSTEM =====
                        // ===== ANTI-MASS-TAG SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiTagGroups && botData.antiTagGroups[from] && botData.antiTagGroups[from] !== 'off') {
                            try {
                                const taggedMembers = chatbotMentionedJids(msg).filter(Boolean);
                                const tagMode = botData.antiTagGroups[from];
                                console.log(`[ANTITAG] Mode: ${tagMode}, mentions in message: ${taggedMembers.length}`);
                                if (taggedMembers.length > 5) {
                                    try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTITAG] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                    try { await this.sock.sendMessage(from, { text: `📢 @${sender.split('@')[0]}, mass tagging members is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTITAG] Warning failed: ${warnErr.message}`, 'error'); }
                                    if (tagMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTITAG] Kick failed: ${kickErr.message}`, 'error'); } }
                                    return;
                                } else if (taggedMembers.length > 0) {
                                    // Diagnostic: antitag is enabled but this message has 5 or fewer mentions
                                    console.log(`[ANTITAG] Message has ${taggedMembers.length} mention(s), threshold is >5 — no action taken`);
                                }
                            } catch (antiTagErr) { this.sendLog(`[ANTITAG] Check failed: ${antiTagErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-MASS-TAG SYSTEM =====
                        // ===== ANTI-TAG-ADMIN SYSTEM =====
                        if (isGroup && !isMe && !isStatus && !isAdmin && botData.antiTagAdminGroups && botData.antiTagAdminGroups[from] && botData.antiTagAdminGroups[from] !== 'off') {
                            try {
                                const taggedJids = chatbotMentionedJids(msg).filter(Boolean);
                                if (taggedJids.length > 0) {
                                    let isAdminTagged = false;
                                    try {
                                        const meta = await this.sock.groupMetadata(from);
                                        if (Array.isArray(meta.participants)) {
                                            const adminSet = new Set(meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id));
                                            const metaText = String(messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.ephemeralMessage?.message?.extendedTextMessage?.text || '');
                                            isAdminTagged = taggedJids.some(jid => adminSet.has(jid)) || (typeof isAdminTagged === 'boolean' && /[aA]dmin/.test(metaText));
                                        }
                                    } catch (metaErr) { this.sendLog(`[ANTITAGADMIN] Metadata fetch failed: ${metaErr.message}`, 'error'); }
                                    if (isAdminTagged) {
                                        const ataMode = botData.antiTagAdminGroups[from];
                                        try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (delErr) { this.sendLog(`[ANTITAGADMIN] Delete failed in ${from}: ${delErr.message}`, 'error'); }
                                        try { await this.sock.sendMessage(from, { text: `🔖 @${sender.split('@')[0]}, tagging admins is not allowed in this group.`, mentions: [sender] }, { quoted: msg }); } catch (warnErr) { this.sendLog(`[ANTITAGADMIN] Warning failed: ${warnErr.message}`, 'error'); }
                                        if (ataMode === 'kick') { try { await this.sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (kickErr) { this.sendLog(`[ANTITAGADMIN] Kick failed: ${kickErr.message}`, 'error'); } }
                                        return;
                                    }
                                }
                            } catch (antiTagAdminErr) { this.sendLog(`[ANTITAGADMIN] Check failed: ${antiTagAdminErr.message}`, 'error'); }
                        }
                        // ===== END ANTI-TAG-ADMIN SYSTEM =====
                        // Antilink
                        if (isGroup && botData.antilinkGroups[from] && !isAdmin) {
                            const linkPatterns = [/chat.whatsapp.com\//i, /http:\/\//i, /https:\/\//i, /www\./i, /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i];
                            if (linkPatterns.some(pattern => pattern.test(text))) {
                                try {
                                    const mode = botData.antilinkGroups[from];
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (mode === 'kick') await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                } catch (e) {}
                                return;
                            }
                        }

                        // Ghost mode - only restrict if enabled and NOT owner/session user
                        if (this.ghostMode && !isOwner && !isSessionUser) {
                            return;
                        }

                        // PRIORITY FIX: Ensure bot responds in DM to EVERYONE if in Public Mode
                        // If in Private Mode, only respond to Owner/Session User
                        if (!this.isPublic && !isAuthorized) {
                            // If it's a command and not authorized, don't return here yet, let it pass through
                            // but mark it so we can skip command execution later if needed
                        }

                        // Process commands. Group commands are available only where this bot is an admin.
                        if (text.toLowerCase().startsWith(settings.prefix)) {
                            const cmd = text.toLowerCase();
                            const args = text.split(' ').slice(1);
                            const q = args.join(' ');
                            const option = q.trim().toLowerCase();
                            const commandName = cmd.slice(settings.prefix.length).split(' ')[0];
                            const groupMenuEntries = buildCommandCategories(commands)['👥 GROUP'] || [];
                            const downloadMenuEntries = buildCommandCategories(commands)['⬇️ DOWNLOAD'] || [];
                            const toolsMenuEntries = buildCommandCategories(commands)['🛠️ TOOLS'] || [];
                            const funMenuEntries = buildCommandCategories(commands)['🎉 FUN'] || [];
                            const islamicMenuEntries = buildCommandCategories(commands)['🕌 ISLAMIC'] || [];
                            const animeMenuEntries = buildCommandCategories(commands)['🎌 ANIME'] || [];
                            const reactionsMenuEntries = buildCommandCategories(commands)['ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ'] || [];
                            const audioMenuEntries = buildCommandCategories(commands)['🔊 AUDIO COMMANDS'] || [];
                            const multisessionMenuEntries = buildCommandCategories(commands)['🔗 MULTISESSION COMMANDS'] || [];
                            const miscMenuEntries = buildCommandCategories(commands)['🎯 MISC'] || [];
                            const ephoto360MenuEntries = buildCommandCategories(commands)['🎬 EPHOTO360'] || [];
                            const newOtherMenuEntries = buildCommandCategories(commands)['🧩 NEW / OTHER'] || [];
                            const isGroupMenuCommand = groupMenuEntries.some(entry => entry.name === commandName);
                            const isDownloadMenuCommand = downloadMenuEntries.some(entry => entry.name === commandName);
                            const isToolsMenuCommand = toolsMenuEntries.some(entry => entry.name === commandName);
                            const isFunMenuCommand = funMenuEntries.some(entry => entry.name === commandName);
                            const isIslamicMenuCommand = islamicMenuEntries.some(entry => entry.name === commandName);
                            const isAnimeMenuCommand = animeMenuEntries.some(entry => entry.name === commandName);
                            const isReactionsMenuCommand = reactionsMenuEntries.some(entry => entry.name === commandName);
                            const isAudioMenuCommand = audioMenuEntries.some(entry => entry.name === commandName);
                            const isMultisessionMenuCommand = multisessionMenuEntries.some(entry => entry.name === commandName);
                            const isMultisessionControl = ['multisessionmenu', 'delsession', 'sessions', 'connect'].includes(commandName);
                            const isMiscMenuCommand = miscMenuEntries.some(entry => entry.name === commandName);
                            const isEphoto360MenuCommand = ephoto360MenuEntries.some(entry => entry.name === commandName);
                            const isNewOtherMenuCommand = newOtherMenuEntries.some(entry => entry.name === commandName);

                            // Private mode stays strict for owner-only and ordinary commands.
                            // The explicit Group Menu is the narrow exception: a verified group
                            // admin may use only its registered group commands in that group.
                            // Download commands are also safe for group participants, but only
                            // when they are listed in the existing Download Menu category.
                            // The same narrow group access applies to listed Tools Menu commands.
                            // Listed Fun Menu commands use the same group-only category access.
                            // Listed Islamic Menu commands use the same group-only category access.
                            // Listed Anime Menu commands use the same group-only category access.
                            // Listed EPHOTO360 Menu commands use the same group-only category access.
                            // Listed NEW / OTHER Menu commands use the same group-only category access.
                            const canUseRequestedCommand = (isMultisessionControl ? isOwner : isAuthorized) ||
                                (isGroup && isAdmin && isGroupMenuCommand) ||
                                (isGroup && isDownloadMenuCommand) ||
                                (isGroup && isToolsMenuCommand) ||
                                (isGroup && isFunMenuCommand) ||
                                (isGroup && isIslamicMenuCommand) ||
                                (isGroup && isAnimeMenuCommand) ||
                                (isGroup && isReactionsMenuCommand) ||
                                (isGroup && isAudioMenuCommand) ||
                                (isGroup && isMultisessionMenuCommand && isOwner) ||
                                (isGroup && isMiscMenuCommand) ||
                                (isGroup && isEphoto360MenuCommand) ||
                                (isGroup && isNewOtherMenuCommand);
                            if (!canUseRequestedCommand) return;
                            // Do not block the paired session owner just because the bot is
                            // not a group admin. Read-only/media commands work in any group;
                            // WhatsApp itself will reject moderation actions that need admin.

                            (async () => {
                                try {
                                    // =================== 120+ COMMAND SWITCH ===================
                                    switch (commandName) {
                                        // ===== MENU =====
                                        case 'menu': {
                                            const customName = botData.userNames[this.userId] || msg.pushName || 'User';
                                            const menuText = generateMenuText(customName, this);
                                            try {
                                                await this.sock.sendMessage(from, { image: { url: settings.startimage }, caption: menuText }, { quoted: msg });
                                                // Send the song.mp3 file if it exists in the root directory
                                                const songPath = path.join(__dirname, 'song.mp3');
                                                if (fs.existsSync(songPath)) {
                                                    const audioBuffer = fs.readFileSync(songPath);
                                                    await this.sock.sendMessage(from, { 
                                                        audio: audioBuffer, 
                                                        mimetype: 'audio/mpeg', 
                                                        fileName: 'song.mp3',
                                                        ptt: false 
                                                    }, { quoted: msg });
                                                }
                                            } catch (e) { 
                                                await this.sock.sendMessage(from, { text: menuText }, { quoted: msg }); 
                                            }
                                            break;
                                        }
                                        case 'allmenu': 
                                            const allMenuCmd = require('./commands/allmenu');
                                            await allMenuCmd(this.sock, from, msg, this, commands); 
                                            break;
                                        case 'ownermenu': {
                                            const text = generateCategoryMenuText('👑 OWNER MENU', '👑 OWNER', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'groupmenu': {
                                            const text = generateCategoryMenuText('👥 GROUP & SECURITY MENU', '👥 GROUP', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'downloadmenu': {
                                            const text = generateCategoryMenuText('⬇️ DOWNLOAD MENU', '⬇️ DOWNLOAD', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'videomenu': {
                                            const text = generateCategoryMenuText('🎥 VIDEO MENU', '🎥 VIDEO', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'audiomenu': {
                                            const text = generateCategoryMenuText('🔊 AUDIO COMMANDS', '🔊 AUDIO COMMANDS', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'multisessionmenu': {
                                            const text = generateCategoryMenuText('🔗 MULTISESSION COMMANDS', '🔗 MULTISESSION COMMANDS', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'aimenu': {
                                            const text = generateCategoryMenuText('🤖 AI COMMANDS MENU', '🤖 AI COMMANDS', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'toolsmenu': {
                                            const text = generateCategoryMenuText('🛠️ TOOLS MENU', '🛠️ TOOLS', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'funmenu': {
                                            const text = generateCategoryMenuText('🎉 FUN MENU', '🎉 FUN', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'animemenu': {
                                            const text = generateCategoryMenuText('🎌 ANIME MENU', '🎌 ANIME', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'reactionsmenu': {
                                            const text = generateCategoryMenuText('ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ', 'ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'logomenu': {
                                            const text = generateCategoryMenuText('🏢 LOGO MENU', '🏢 LOGO', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'textmakermenu': {
                                            const text = generateCategoryMenuText('✏️ TEXT MAKER MENU', '✏️ TEXT MAKER', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'islamicmenu': {
                                            const text = generateCategoryMenuText('🕌 ISLAMIC MENU', '🕌 ISLAMIC', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'miscmenu': {
                                            const text = generateCategoryMenuText('🎯 MISC MENU', '🎯 MISC', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'bugmenu': {
                                            const text = generateCategoryMenuText('🎉 BUG & FUN MENU', '🎉 FUN', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'debug': {
                                            const status = `*\u{1F6E0} DEBUG INFO*\n\n*Prefix:* ${settings.prefix}\n*Group Events:* ${botData.groupEvents[from] || 'off'}\n*Welcome Msg:* ${botData.welcomeMessages[from] ? 'Set' : 'Default'}\n*Bot Version:* ${settings.version}`;
                                            await this.sock.sendMessage(from, { text: status }, { quoted: msg });
                                            break;
                                        }
                                        case 'testwelcome': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." });
                                            const welcomeMsg = botData.welcomeMessages[from] || `Welcome @${sender.split('@')[0]} to this Group!`;
                                            await this.sock.sendMessage(from, { text: `*Test Welcome:*\n\n${welcomeMsg}`, mentions: [sender] });
                                            break;
                                        }
                                        case 'testgoodbye': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." });
                                            const goodbyeMsg = botData.goodbyeMessages[from] || `Goodbye @${sender.split('@')[0]} from this Group!`;
                                            await this.sock.sendMessage(from, { text: `*Test Goodbye:*\n\n${goodbyeMsg}`, mentions: [sender] });
                                            break;
                                        }

                                        // ===== MEDIA & DOWNLOAD =====
                                        case 'song': await commands.song(this.sock, from, msg); break;
                                        case 'play': await commands.play(this.sock, from, msg, q); break;
                                        case 'skip': await commands.skip(this.sock, from, msg); break;
                                        case 'stop': await commands.stop(this.sock, from, msg); break;
                                        case 'pause': await commands.pause(this.sock, from, msg); break;
                                        case 'resume': await commands.resume(this.sock, from, msg); break;
                                        case 'queue': await commands.queue(this.sock, from, msg); break;
                                        case 'volume': await commands.volume(this.sock, from, msg, q); break;
                                        case 'loop': await commands.loop(this.sock, from, msg, q); break;
                                        case 'shuffle': await commands.shuffle(this.sock, from, msg); break;
                                        case 'nowplaying': await commands.nowplaying(this.sock, from, msg); break;
                                        case 'video': await commands.video(this.sock, from, msg); break;
                                        case 'volvideo': await commands.volvideo(this.sock, from, msg, q); break;
                                        case 'tovideo': await commands.tovideo(this.sock, from, msg); break;
                                        case 'toaudio': await commands.toaudio(this.sock, from, msg); break;
                                        case 'earrape': await commands.earrape(this.sock, from, msg); break;
                                        case 'reverse': await commands.reverse(this.sock, from, msg); break;
                                        case 'robot': await commands.robot(this.sock, from, msg); break;
                                        case 'volaudio': await commands.volaudio(this.sock, from, msg, q); break;
                                        case 'toptt': await commands.toptt(this.sock, from, msg); break;
                                        case 'tomp3': case 'mp3': await commands.tomp3(this.sock, from, msg); break;
                                        case 'deep': await commands.deep(this.sock, from, msg); break;
                                        case 'blown': await commands.blown(this.sock, from, msg); break;
                                        case 'bass': await commands.bass(this.sock, from, msg); break;
                                        case 'delsession': await commands.delsession(this.sock, from, msg, q, { sessions, userSockets, botData, settings, saveBotData, currentSessionId: this.userId }); break;
                                        case 'sessions': await commands.sessions(this.sock, from, msg, q, { sessions, botData, currentSessionId: this.userId }); break;
                                        case 'connect': await commands.connect(this.sock, from, msg, q, { sessions, currentSessionId: this.userId }); break;
                                        case 'triggered': await commands.triggered(this.sock, from, msg); break;
                                        case 'passed': await commands.passed(this.sock, from, msg); break;
                                        case 'jail': await commands.jail(this.sock, from, msg); break;
                                        case 'glass': await commands.glass(this.sock, from, msg); break;
                                        case 'gay': await commands.gay(this.sock, from, msg); break;
                                        case 'comrade': await commands.comrade(this.sock, from, msg); break;
                                        case 'ytcomment': await commands.ytcomment(this.sock, from, msg, q); break;
                                        case 'oogway': await commands.oogway(this.sock, from, msg, q); break;
                                        case 'namecard': await commands.namecard(this.sock, from, msg, q); break;
                                        case 'its-so-stupid': await commands['its-so-stupid'](this.sock, from, msg); break;
                                        case 'lgbt': await commands.lgbt(this.sock, from, msg); break;
                                        case 'circle': await commands.circle(this.sock, from, msg); break;
                                        case 'horny': await commands.horny(this.sock, from, msg); break;
                                        case 'heart': await commands.heart(this.sock, from, msg); break;
                                        case 'insta': case 'ig': await commands.insta(this.sock, from, msg, q); break;
                                        case 'tiktok': case 'tt': await commands.tiktok(this.sock, from, msg, q); break;
                                        case 'facebook': case 'fb': await commands.facebook(this.sock, from, msg); break;
                                        case 'youtube': case 'yt': await commands.youtube(this.sock, from, msg, q); break;
                                        case 'pinterest': case 'pin': await commands.pinterest(this.sock, from, msg, q); break;
                                        case 'twitter': case 'x': case 'twit': await commands.twitter(this.sock, from, msg, q); break;
                                        case 'reddit': await commands.reddit(this.sock, from, msg, q); break;
                                        case 'spotify': case 'spot': await commands.spotify(this.sock, from, msg, q); break;
                                        case 'mf': await commands.mf(this.sock, from, msg, q); break;
                                        case 'mediafire': await commands.mediafire(this.sock, from, msg, q); break;
                                        case 'ytmp3': await commands.ytmp3(this.sock, from, msg, q); break;
                                        case 'ytmp3doc': await commands.ytmp3doc(this.sock, from, msg, q); break;
                                        case 'song2': await commands.song2(this.sock, from, msg, q); break;
                                        case 'itunes': await commands.itunes(this.sock, from, msg, q); break;

                                        // ===== EPHOTO360 =====
                                        case 'cartoonstyle': await commands.cartoonstyle(this.sock, from, msg, q); break;
                                        case 'blackpinkstyle': await commands.blackpinkstyle(this.sock, from, msg, q); break;
                                        case 'blackpinklogo': await commands.blackpinklogo(this.sock, from, msg, q); break;
                                        case 'advancedglow': await commands.advancedglow(this.sock, from, msg, q); break;
                                        case '1917style': await commands['1917style'](this.sock, from, msg, q); break;
                                        case 'flagtext': await commands.flagtext(this.sock, from, msg, q); break;
                                        case 'flag3dtext': await commands.flag3dtext(this.sock, from, msg, q); break;
                                        case 'effectclouds': await commands.effectclouds(this.sock, from, msg, q); break;
                                        case 'dragonball': await commands.dragonball(this.sock, from, msg, q); break;
                                        case 'gradienttext': await commands.gradienttext(this.sock, from, msg, q); break;
                                        case 'glowingtext': await commands.glowingtext(this.sock, from, msg, q); break;
                                        case 'glitchtext': await commands.glitchtext(this.sock, from, msg, q); break;
                                        case 'galaxywallpaper': await commands.galaxywallpaper(this.sock, from, msg, q); break;
                                        case 'freecreate': await commands.freecreate(this.sock, from, msg, q); break;
                                        case 'galaxystyle': await commands.galaxystyle(this.sock, from, msg, q); break;
                                        case 'makingneon': await commands.makingneon(this.sock, from, msg, q); break;
                                        case 'luxurygold': await commands.luxurygold(this.sock, from, msg, q); break;
                                        case 'logomaker': await commands.logomaker(this.sock, from, msg, q); break;
                                        case 'lighteffects': await commands.lighteffects(this.sock, from, msg, q); break;
                                        case 'incandescent': await commands.incandescent(this.sock, from, msg, q); break;
                                        case 'graffiti': await commands.graffiti(this.sock, from, msg, q); break;
                                        case 'writetext': await commands.writetext(this.sock, from, msg, q); break;
                                        case 'watercolortext': await commands.watercolortext(this.sock, from, msg, q); break;
                                        case 'typography': await commands.typography(this.sock, from, msg, q); break;
                                        case 'topography': await commands.topography(this.sock, from, msg, q); break;
                                        case 'summerbeach': await commands.summerbeach(this.sock, from, msg, q); break;
                                        case 'ephoto360menu': {
                                            const text = generateCategoryMenuText('🎬 EPHOTO360 MENU', '🎬 EPHOTO360', commands);
                                            await this.sock.sendMessage(from, { text }, { quoted: msg });
                                            break;
                                        }
                                        case 'gdrive': await commands.gdrive(this.sock, from, msg, q); break;
                                        case 'apk': await commands.apk(this.sock, from, msg); break;

                                        // ===== GROUP MANAGEMENT =====
                                        case 'kick': await commands.kick(this.sock, from, msg, true); break;
                                        case 'add': await commands.add(this.sock, from, msg, true, q); break;
                                        case 'promote': await commands.promote(this.sock, from, msg, true); break;
                                        case 'demote': await commands.demote(this.sock, from, msg, true); break;
                                        case 'revoke': await commands.revoke(this.sock, from, msg, true); break;
                                        case 'invite': await commands.invite(this.sock, from, msg, true); break;
                                        case 'grouplink': case 'gclink': await commands.grouplink(this.sock, from, msg, true); break;
                                        case 'mute': await commands.mute(this.sock, from, msg, true); break;
                                        case 'unmute': await commands.unmute(this.sock, from, msg, true); break;
                                        case 'join': await commands.join(this.sock, from, msg, q); break;
                                        case 'leave': await commands.leave(this.sock, from, msg, true); break;
                                        case 'setdesc': await commands.setdesc(this.sock, from, msg, true, q); break;
                                        case 'setppgc':
                                        case 'setppgroup': await commands.setppgc(this.sock, from, msg, true); break;
                                        case 'delppgroup': await commands.delppgroup(this.sock, from, msg, true); break;
                                        case 'getbio': await commands.getbio(this.sock, from, msg, q); break;
                                        case 'getdp': await commands.getdp(this.sock, from, msg, q); break;
                                        case 'tagadmin': await commands.tagadmin(this.sock, from, msg, isAdmin); break;
                                        case 'kickoffline': await commands.kickoffline(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'hidetag': await commands.hidetag(this.sock, from, msg, true, q); break;
                                        case 'tagall': await commands.tagall(this.sock, from, msg, true, q); break;
                                        case 'groupinfo': case 'ginfo': await commands.groupinfo(this.sock, from, msg); break;
                                        case 'kickall': await commands.kickall(this.sock, from, msg, true); break;
                                        case 'accept': await commands.accept(this.sock, from, msg, true); break;
                                        case 'poll': await commands.poll(this.sock, from, msg, q); break;
                                        case 'antimessage': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: '❌ This command is for groups only.' }, { quoted: msg });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
                                            if (option === 'on') {
                                                botData.antiMessageGroups[from] = 'on';
                                                Object.keys(botData.antiMessageWarnings).filter(key => key.startsWith(`${from}:`)).forEach(key => delete botData.antiMessageWarnings[key]);
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: '🔒 Anti-message enabled. Only the bot can send messages. Every other message will be deleted, warned, and repeated violations may be removed.' }, { quoted: msg });
                                            } else if (option === 'off') {
                                                botData.antiMessageGroups[from] = 'off';
                                                Object.keys(botData.antiMessageWarnings).filter(key => key.startsWith(`${from}:`)).forEach(key => delete botData.antiMessageWarnings[key]);
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: '✅ Anti-message disabled. Members can send messages again.' }, { quoted: msg });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage: ${settings.prefix}antimessage on/off\n\nAfter 3 violations, the bot will try to remove the sender.` }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'antibadword': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: '❌ This command is for groups only.' }, { quoted: msg });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
                                            const badwordMode = String(args[0] || '').toLowerCase() === 'kick' && String(args[1] || '').toLowerCase() === 'on' ? 'kick' : String(args[0] || '').toLowerCase();
                                            if (['delete', 'warn', 'kick'].includes(badwordMode)) {
                                                botData.antiBadwordGroups[from] = badwordMode;
                                                saveBotData();
                                                const description = badwordMode === 'delete' ? 'bad-word messages will be deleted.' : badwordMode === 'warn' ? 'bad-word messages will be deleted and the sender will be warned.' : 'bad-word messages will be deleted, warned, and non-admin senders will be kicked.';
                                                await this.sock.sendMessage(from, { text: `✅ Anti-badword ${badwordMode.toUpperCase()} enabled: ${description}` }, { quoted: msg });
                                            } else if (badwordMode === 'off') {
                                                botData.antiBadwordGroups[from] = 'off';
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: '✅ Anti-badword disabled.' }, { quoted: msg });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage:\n${settings.prefix}antibadword delete\n${settings.prefix}antibadword warn\n${settings.prefix}antibadword kick\n${settings.prefix}antibadword off` }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'autoreact': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." }, { quoted: msg });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });
                                            if (option === 'on') {
                                                botData.autoReactGroups[from] = 'on';
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: "✅ Auto-react enabled. Bot will react to everyone except itself." }, { quoted: msg });
                                            } else if (option === 'off') {
                                                botData.autoReactGroups[from] = 'off';
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: "✅ Auto-react disabled." }, { quoted: msg });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage: ${settings.prefix}autoreact on/off` }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'welcome': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: "❌ Only admins can use this." });
                                            if (option === 'on') {
                                                botData.welcomeEnabled[from] = true;
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: "✅ Welcome messages enabled!" });
                                            } else if (option === 'off') {
                                                botData.welcomeEnabled[from] = false;
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: "✅ Welcome messages disabled!" });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage: ${settings.prefix}welcome on/off` });
                                            }
                                            break;
                                        }
                                        case 'setwelcome': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: "❌ Only admins can use this." });
                                            if (!q) return this.sock.sendMessage(from, { text: "❌ Provide a welcome message." });
                                            botData.welcomeMessages[from] = q;
                                            saveBotData();
                                            await this.sock.sendMessage(from, { text: "✅ Welcome message updated!" });
                                            break;
                                        }
                                        case 'goodbye': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: "❌ Only admins can use this." });
                                            if (option === 'on') {
                                                botData.goodbyeEnabled[from] = true;
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: "✅ Goodbye messages enabled!" });
                                            } else if (option === 'off') {
                                                botData.goodbyeEnabled[from] = false;
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: "✅ Goodbye messages disabled!" });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage: ${settings.prefix}goodbye on/off` });
                                            }
                                            break;
                                        }
                                        case 'setgoodbye': {
                                            if (!isGroup) return this.sock.sendMessage(from, { text: "❌ This command is for groups only." });
                                            if (!isAdmin) return this.sock.sendMessage(from, { text: "❌ Only admins can use this." });
                                            if (!q) return this.sock.sendMessage(from, { text: "❌ Provide a goodbye message." });
                                            botData.goodbyeMessages[from] = q;
                                            saveBotData();
                                            await this.sock.sendMessage(from, { text: "✅ Goodbye message updated!" });
                                            break;
                                        }
                                        case 'everyonemsg': await commands.everyonemsg(this.sock, from, msg, true, q); break;
                                        case 'listonline': await commands.listonline(this.sock, from, msg); break;
                                        case 'listoffline': await commands.listoffline(this.sock, from, msg); break;
                                        case 'opentime': await commands.opentime(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'vcf': await commands.vcf(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'userid': await commands.userid(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'totalmembers': await commands.totalmembers(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'listinactive': await commands.listinactive(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'listrequests': await commands.listrequests(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'allow': await commands.allow(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'announcements': await commands.announcements(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'addcode': await commands.addcode(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'delcode': await commands.delcode(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'delallowed': await commands.delallowed(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antiprotection': await commands.antiprotection(this.sock, from, msg, isAdmin, botData); break;

                                        // ===== ADMIN / OWNER =====
                                        case 'private': 
                                            if (!isOwner && !isSessionUser && !isMe) return this.sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
                                            await commands.private(this.sock, from, msg, true, this); 
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = false;
                                            saveBotData();
                                            break;
                                        case 'public': 
                                            if (!isOwner && !isSessionUser && !isMe) return this.sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
                                            await commands.public(this.sock, from, msg, true, this); 
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = true;
                                            saveBotData();
                                            break;
                                        case 'alwaysonline': {
                                            if (!isOwner && !isSessionUser && !isMe) return this.sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            if (option === 'on') {
                                                botData.statusSettings[this.userId].alwaysOnline = true;
                                                saveBotData();
                                                this.startPresenceKeepAlive();
                                                await this.sock.sendMessage(from, { text: '✅ Always-online enabled. The bot will show available while connected.' }, { quoted: msg });
                                            } else if (option === 'off') {
                                                botData.statusSettings[this.userId].alwaysOnline = false;
                                                saveBotData();
                                                this.stopPresenceKeepAlive();
                                                await this.sock.sendMessage(from, { text: '✅ Always-online disabled.' }, { quoted: msg });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage: ${settings.prefix}alwaysonline on/off` }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'autotyping':
                                        case 'autorecording': {
                                            if (!isOwner && !isSessionUser && !isMe) return this.sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            const modeKey = commandName === 'autorecording' ? 'autoRecording' : 'autoTyping';
                                            const otherKey = commandName === 'autorecording' ? 'autoTyping' : 'autoRecording';
                                            if (option === 'on') {
                                                botData.statusSettings[this.userId][modeKey] = true;
                                                botData.statusSettings[this.userId][otherKey] = false;
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: `✅ ${commandName === 'autorecording' ? 'Auto-recording' : 'Auto-typing'} enabled for incoming group and private messages.` }, { quoted: msg });
                                            } else if (option === 'off') {
                                                botData.statusSettings[this.userId][modeKey] = false;
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: `✅ ${commandName === 'autorecording' ? 'Auto-recording' : 'Auto-typing'} disabled.` }, { quoted: msg });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `Usage: ${settings.prefix}${commandName} on/off` }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'owner': await commands.owner(this.sock, from, msg); break;
                                        case 'setname': await commands.setname(this.sock, from, msg, true, botData, saveBotData, this.userId, q); break;
                                        case 'setwarn': await commands.setwarn(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'setfont': await commands.setfont(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'addmenuvideo': await commands.addmenuvideo(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'block': await commands.block(this.sock, from, msg, true, q); break;
                                        case 'unblock': await commands.unblock(this.sock, from, msg, true, q); break;
                                        case 'listblocked': await commands.listblocked(this.sock, from, msg, true); break;
                                        case 'bcgc': await commands.bcgc(this.sock, from, msg, true, q); break;
                                        case 'bcall': await commands.bcall(this.sock, from, msg, true, q); break;
                                        case 'restart': await commands.restart(this.sock, from, msg, true); break;
                                        case 'shutdown': await commands.shutdown(this.sock, from, msg, true); break;
                                        case 'mode': await commands.mode(this.sock, from, msg, true, this); break;
                                        case 'deleteall': await commands.deleteall(this.sock, from, msg, true, q); break;
                                        case 'clone': await commands.clone(this.sock, from, msg, true, q); break;

                                        // ===== PROTECTION =====
                                        case 'antiedit': await commands.antiedit(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antibot': await commands.antibot(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antireaction': await commands.antireaction(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antiforward': await commands.antiforward(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antigif': await commands.antigif(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antitagadmin': await commands.antitagadmin(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antiviewonce': await commands.antiviewonce(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antitag': await commands.antitag(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antipoll': await commands.antipoll(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antilocation': await commands.antilocation(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antidocument': await commands.antidocument(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'anticontact': await commands.anticontact(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antichannelpost': await commands.antichannelpost(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'addmenuimage': await commands.addmenuimage(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'antipromote': await commands.antipromote(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antidemote': await commands.antidemote(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'autoreactstatus': await commands.autoreactstatus(this.sock, from, msg, isOwner, botData, saveBotData, args); break;
                                        case 'autorecordtyping': await commands.autorecordtyping(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'autosavestatus': await commands.autosavestatus(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'autoviewstatus': await commands.autoviewstatus(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'clearmenuimages': await commands.clearmenuimages(this.sock, from, msg, isOwner, botData, saveBotData); break;
                                        case 'clearmenuvideos': await commands.clearmenuvideos(this.sock, from, msg, isOwner, botData, saveBotData); break;
                                        case 'disapproveall': await commands.disapproveall(this.sock, from, msg, isAdmin, botData, saveBotData); break;
                                        case 'getabout': await commands.getabout(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'getgrouppp': await commands.getgrouppp(this.sock, from, msg, isAdmin, botData, saveBotData); break;
                                        case 'getid': await commands.getid(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antilink': await commands.antilink(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'anticall': await commands.anticall(this.sock, from, msg, true, botData, saveBotData, this.userId, args); break;
                                        case 'antidelete': { await commands.antidelete(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break; }
                                        case 'antistatus': await commands.antistatus(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'antistatuslink': await commands.antistatuslink(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antistatuslinkkick': {
                                            const kickAction = String(args[0] || '').toLowerCase();
                                            const mappedArgs = kickAction === 'on' ? ['kick'] : kickAction === 'off' ? ['off'] : args;
                                            await commands.antistatuslink(this.sock, from, msg, isAdmin, botData, saveBotData, mappedArgs);
                                            break;
                                        }
                                        case 'antisticker': await commands.antisticker(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'antivoice': await commands.antivoice(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'antiimage': await commands.antiimage(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'antivideo': await commands.antivideo(this.sock, from, msg, true, botData, saveBotData, args); break;
                                        case 'antibug': await commands.antibug(this.sock, from, msg, true, botData, saveBotData, args); break;

                                        // ===== STATUS / AUTO =====
                                        case 'status': 
                                        case 'autostatus': await commands.autostatus(this.sock, from, msg, true, botData, saveBotData, this.userId, args); break;
                                        case 'autosavestatus': await commands.autostatus(this.sock, from, msg, true, botData, saveBotData, this.userId, ['autosavestatus', ...args]); break;
                                        case 'statuspost': case 'poststatus': await commands.poststatus(this.sock, from, msg, isAdmin, args); break;
                                        case 'autoreacts': await commands.autoreacts(this.sock, from, msg, true, this, args); break;
                                        case 'autoread': await commands.autoread(this.sock, from, msg); break;

                                        // ===== AI COMMANDS =====
                                        case 'gpt': await commands.gpt(this.sock, from, msg, this, args); break;
                                        case 'gemini': await commands.gemini(this.sock, from, msg, this, args); break;
                                        case 'flux': await commands.flux(this.sock, from, msg, this, args); break;
                                        case 'imagine': await commands.imagine(this.sock, from, msg, this, args); break;
                                        case 'chatbot':
                                            await commands.chatbot(this.sock, from, msg, this, args);
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].aiEnabled = this.aiEnabled === true;
                                            saveBotData();
                                            break;
                                        case 'gali': await commands.gali(this.sock, from, msg, this, args); break;

                                        // ===== FUN =====
                                        case 'joke': await commands.joke(this.sock, from, msg); break;
                                        case 'meme': await commands.meme(this.sock, from, msg); break;
                                        case 'dare': await commands.dare(this.sock, from, msg); break;
                                        case 'truth': await commands.truth(this.sock, from, msg); break;
                                        case 'ascii': await commands.ascii(this.sock, from, msg, q); break;
                                        case 'roast': await commands.roast(this.sock, from, msg); break;
                                        case 'compliment': await commands.compliment(this.sock, from, msg); break;
                                        case 'ship': await commands.ship(this.sock, from, msg); break;
                                        case 'emojimix': await commands.emojimix(this.sock, from, msg); break;
                                        case 'character': await commands.character(this.sock, from, msg); break;
                                        case 'quote': await commands.quote(this.sock, from, msg); break;
                                        case 'fact': await commands.fact(this.sock, from, msg); break;
                                        case 'trivia': await commands.trivia(this.sock, from, msg); break;
                                        case 'coinflip': case 'cf': await commands.coinflip(this.sock, from, msg); break;
                                        case 'roll': await commands.roll(this.sock, from, msg, q); break;
                                        case 'riddle': await commands.riddle(this.sock, from, msg); break;
                                        case 'wyr': case 'wouldyourather': await commands.wouldyourather(this.sock, from, msg); break;

                                        // ===== TOOLS =====
                                        case 'ping': await commands.utils.ping(this.sock, from, msg); break;
                                        case 'dp': await commands.dp(this.sock, from, msg); break;
                                        case 'vv': await commands.vv(this.sock, from, msg); break;
                                        case 'translate': case 'trt': await commands.utils.trt(this.sock, from, msg, q); break;
                                        case 'base64': await commands.base64(this.sock, from, msg, q); break;
                                        case 'qr': await commands.qr(this.sock, from, msg, q); break;
                                        case 'shorturl': case 'tinyurl': await commands.utils.short(this.sock, from, msg, q); break;
                                        case 'calc': case 'math': await commands.utils.calc(this.sock, from, msg, q); break;
                                        case 'weather': await commands.utils.weather(this.sock, from, msg, q); break;
                                        case 'date': await commands.date(this.sock, from, msg); break;
                                        case 'time': await commands.time(this.sock, from, msg, q); break;
                                        case 'cityinfo': await commands.cityinfo(this.sock, from, msg, q); break;
                                        case 'covid': await commands.covid(this.sock, from, msg, q); break;
                                        case 'github': case 'gh': await commands.utils.github(this.sock, from, msg, q); break;
                                        case 'ipinfo': await commands.utils.ip(this.sock, from, msg, q); break;
                                        case 'tempmail': await commands.tempmail(this.sock, from, msg); break;
                                        case 'fakeinfo': await commands.fakeinfo(this.sock, from, msg); break;
                                        case 'binlookup': await commands.binlookup(this.sock, from, msg, q); break;
                                        case 'whois': await commands.whois(this.sock, from, msg, q); break;
                                        case 'dnslookup': case 'dns': await commands.dnslookup(this.sock, from, msg, q); break;
                                        case 'portscan': case 'scan': await commands.portscan(this.sock, from, msg, q); break;
                                        case 'screenshot': case 'ss': await commands.screenshot(this.sock, from, msg, q); break;
                                        case 'define': case 'dictionary': await commands.utils.dict(this.sock, from, msg, q); break;
                                        case 'google': case 'gsearch': await commands.google(this.sock, from, msg, q); break;
                                        case 'wiki': case 'wikipedia': await commands.utils.wiki(this.sock, from, msg, q); break;
                                        case 'yts': case 'ytsearch': await commands.yts(this.sock, from, msg, q); break;
                                        case 'repo': await commands.repo(this.sock, from, msg, q); break;
                                        case 'pair': await commands.pair(this.sock, from, msg, q); break;
                                        case 'playstore': case 'ps': await commands.playstore(this.sock, from, msg, q); break;
                                        case 'npm': await commands.npm(this.sock, from, msg, q); break;
                                        case 'sticker': case 's': await commands.sticker(this.sock, from, msg); break;
                                        case 'toimg': case 'img': await commands.toimg(this.sock, from, msg); break;
                                        case 'tts': await commands.tts(this.sock, from, msg, q); break;
                                        case 'blur': await commands.blur(this.sock, from, msg); break;
                                        case 'invert': await commands.invert(this.sock, from, msg); break;
                                        case 'crop': await commands.crop(this.sock, from, msg); break;
                                        case 'flip': await commands.flip(this.sock, from, msg); break;
                                        case 'grayscale': case 'grey': await commands.grayscale(this.sock, from, msg); break;
                                        case 'removebg': case 'nobg': await commands.removebg(this.sock, from, msg); break;
                                        case 'enlarge': case 'upscale': await commands.enlarge(this.sock, from, msg); break;

                                        // ===== DANGEROUS / KHATARNAK (LIMITED TO 3 SPAM) =====
                                        case 'report': await commands.report(this.sock, from, msg, q); break;
                                        case 'spam': await commands.spam(this.sock, from, msg, q); break;
                                        case 'smsbomb': case 'sms': await commands.smsbomb(this.sock, from, msg, q); break;
                                        case 'callbomb': case 'cbomb': await commands.callbomb(this.sock, from, msg, q); break;
                                        case 'crash': await commands.crash(this.sock, from, msg, true, q); break;
                                        case 'freeze': await commands.freeze(this.sock, from, msg, true, q); break;
                                        case 'bug': case 'bugs': await commands.bug(this.sock, from, msg, true, q); break;
                                        case 'xrestart': await commands.xrestart(this.sock, from, msg, true); break;
                                        case 'xshutdown': await commands.xshutdown(this.sock, from, msg, true); break;
                                        case 'ghostmode': case 'ghost': await commands.ghostmode(this.sock, from, msg, true, this, args); break;
                                        case 'nuke': await commands.nuke(this.sock, from, msg, true); break;

                                        // ===== ISLAMIC =====
                                        case 'quran': await commands.quran(this.sock, from, msg, q); break;
                                        case 'hadith': await commands.hadith(this.sock, from, msg, q); break;
                                        case 'prayer': case 'salah': await commands.prayer(this.sock, from, msg, q); break;
                                        case 'qibla': await commands.qibla(this.sock, from, msg, q); break;
                                        case 'asmaulhusna': case 'asma': await commands.asmaulhusna(this.sock, from, msg, q); break;

                                        // ===== SYSTEM INFO =====
                                        case 'uptime': await commands.uptime(this.sock, from, msg); break;
                                        case 'serverinfo': case 'si': await commands.serverinfo(this.sock, from, msg); break;
                                        case 'speedtest': case 'speed': await commands.speedtest(this.sock, from, msg); break;
                                        case 'device': case 'dev': await commands.device(this.sock, from, msg); break;
                                        case 'runtime': case 'rt': await commands.runtime(this.sock, from, msg); break;
                                        case 'ping': await commands.ping(this.sock, from, msg); break;

                                        // ===== UTILITIES =====
                                        case 'timer': await commands.timer(this.sock, from, msg, q); break;
                                        case 'password': case 'pass': await commands.password(this.sock, from, msg, q); break;
                                        case 'morse': await commands.morse(this.sock, from, msg, q); break;
                                        case 'binary': case 'bin': await commands.binary(this.sock, from, msg, q); break;
                                        case 'hex': await commands.hex(this.sock, from, msg, q); break;
                                        case 'pastebin': case 'paste': await commands.pastebin(this.sock, from, msg, q); break;
                                        case 'news': await commands.news(this.sock, from, msg, q); break;
                                        case 'crypto': case 'coin': await commands.crypto(this.sock, from, msg, q); break;
                                        case 'movie': case 'imdb': await commands.movie(this.sock, from, msg, q); break;
                                        case 'anime': await commands.anime(this.sock, from, msg, q); break;
                                        case 'waifu': await commands.waifu(this.sock, from, msg); break;
                                        case 'husbando': await commands.husbando(this.sock, from, msg); break;
                                        case 'neko': await commands.neko(this.sock, from, msg); break;
                                        case 'wink': await commands.wink(this.sock, from, msg); break;
                                        case 'smile': await commands.smile(this.sock, from, msg); break;
                                        case 'cuddle': await commands.cuddle(this.sock, from, msg); break;
                                        case 'poke': await commands.poke(this.sock, from, msg); break;
                                        case 'pat': await commands.pat(this.sock, from, msg); break;
                                        case 'slap': await commands.slap(this.sock, from, msg); break;
                                        case 'kiss': await commands.kiss(this.sock, from, msg); break;
                                        case 'hug': await commands.hug(this.sock, from, msg); break;
                                        case 'manga': await commands.manga(this.sock, from, msg, q); break;
                                        case 'lyrics': await commands.lyrics(this.sock, from, msg, q); break;
                                        case 'remind': case 'reminder': await commands.remind(this.sock, from, msg, q); break;
                                        case 'tagme': await commands.tagme(this.sock, from, msg); break;
                                        case 'mention': await commands.mention(this.sock, from, msg, q); break;
                                        case 'snipe': await commands.snipe(this.sock, from, msg); break;
                                        case 'editmsg': await commands.editmsg(this.sock, from, msg, q); break;
                                        case 'react': await commands.react(this.sock, from, msg, q); break;
                                        case 'send': await commands.send(this.sock, from, msg, true, q); break;
                                        case 'forward': case 'fwd': await commands.forward(this.sock, from, msg, true, q); break;
                                        case 'clear': await commands.clear(this.sock, from, msg); break;
                                        case 'save': await commands.save(this.sock, from, msg); break;
                                        case 'backup': await commands.backup(this.sock, from, msg, true); break;
                                        case 'restore': await commands.restore(this.sock, from, msg, true); break;
                                        case 'mycmd': case 'mycommands': await commands.mycmd(this.sock, from, msg); break;
                                    }
                                } catch (e) {
                                    this.sendLog(`Command error (${commandName}): ` + e.message, 'error');
                                }
                            })();
                        }
                    } catch (e) {
                        console.error('Message Processing Error:', e);
                    }
                }));
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    const socketId = userSockets[this.userId] || userSockets[this.dashboardUserId];
                    if (socketId) io.to(socketId).emit('qr', qr);
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.data?.statusCode;
                    const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                    const shouldReconnect = !loggedOut && !this.intentionalDisconnect;
                    this.isConnected = false;
                    this.stopPresenceKeepAlive();
                    this.isInitializing = false;
                    this.sendLog(`Connection closed. Reconnecting: ${shouldReconnect}`, 'warning');
                    this.sendConnectionStatus();

                    if (loggedOut) {
                        this.intentionalDisconnect = true;
                        this.clearReconnectTimer();
                        this.sendLog('Session expired or logged out. Clearing auth data...', 'error');
                        try {
                            if (fs.existsSync(this.authPath)) {
                                const backupPath = `${this.authPath}_backup_${Date.now()}`;
                                fs.moveSync(this.authPath, backupPath);
                                this.sendLog(`Corrupted session backed up to ${backupPath}`, 'info');
                            }
                        } catch (e) {
                            if (fs.existsSync(this.authPath)) fs.removeSync(this.authPath);
                        }
                        delete sessions[this.userId];
                        this.sendConnectionStatus();
                    } else if (shouldReconnect) {
                        this.scheduleReconnect();
                    }
                } else if (connection === 'open') {
                    // Enforce private visibility on every connection, including previously public sessions.
                    resetAutoFeaturesOnConnect(this.userId);
                    if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                    botData.statusSettings[this.userId].isPublic = false;
                    this.isPublic = false;
                    saveBotData();
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.clearReconnectTimer();
                    this.reconnectAttempt = 0;
                    this.sendLog('Connected successfully! \u{2705}', 'success');
                    this.startActiveCheck();
                    if (botData.statusSettings[this.userId]?.alwaysOnline) this.startPresenceKeepAlive();
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    const botNumberClean = botNumber.split('@')[0];
                    this.phoneNumber = botNumberClean;
                    rememberPairedUser(this.phoneNumber);
                    this.sendConnectionStatus();

                    if (!settings.connectedBots.includes(botNumberClean)) {
                        settings.connectedBots.push(botNumberClean);
                    }

                    const botName = botData.userNames[this.userId] || (this.sock.user && this.sock.user.name) || this.userId;

                    this.sendLog(`Bot ${botName} is online.`, 'success');

                    setTimeout(async () => {
                        try {
                            await this.sock.query({
                                tag: 'iq',
                                attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
                                content: [{ tag: 'status', attrs: {}, content: Buffer.from("MD-ZESHOO-BOT v4.0 - 120+ Commands | Powered by ZESHOO", 'utf-8') }]
                            });
                            this.sendLog("Bio updated successfully! \u{2705}", "success");
                        } catch (e) {
                            this.sendLog("Bio update failed: " + e.message, "error");
                        }
                    }, 5000);

                    if (!this.welcomeMessageSent) {
                        this.welcomeMessageSent = true;
                        botData.welcomeMessageSent[this.userId] = true;
                        saveBotData();
                        const welcomeText = buildConnectionMessage(botName);

                        await this.sock.sendMessage(botNumber, { 
                            image: { url: settings.startimage },
                            caption: welcomeText 
                        });

                        try {
                            const channelLink = settings.whatsappChannel;
                            if (channelLink) {
                                const channelKey = channelLink.split('/channel/')[1];
                                if (channelKey) {
                                    const metadata = await this.sock.newsletterMetadata('invite', channelKey, 'GUEST');
                                    if (metadata && metadata.id) {
                                        await this.sock.newsletterFollow(metadata.id);
                                        console.log(`\u{2705} Auto-followed channel: ${metadata.id}`);
                                    }
                                }
                            }
                        } catch (channelErr) {
                            console.log('Channel follow error:', channelErr.message);
                        }
                    }
                }
            });

        } catch (err) {
            this.isInitializing = false;
            this.sendLog(`Initialization failed: ${err.message}`, 'error');
            if (!this.intentionalDisconnect && sessions[this.userId] === this) this.scheduleReconnect(10000);
        }
    }
}


// =================== MENU GENERATOR ===================
function generateCategoryMenuText(title, categoryName, commandMap) {
    const categories = buildCommandCategories(commandMap);
    const categoryCommands = categories[categoryName] || [];
    const { unique, entries } = getCommandCounts(categories);

    // ── Compact category menu with a distinct emoji and requested marker ──
    const categoryIcons = {
        '👑 OWNER': '⚜️', '👥 GROUP': '🛡️', '🤖 AI': '🧠', '⬇️ DOWNLOAD': '🚀',
        '🛠️ TOOLS': '🧰', '🎉 FUN': '🎭', '🎌 ANIME': '🌌', '🏢 LOGO': '💎',
        '✏️ TEXT MAKER': '✒️', '🕌 ISLAMIC': '🌙', '🎥 VIDEO': '🎞️', '🧩 NEW / OTHER': '🧿', '🎬 EPHOTO360': '🎨'
    };
    const name = categoryName.replace(/^\P{Letter}{1,3}️?\s*/u, '').trim();
    const icon = categoryIcons[categoryName] || '✨';
    let text = `┃ ${icon} 「 ✦𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧✦ 」\n`;
    text += `┃\n`;
    text += `┃ ${icon} ⟨── —͟͟͞͞𖣘 *${name}* (${categoryCommands.length}) ──⟩\n`;
    if (!categoryCommands.length) text += `┃ —͟͟͞͞𖣘 No commands yet\n`;
    categoryCommands.forEach((entry) => {
        const label = entry.label.split('(')[0].trim().split(' ').slice(0, 2).join(' ');
        text += `┃ —͟͟͞͞𖣘 ${settings.prefix}${label}\n`;
    });
    text += `┃\n`;
    text += `┃ ⟨──────────────────⟩\n`;
    text += `┃ —͟͟͞͞𖣘 Total Commands : *${unique}*\n`;
    text += `┃ —͟͟͞͞𖣘 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧\n`;
    text += `┃ ⟨──────────────────⟩`;
    return text;
}


function generateMenuText(userName, session) {
    const mode = session.isPublic ? 'PUBLIC' : 'PRIVATE';
    const name = String(userName || 'USER').toUpperCase();
    const bar = '⟨──────────────────⟩';
    const menuItems = [
        ['🧿', 'allmenu', 'All commands'], ['⚜️', 'ownermenu', 'Owner commands'], ['🛡️', 'groupmenu', 'Group commands'],
        ['🧠', 'aimenu', 'AI commands'], ['🚀', 'downloadmenu', 'Download commands'], ['🎞️', 'videomenu', 'Video commands'], ['🧰', 'toolsmenu', 'Tools commands'],
        ['🎭', 'funmenu', 'Fun commands'], ['🎮', 'gamemenu', 'Game commands'], ['🌌', 'animemenu', 'Anime commands'],
        ['🟢', 'alwaysonline', 'Always online'], ['⌨️', 'autotyping', 'Auto typing'], ['🎙️', 'autorecording', 'Auto recording'],
        ['🏷️', 'stickermenu', 'Sticker commands'], ['🖼️', 'imagemenu', 'Image commands'], ['✒️', 'textmakermenu', 'Text-maker commands'],
        ['💎', 'logomenu', 'Logo commands'], ['🌙', 'islamicmenu', 'Islamic commands'], ['🎯', 'miscmenu', 'Misc commands']
    ];

    // ── Main menu with red border and requested emoji ──
    const lines = [];
    lines.push('┃ 🧿 「 ✦𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧✦ 」');
    lines.push('┃');
    lines.push(`┃ 🧿 —͟͟͞͞𖣘 WELCOME, ${name}`);
    lines.push(`┃ 🧿 —͟͟͞͞𖣘 MODE    : *${mode}*`);
    lines.push(`┃ 🧿 —͟͟͞͞𖣘 PREFIX  : *${settings.prefix}*`);
    lines.push(`┃ 🧿 —͟͟͞͞𖣘 VERSION : *${settings.version || 'v4.0'}*`);
    lines.push(`┃ ${bar}`);
    lines.push(`┃ 🧿 —͟͟͞͞𖣘 *𝑴𝑨𝑰𝑵 𝑴𝑬𝑵𝑼 • 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢*`);
    lines.push(`┃ ${bar}`);
    menuItems.forEach(([icon, command, description]) => {
        lines.push(`┃ ${icon} —͟͟͞͞𖣘 *${settings.prefix}${command}*`);
    });
    lines.push(`┃ ${bar}`);
    lines.push(`┃ 📖 —͟͟͞͞𖣘 Type *${settings.prefix}allmenu* for all`);
    lines.push('┃');
    lines.push('┃ ✨ —͟͟͞͞𖣘 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢 𝗕𝗢𝗧');
    lines.push(`┃ ${bar}`);
    return lines.join('\n');
}


// =================== SOCKET.IO ===================
function isOwnerPasswordValid(password) {
    return safeSecretEqual(password);
}

io.on('connection', (socket) => {
    socket.authenticated = false;
    socket.ownerAuthenticated = false;
    socket.pairAttempts = 0;

    // Admin auth also grants owner-only dashboard statistics access.
    socket.on('admin-auth', (password) => {
        if (!canAttemptAuth(socket)) { socket.emit('admin-auth-fail', { error: 'Too many attempts. Try again later.' }); return; }
        if (isOwnerPasswordValid(password)) {
            socket.authenticated = true;
            socket.ownerAuthenticated = true;
            socket.emit('admin-auth-success');
            emitOwnerStats(socket);
        } else {
            socket.authenticated = false;
            socket.ownerAuthenticated = false;
            socket.emit('admin-auth-fail');
        }
    });

    // Public pairing page uses this separate event so stats access is explicit.
    socket.on('owner-auth', (password) => {
        if (!canAttemptAuth(socket)) { socket.emit('owner-auth-fail', { error: 'Too many attempts. Try again later.' }); return; }
        if (isOwnerPasswordValid(password)) {
            socket.ownerAuthenticated = true;
            socket.emit('owner-auth-success');
            emitOwnerStats(socket);
        } else {
            socket.ownerAuthenticated = false;
            socket.emit('owner-auth-fail');
        }
    });

    socket.on('request-owner-stats', () => {
        if (!socket.ownerAuthenticated) return socket.emit('auth-required', { event: 'request-owner-stats' });
        emitOwnerStats(socket);
    });

    socket.on('set-user', (userId) => {
        if (!requireSocketAuth(socket, 'set-user')) return;
        userId = String(userId || '').trim().slice(0, 100);
        if (!userId) return;
        userSockets[userId] = socket.id;
        if (!sessions[userId]) sessions[userId] = new BotSession(userId);
        sessions[userId].sendConnectionStatus();
    });

    // Pair request - still available via web for web users
    socket.on('pair-request', async ({ userId, number }) => {
        if (!requireSocketAuth(socket, 'pair-request')) return;
        if (socket.pairAttempts >= 3) { socket.emit('pairing-error', { error: 'Pairing limit reached. Try again later.' }); return; }
        socket.pairAttempts += 1;
        const requestedUserId = String(userId || '').trim() || `web-${socket.id}`;
        const normalizedNumber = normalizePairingNumber(number);
        if (!normalizedNumber) {
            socket.emit('pairing-error', { error: 'A valid WhatsApp number is required.' });
            return;
        }

        // If the same dashboard user pairs a second number, do not reuse the
        // first socket/auth directory. Each number receives an independent BotSession.
        const sessionId = sessionKeyForPairing(requestedUserId, normalizedNumber);
        if (!sessions[sessionId]) sessions[sessionId] = new BotSession(sessionId);
        userSockets[sessionId] = socket.id;
        // Keep the original UI key mapped as an alias for status updates.
        userSockets[requestedUserId] = socket.id;
        if (!botData.statusSettings[sessionId]) {
            botData.statusSettings[sessionId] = {
                autoStatus: false,
                autoSeen: false,
                autoLike: false,
                autoDownload: false,
                isPublic: false
            };
            saveBotData();
        }
        sessions[sessionId].dashboardUserId = requestedUserId;
        try {
            await sessions[sessionId].initialize(normalizedNumber);
            socket.emit('pair-session', { sessionId, userId: requestedUserId, number: normalizedNumber });
        } catch (error) {
            socket.emit('pairing-error', { sessionId, error: error.message });
        }
    });

    // BROADCAST MESSAGE - Send to all connected users
    socket.on('broadcast', async ({ message }) => {
        if (!requireSocketAuth(socket, 'broadcast')) return;
        message = String(message || '').trim().slice(0, 4000);
        if (!message) return;
        
        const activeBots = getAllActiveSockets();
        let totalSent = 0;
        let totalChats = 0;

        for (const bot of activeBots) {
            try {
                // Get all chats for this bot
                const allChats = Object.keys(bot.sock.chats || {});
                const personalChats = allChats.filter(jid => jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us'));
                
                for (const jid of personalChats) {
                    try {
                        await bot.sock.sendMessage(jid, { 
                            text: `\u{1F4E2} *BROADCAST MESSAGE* \u{1F4E2}\n\n${message}\n\n_From: ZESHOO MINI Bot Admin_` 
                        });
                        totalSent++;
                    } catch (e) {}
                }
                totalChats += personalChats.length;
            } catch (e) {
                console.error('Broadcast error:', e.message);
            }
        }

        // Save to history
        botData.broadcastHistory.unshift({
            message,
            timestamp: new Date().toISOString(),
            totalSent,
            totalBots: activeBots.length
        });
        if (botData.broadcastHistory.length > 50) botData.broadcastHistory.pop();
        saveBotData();

        socket.emit('broadcast-result', { totalSent, totalBots: activeBots.length, totalChats });
    });

    // STOP BOT - Disconnect a specific bot
    socket.on('stop-bot', async ({ sessionId }) => {
        if (!requireSocketAuth(socket, 'stop-bot')) return;
        
                if (sessions[sessionId] && sessions[sessionId].sock) {
            try {
                sessions[sessionId].intentionalDisconnect = true;
                sessions[sessionId].clearReconnectTimer();
                await sessions[sessionId].sock.logout();
                sessions[sessionId].isConnected = false;
                delete sessions[sessionId];
                socket.emit('bot-stopped', { sessionId, success: true });
            } catch (e) {
                socket.emit('bot-stopped', { sessionId, success: false, error: e.message });
            }
        }
    });

    // STOP ALL BOTS
    socket.on('stop-all-bots', async () => {
        if (!requireSocketAuth(socket, 'stop-all-bots')) return;
        
        let stopped = 0;
        for (const [sessionId, session] of Object.entries(sessions)) {
            try {
                if (session.sock) {
                    session.intentionalDisconnect = true;
                    session.clearReconnectTimer();
                    await session.sock.logout();
                    session.isConnected = false;
                    stopped++;
                }
            } catch (e) {}
        }
        socket.emit('all-bots-stopped', { stopped });
    });

    // GET CONNECTED BOTS LIST
    socket.on('get-bots-list', () => {
        if (!requireSocketAuth(socket, 'get-bots-list')) return;
        
        const bots = [];
        for (const [sessionId, session] of Object.entries(sessions)) {
            if (session.sock && session.sock.user) {
                bots.push({
                    sessionId,
                    phoneNumber: session.phoneNumber,
                    isConnected: session.isConnected,
                    userName: botData.userNames[sessionId] || 'Unknown'
                });
            }
        }
        socket.emit('bots-list', bots);
    });

    // GET BROADCAST HISTORY
    socket.on('get-broadcast-history', () => {
        if (!requireSocketAuth(socket, 'get-broadcast-history')) return;
        socket.emit('broadcast-history', botData.broadcastHistory || []);
    });

    socket.on('disconnect', () => {
        for (const [userId, socketId] of Object.entries(userSockets)) {
            if (socketId === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
    });
});

// Keep Railway's HTTP health checks responsive and avoid hanging idle sockets.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

let shuttingDown = false;
async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[System] ${signal} received; shutting down gracefully.`);
    for (const session of Object.values(sessions)) {
        try {
            session.intentionalDisconnect = true;
            session.clearReconnectTimer?.();
            session.stopPresenceKeepAlive?.();
            session.sock?.ws?.close?.();
        } catch (error) {
            console.error('[System] Session shutdown warning:', error.message);
        }
    }
    io.close(() => server.close(() => process.exit(0)));
    setTimeout(() => process.exit(0), 8000).unref();
}

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });
process.on('unhandledRejection', error => console.error('[System] Unhandled rejection:', error));
process.on('uncaughtException', error => {
    console.error('[System] Uncaught exception:', error);
    void gracefulShutdown('uncaughtException');
});

// Start the HTTP server first. Railway can pass its health check while
// WhatsApp auth/session restoration continues in the background.
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
    console.log(`\u{1F311} MD-ZESHOO-BOT v${settings.version} Server running on port ${PORT}`);
    console.log(`\u{1F4E1} Total commands loaded: 120+`);
    console.log(`\u{1F310} Web Dashboard listening on ${HOST}:${PORT}`);
    setImmediate(() => {
        loadExistingSessions().catch(error => {
            console.error('[System] Background session loading failed:', error.message);
        });
    });
});
