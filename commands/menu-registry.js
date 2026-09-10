const CATEGORY_SETS = {
    '👑 OWNER': new Set([
        'public', 'private', 'mode', 'owner', 'setname', 'block', 'unblock', 'bcgc', 'bcall',
        'restart', 'shutdown', 'xrestart', 'xshutdown', 'nuke', 'clear', 'backup', 'restore',
        'clone', 'addsudo', 'delsudo', 'listsudo', 'setprefix', 'broadcast', 'self',
        'autostatus', 'autosavestatus', 'autoseen', 'autolike', 'autobio', 'alwaysonline',
        'autotyping', 'autorecording', 'pair', 'listblocked', 'addmenuvideo',
        'addmenuimage', 'autoreactstatus', 'autorecordtyping', 'autosavestatus', 'autoviewstatus', 'clearmenuimages', 'clearmenuvideos', 'disapproveall'
    ]),
    '👥 GROUP': new Set([
        'kickall', 'add', 'promote', 'demote', 'mute', 'unmute', 'tagall', 'hidetag',
        'grouplink', 'groupinfo', 'join', 'leave', 'setdesc', 'setppgc', 'getbio', 'getdp',
        'accept', 'poll', 'everyonemsg', 'listonline', 'listoffline', 'tagme', 'mention', 'kickoffline', 'opentime', 'vcf', 'userid', 'totalmembers', 'listinactive', 'listrequests', 'allow', 'announcements', 'addcode', 'delcode', 'delallowed',
        'snipe', 'editmsg', 'react', 'send', 'forward', 'save', 'welcome', 'goodbye',
        'setwelcome', 'setgoodbye', 'autoreact', 'statuspost', 'antimessage', 'antilink',
        'antidelete', 'antiviewonce', 'antifake', 'antispam', 'antibug', 'anticall', 'tagadmin',
        'antistatus', 'antistatuslink', 'antistatuslinkkick', 'antisticker', 'antivoice', 'antiimage', 'antivideo',
        'antipromote', 'antidemote', 'setppgc', 'setppgroup', 'delppgroup', 'antibadword', 'setwarn',
        'setfont', 'antiedit', 'antibot', 'antireaction', 'antiforward', 'antigif', 'antitagadmin',
        'antitag', 'antipoll', 'antilocation', 'antidocument', 'anticontact', 'antichannelpost', 'getabout', 'getgrouppp', 'getid', 'antiprotection'
    ]),
    '🤖 AI COMMANDS': new Set([
        'chatbot', 'gali', 'chatgpt', 'gpt', 'gemini', 'llama', 'deepseek', 'flux', 'pixart',
        'dalle', 'bingai', 'blackbox', 'imagine', 'midjourney', 'simi', 'brainly', 'math'
    ]),
    '⬇️ DOWNLOAD': new Set([
        'song', 'video', 'insta', 'tiktok', 'facebook', 'youtube', 'pinterest', 'twitter',
        'reddit', 'spotify', 'mf', 'mediafire', 'itunes', 'apk', 'gdrive', 'ytdl',
        'ytmp3', 'ytmp3doc', 'ytmp4', 'song2', 'gitclone', 'threads', 'snapchat',
        'capcut', 'terabox'
    ]),
    '🎥 VIDEO': new Set(['volvideo', 'tovideo', 'toaudio']),
    '🔊 AUDIO COMMANDS': new Set(['earrape', 'reverse', 'robot', 'volaudio', 'toptt', 'tomp3', 'deep', 'blown', 'bass']),
    '🔗 MULTISESSION COMMANDS': new Set(['delsession', 'sessions', 'connect']),
    '🎵 MUSIC': new Set(['play', 'skip', 'stop', 'pause', 'resume', 'queue', 'volume', 'loop', 'shuffle', 'nowplaying']),
    '🛠️ TOOLS': new Set([
        'ping', 'dp', 'vv', 'translate', 'base64', 'qr', 'shorturl', 'calc',
        'github', 'ipinfo', 'tempmail', 'fakeinfo', 'binlookup', 'whois', 'dnslookup',
        'portscan', 'screenshot', 'define', 'google', 'wiki', 'yts', 'movie', 'imdb', 'playstore', 'npm',
        'sticker', 'toimg', 'tts', 'blur', 'invert', 'crop', 'flip', 'grayscale',
        'removebg', 'enlarge', 'repo', 'runtime', 'uptime', 'serverinfo', 'speedtest', 'device',
        'pdf', 'ocr', 'remini', 'enhance', 'upscale', 'find', 'location', 'search'
    ]),
    '🌤️ WEATHER & INFO': new Set(['weather', 'time', 'date', 'cityinfo', 'news', 'covid']),
    '🎉 FUN': new Set([
        'joke', 'meme', 'dare', 'truth', 'ascii', 'roast', 'compliment', 'ship', 'emojimix',
        'character', 'quote', 'fact', 'trivia', 'coinflip', 'roll', 'riddle', 'wouldyourather',
        'hack', 'report', 'spam', 'smsbomb', 'callbomb', 'crash', 'freeze', 'lag', 'bug',
        'locspam', 'vcardspam', 'buttonspam', 'pollspam', 'contactspam', 'flirt', 'insult',
        'pickup', 'tictactoe', '8ball', 'chess', 'hangman'
    ]),
    '🕌 ISLAMIC': new Set(['quran', 'hadith', 'prayer', 'qibla', 'asmaulhusna', 'surah', 'ayat', 'tafsir', 'dua', 'azkar']),
    '🎌 ANIME': new Set([
        'anime', 'manga', 'waifu', 'husbando', 'neko', 'shinobu', 'megumin', 'bully',
        'awoo', 'lick', 'smug', 'bonk', 'yeet', 'handhold',
        'nom', 'bite', 'cringe'
    ]),
        'ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ': new Set(['wink', 'smile', 'cuddle', 'poke', 'pat', 'slap', 'kiss', 'hug', 'kill', 'kick', 'sleep', 'shoot', 'cry', 'wave', 'angry', 'highfive', 'dance', 'blush', 'happy']),
    '🎯 MISC': new Set(['triggered', 'passed', 'jail', 'glass', 'gay', 'comrade', 'ytcomment', 'oogway', 'namecard', 'its-so-stupid', 'lgbt', 'circle', 'horny', 'heart']),
    '🏢 LOGO': new Set([
'neon', 'glitch', 'gold', '3dtext', 'fire', 'water', 'galaxy', 'marvel', 'avengers', 'transformer', 'blackpink', 'gradient', 'luxury', 'royal', 'metal', 'steel', 'chrome', 'glossy']),
    '✏️ TEXT MAKER': new Set(['zeshoo', 'cup', 'coffee', 'cloud', 'smoke', 'flower', 'leaf', 'wood', 'stone', 'blood', 'horror', 'scary', 'spooky', 'christmas', 'birthday', 'love']),
    '🎬 EPHOTO360': new Set(['cartoonstyle', 'blackpinkstyle', 'blackpinklogo', 'advancedglow', '1917style', 'flagtext', 'flag3dtext', 'effectclouds', 'dragonball', 'gradienttext', 'glowingtext', 'glitchtext', 'galaxywallpaper', 'freecreate', 'galaxystyle', 'makingneon', 'luxurygold', 'logomaker', 'lighteffects', 'incandescent', 'graffiti', 'sand', 'royaltext', 'pixelglitch', 'papercutstyle', 'neonglitch', 'multicoloredneon', 'matrix', 'writetext', 'watercolortext', 'typography', 'topography', 'summerbeach'])
};

const BUILTIN_COMMANDS = [
    { name: 'play', label: 'play <song/query> (play music)' },
    { name: 'skip', label: 'skip (skip current track)' },
    { name: 'stop', label: 'stop (stop music)' },
    { name: 'pause', label: 'pause (pause current track)' },
    { name: 'resume', label: 'resume (resume current track)' },
    { name: 'queue', label: 'queue (show music queue)' },
    { name: 'volume', label: 'volume <0-100> (set music volume)' },
    { name: 'loop', label: 'loop on/off (repeat music)' },
    { name: 'shuffle', label: 'shuffle (shuffle music queue)' },
    { name: 'nowplaying', label: 'nowplaying (current track)' },
    { name: 'weather', label: 'weather <city> (current weather)' },
    { name: 'time', label: 'time <city> (local time)' },
    { name: 'date', label: 'date (current date)' },
    { name: 'cityinfo', label: 'cityinfo <city> (city information)' },
    { name: 'news', label: 'news (latest news)' },
    { name: 'covid', label: 'covid (COVID-19 information)' },
    { name: 'waifu', label: 'waifu (random anime character)' },
    { name: 'husbando', label: 'husbando (random anime character)' },
    { name: 'neko', label: 'neko (random anime image)' },
    { name: 'alwaysonline', label: 'alwaysonline on/off' },
    { name: 'autotyping', label: 'autotyping on/off' },
    { name: 'autorecording', label: 'autorecording on/off' },
    { name: 'autoreact', label: 'autoreact on/off' },
    { name: 'autosavestatus', label: 'autosavestatus all/off' },
    { name: 'statuspost', label: 'statuspost <text/link/media>' },
    { name: 'antimessage', label: 'antimessage on/off' },
    { name: 'antistatuslink', label: 'antistatuslink delete/warn/kick/off' },
    { name: 'antistatuslinkkick', label: 'antistatuslinkkick on/off' },
    { name: 'antipromote', label: 'antipromote on/off/kick' },
    { name: 'antidemote', label: 'antidemote on/off/kick' },
    { name: 'setppgroup', label: 'setppgroup (reply to image)' },
    { name: 'delppgroup', label: 'delppgroup' },
    { name: 'antibadword', label: 'antibadword delete/warn/kick/off' },
    { name: 'setwarn', label: 'setwarn <number> (warn limit before kick)' },
    { name: 'setfont', label: 'setfont <number> (response font style)' },
    { name: 'listblocked', label: 'listblocked (list blocked numbers)' },
    { name: 'antiedit', label: 'antiedit on/off/delete/warn/kick' },
    { name: 'antibot', label: 'antibot on/off/warn/kick' },
    { name: 'addmenuvideo', label: 'addmenuvideo <url> (video with menu)' },
    { name: 'antireaction', label: 'antireaction on/off/warn/kick' },
    { name: 'antiforward', label: 'antiforward on/off/warn/kick' },
    { name: 'antigif', label: 'antigif on/off/warn/kick' },
    { name: 'antitagadmin', label: 'antitagadmin on/off/warn/kick' },
    { name: 'antiviewonce', label: 'antiviewonce on/off/warn/kick' },
    { name: 'antitag', label: 'antitag on/off/warn/kick' },
    { name: 'antipoll', label: 'antipoll on/off/warn/kick' },
    { name: 'antilocation', label: 'antilocation on/off/warn/kick' },
    { name: 'antidocument', label: 'antidocument on/off/warn/kick' },
    { name: 'anticontact', label: 'anticontact on/off/warn/kick' },
    { name: 'antichannelpost', label: 'antichannelpost on/off/warn/kick' },
    { name: 'addmenuimage', label: 'addmenuimage <url> (image with menu)' },
    { name: 'antipromote', label: 'antipromote on/off/kick (block promotions)' },
    { name: 'antidemote', label: 'antidemote on/off/kick (block demotions)' },
    { name: 'autoreactstatus', label: 'autoreactstatus on/off (auto react statuses)' },
    { name: 'autorecordtyping', label: 'autorecordtyping on/off/recording/typing (auto presence)' },
    { name: 'autosavestatus', label: 'autosavestatus on/off (permanently save statuses)' },
    { name: 'autoviewstatus', label: 'autoviewstatus on/off (auto view statuses)' },
    { name: 'clearmenuimages', label: 'clearmenuimages (clear menu images)' },
    { name: 'clearmenuvideos', label: 'clearmenuvideos (clear menu videos)' },
    { name: 'disapproveall', label: 'disapproveall (reject pending requests)' },
    { name: 'getabout', label: 'getabout [number] (fetch user/group about)' },
    { name: 'getgrouppp', label: 'getgrouppp (fetch group profile picture)' },
    { name: 'getid', label: 'getid [mention] (fetch user/group/bot ID)' },
    { name: 'listonline', label: 'listonline (show only online members)' },
    { name: 'listoffline', label: 'listoffline (show only offline members)' },
    { name: 'antiprotection', label: 'antiprotection (anti-promote/demote status)' }
];

function categoryFor(name, command) {
    const explicit = command && (command.menuCategory || command.category || (command.menu && command.menu.category));
    if (explicit) return explicit;
    for (const [category, names] of Object.entries(CATEGORY_SETS)) {
        if (names.has(name)) return category;
    }
    return '🧩 NEW / OTHER';
}

const CATEGORY_ORDER = ['👑 OWNER', '👥 GROUP', '🤖 AI COMMANDS', '🔗 MULTISESSION COMMANDS', '⬇️ DOWNLOAD', '🎥 VIDEO', '🔊 AUDIO COMMANDS', '🎵 MUSIC', '🌤️ WEATHER & INFO', '🛠️ TOOLS', '🎉 FUN', '🕌 ISLAMIC', '🎌 ANIME', 'ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ', '🏢 LOGO', '✏️ TEXT MAKER', '🎯 MISC', '🎬 EPHOTO360', '🧩 NEW / OTHER'];

function labelFor(name) {
    return {
        alwaysonline: 'alwaysonline on/off',
        autotyping: 'autotyping on/off',
        autorecording: 'autorecording on/off',
        autoreact: 'autoreact on/off',
        autosavestatus: 'autosavestatus all/off',
        statuspost: 'statuspost <text/link/media>',
        antimessage: 'antimessage on/off',
        antistatuslink: 'antistatuslink delete/warn/kick/off',
        antistatuslinkkick: 'antistatuslinkkick on/off',
        antipromote: 'antipromote on/off/kick',
        antidemote: 'antidemote on/off/kick',
        setppgc: 'setppgroup (reply to image)',
        setppgroup: 'setppgroup (reply to image)',
        delppgroup: 'delppgroup',
        antibadword: 'antibadword delete/warn/kick/off',
        setwarn: 'setwarn <number> (warn limit before kick)',
        setfont: 'setfont <number> (response font style)',
        listblocked: 'listblocked (list blocked numbers)',
        antiedit: 'antiedit on/off (block edited messages)',
        antibot: 'antibot on/off/kick (block other bots)',
        addmenuvideo: 'addmenuvideo <url> (add menu response video)',
        antireaction: 'antireaction on/off (block reactions)',
        antiforward: 'antiforward on/off (block forwarded messages)',
        antigif: 'antigif on/off (block GIF videos)',
        antitagadmin: 'antitagadmin on/off (block tagging admins)',
        antiviewonce: 'antiviewonce on/off (block view-once media)',
        antitag: 'antitag on/off (block mass tagging members)',
        antipoll: 'antipoll on/off (block poll creation)',
        antilocation: 'antilocation on/off (block location sharing)',
        antidocument: 'antidocument on/off (block document files)',
        anticontact: 'anticontact on/off (block contact sharing)',
        antichannelpost: 'antichannelpost on/off (block channel posts)',
        addmenuimage: 'addmenuimage <url> (add menu response image)',
        antipromote: 'antipromote on/off (reverse unauthorized promotions)',
        antidemote: 'antidemote on/off (reverse unauthorized demotions)',
        autoreactstatus: 'autoreactstatus on/off (auto react to statuses)',
        autorecordtyping: 'autorecordtyping on/off (auto recording/typing presence)',
        autosavestatus: 'autosavestatus on/off (permanently save statuses)',
        autoviewstatus: 'autoviewstatus on/off (auto view statuses)',
        clearmenuimages: 'clearmenuimages (clear all menu response images)',
        clearmenuvideos: 'clearmenuvideos (clear all menu response videos)',
        disapproveall: 'disapproveall (reject all pending join requests)',
        getabout: 'getabout [number] (fetch user or group about)',
        getgrouppp: 'getgrouppp (fetch current group profile picture)',
        getid: 'getid [mention] (fetch user, group or bot ID)',
        listonline: 'listonline (show only online group members)',
        listoffline: 'listoffline (show only offline group members)',
        opentime: 'opentime (group creation/open time)',
        vcf: 'vcf (download all members as contacts file)',
        userid: 'userid (user ID details by mention/reply/number)',
        totalmembers: 'totalmembers [list] (group member counts)',
        listinactive: 'listinactive (members not seen online recently)',
        listrequests: 'listrequests (pending group join requests)',
        allow: 'allow [on/off/add/list] (allowed groups management)',
        announcements: 'announcements [on/off] (admins-only group mode)',
        addcode: 'addcode <code> (add redeem/premium code)',
        delcode: 'delcode <code> (delete redeem code)',
        delallowed: 'delallowed [group-id] (remove from allowed list)',
        antiprotection: 'antiprotection (real-time anti-promote/demote status & logs)',
        ytmp3: 'ytmp3 <link/query> (YouTube to MP3 audio)',
        ytmp3doc: 'ytmp3doc <link/query> (YouTube to MP3 document file)',
        weather: 'weather <city> (current weather)',
        time: 'time <city> (local time)',
        date: 'date (current date)',
        cityinfo: 'cityinfo <city> (city information)',
        news: 'news (latest news)',
        covid: 'covid (COVID-19 information)',
        play: 'play <song/query> (play music)',
        skip: 'skip (skip current track)',
        stop: 'stop (stop music)',
        pause: 'pause (pause current track)',
        resume: 'resume (resume current track)',
        queue: 'queue (show music queue)',
        volume: 'volume <0-100> (set music volume)',
        loop: 'loop on/off (repeat music)',
        shuffle: 'shuffle (shuffle music queue)',
        nowplaying: 'nowplaying (current track)',
        waifu: 'waifu (random anime character)',
        husbando: 'husbando (random anime character)',
        neko: 'neko (random anime image)',
        wink: 'wink (reaction GIF)',
        smile: 'smile (reaction GIF)',
        cuddle: 'cuddle (reaction GIF)',
        poke: 'poke (reaction GIF)',
        pat: 'pat (reaction GIF)',
        slap: 'slap (reaction GIF)',
        kiss: 'kiss (reaction GIF)',
        hug: 'hug (reaction GIF)',
        kill: 'kill (reaction GIF)',
        kick: 'kick (reaction GIF, or reply/tag a user to remove them)',
        sleep: 'sleep (reaction GIF)',
        shoot: 'shoot (reaction GIF)',
        cry: 'cry (reaction GIF)',
        wave: 'wave (reaction GIF)',
        angry: 'angry (reaction GIF)',
        highfive: 'highfive (reaction GIF)',
        dance: 'dance (reaction GIF)',
        blush: 'blush (reaction GIF)',
        happy: 'happy (reaction GIF)',
        gpt: 'gpt <prompt> (GPT text answer)',
        gemini: 'gemini <prompt> (Gemini text answer)',
        flux: 'flux <prompt> (Flux image generation)',
        imagine: 'imagine <prompt> (AI image generation)',
        volvideo: 'volvideo [0-300] (adjust video volume)',
        tovideo: 'tovideo (convert replied audio to video)',
        toaudio: 'toaudio (convert replied video to audio)',
        earrape: 'earrape (loud audio effect)',
        reverse: 'reverse (reverse audio)',
        robot: 'robot (robot voice effect)',
        volaudio: 'volaudio [0-300] (adjust audio volume)',
        toptt: 'toptt (convert audio to voice note)',
        tomp3: 'tomp3 (convert replied video to MP3)',
        deep: 'deep (deep voice effect)',
        blown: 'blown (blown speaker effect)',
        bass: 'bass (bass boost effect)',
        triggered: 'triggered (reply to an image)',
        passed: 'passed (reply to an image)',
        jail: 'jail (reply to an image)',
        glass: 'glass (reply to an image)',
        gay: 'gay (reply to an image)',
        comrade: 'comrade (reply to an image)',
        ytcomment: 'ytcomment <comment> (create a YouTube comment card)',
        oogway: 'oogway <quote> (create an Oogway quote)',
        namecard: 'namecard <name> (create a name card)',
        'its-so-stupid': 'its-so-stupid (reply to an image)',
        lgbt: 'lgbt (reply to an image)',
        circle: 'circle (reply to an image)',
        horny: 'horny (reply to an image)',
        heart: 'heart (reply to an image)',
        delsession: 'delsession <sessionId or number> (delete a WhatsApp session)',
        sessions: 'sessions (list WhatsApp sessions)',
        connect: 'connect <sessionId or number> (reconnect a session)',
        song2: 'song2 <song/link> (YouTube song alternate downloader)',
        mediafire: 'mediafire <link> (download MediaFire files)',
        itunes: 'itunes <song> (iTunes song search & preview)',
        cartoonstyle: 'cartoonstyle <text> (cartoon graffiti text effect)',
        blackpinkstyle: 'blackpinkstyle <text> (blackpink style logo)',
        blackpinklogo: 'blackpinklogo <text> (blackpink logo effect)',
        advancedglow: 'advancedglow <text> (advanced glow neon effect)',
        '1917style': '1917style <text> (1917 film style effect)',
        flagtext: 'flagtext <text> (national flag text effect)',
        flag3dtext: 'flag3dtext <text> (flag 3D text effect)',
        effectclouds: 'effectclouds <text> (realistic clouds text effect)',
        dragonball: 'dragonball <text> (dragon ball style effect)',
        gradienttext: 'gradienttext <text> (3D gradient text effect)',
        glowingtext: 'glowingtext <text> (glowing text effect)',
        glitchtext: 'glitchtext <text> (neon glitch text effect)',
        galaxywallpaper: 'galaxywallpaper <text> (galaxy wallpaper text)',
        freecreate: 'freecreate <text> (free 3D hologram text effect)',
        galaxystyle: 'galaxystyle <text> (galaxy style neon effect)',
        makingneon: 'makingneon <text> (making neon light effect)',
        luxurygold: 'luxurygold <text> (luxury gold text effect)',
        logomaker: 'logomaker <text> (text logo maker online)',
        lighteffects: 'lighteffects <text> (neon light effects)',
        incandescent: 'incandescent <text> (incandescent bulbs effect)',
        graffiti: 'graffiti <text> (graffiti text on wall)',
        sand: 'sand <text> (write names on the sand)',
        royaltext: 'royaltext <text> (royal text effect)',
        pixelglitch: 'pixelglitch <text> (pixel glitch text effect)',
        papercutstyle: 'papercutstyle <text> (3D paper cut style text)',
        neonglitch: 'neonglitch <text> (digital glitch text effect)',
        multicoloredneon: 'multicoloredneon <text> (colorful neon light effect)',
        matrix: 'matrix <text> (matrix text effect)',
        writetext: 'writetext <text> (write text in clouds)',
        watercolortext: 'watercolortext <text> (watercolor text effect)',
        typography: 'typography <text> (typography art effect)',
        topography: 'topography <text> (artistic typography)',
        summerbeach: 'summerbeach <text> (summer beach sand text)',
        movie: 'movie <title> (legal watch/download links)',
        imdb: 'imdb <title> (legal watch/download links)',
        tagadmin: 'tagadmin (mention admins)',
        repo: 'repo <owner/repo[/file]> (download)',
        pair: 'pair <number> (secure dashboard pairing)'
    }[name] || name;
}

function buildCommandCategories(commands = {}) {
    const entries = new Map();
    Object.keys(commands).forEach(name => entries.set(name, { name, label: labelFor(name), command: commands[name] }));
    BUILTIN_COMMANDS.forEach(item => {
        if (!entries.has(item.name)) entries.set(item.name, { ...item, command: null });
    });

    const grouped = new Map();
    for (const entry of entries.values()) {
        const category = categoryFor(entry.name, entry.command);
        if (!grouped.has(category)) grouped.set(category, []);
        grouped.get(category).push(entry);
    }
    for (const list of grouped.values()) {
        list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name));
    }
    const categories = {};
    for (const category of CATEGORY_ORDER) {
        if (grouped.has(category)) categories[category] = grouped.get(category);
    }
    for (const [category, list] of grouped.entries()) {
        if (!Object.prototype.hasOwnProperty.call(categories, category)) categories[category] = list;
    }
    return categories;
}

function getCommandCounts(categories) {
    const entries = Object.values(categories).flat();
    return { unique: new Set(entries.map(entry => entry.name)).size, entries: entries.length };
}

module.exports = { CATEGORY_ORDER, buildCommandCategories, getCommandCounts };
