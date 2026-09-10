const axios = require('axios');

const HTTP = axios.create({ timeout: 7000, headers: { 'User-Agent': 'MD-ZESHOO-BOT/4.0 legal-movie-search' } });
const CACHE = new Map();
const CACHE_TTL = 2 * 60 * 1000;
const OMDB_KEY = process.env.OMDB_API_KEY || 'aa9e49f';

function cacheGet(key) {
    const item = CACHE.get(key);
    if (!item || Date.now() - item.time > CACHE_TTL) return null;
    return item.value;
}

function cacheSet(key, value) {
    CACHE.set(key, { time: Date.now(), value });
    if (CACHE.size > 100) CACHE.delete(CACHE.keys().next().value);
}

function encode(value) {
    return encodeURIComponent(String(value || '').trim());
}

function legalSearchLinks(title) {
    const q = encode(title);
    return {
        imdb: `https://www.imdb.com/find/?q=${q}`,
        justwatch: `https://www.justwatch.com/us/search?q=${q}`,
        google: `https://www.google.com/search?q=${encode(`${title} official watch rent buy`)}`
    };
}

async function getMetadata(title) {
    const key = `omdb:${title.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
        const response = await HTTP.get('https://www.omdbapi.com/', {
            params: { t: title, apikey: OMDB_KEY, plot: 'short' }
        });
        const movie = response.data;
        if (movie?.Response === 'True') {
            cacheSet(key, movie);
            return movie;
        }
    } catch (_) {}
    return null;
}

async function getArchiveResults(title) {
    const key = `archive:${title.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
        const response = await HTTP.get('https://archive.org/advancedsearch.php', {
            params: {
                q: `title:(${title}) AND mediatype:movies`,
                fl: ['identifier', 'title', 'year'],
                rows: 3,
                page: 1,
                output: 'json'
            }
        });
        const docs = response.data?.response?.docs || [];
        cacheSet(key, docs);
        return docs;
    } catch (_) {
        return [];
    }
}

async function getAuthorizedDownload(item) {
    try {
        const response = await HTTP.get(`https://archive.org/metadata/${encodeURIComponent(item.identifier)}`);
        const metadata = response.data?.metadata || {};
        const rights = `${metadata.licenseurl || ''} ${metadata.rights || ''} ${metadata.license || ''}`.toLowerCase();
        const authorized = /public.?domain|creativecommons\.org|creative commons|cc-by|cc0/.test(rights);
        if (!authorized) return null;
        const files = response.data?.files || [];
        const file = files.find(f => {
            const format = String(f.format || '').toLowerCase();
            const name = String(f.name || '').toLowerCase();
            return /mp4|mpeg4|webm|ogv|mkv/.test(format) || /\.(mp4|webm|ogv|mkv)$/.test(name);
        });
        if (!file?.name) return null;
        return `https://archive.org/download/${encodeURIComponent(item.identifier)}/${String(file.name).split('/').map(encodeURIComponent).join('/')}`;
    } catch (_) {
        return null;
    }
}

module.exports = async function movieCommand(sock, chatId, msg, q) {
    const title = String(q || '').trim();
    if (!title) {
        return sock.sendMessage(chatId, {
            text: '⚠️ Use: .movie <movie name>\nExample: .movie The Matrix'
        }, { quoted: msg });
    }

    const [movie, archiveItems] = await Promise.all([
        getMetadata(title),
        getArchiveResults(title)
    ]);
    const links = legalSearchLinks(movie?.Title || title);
    const archiveItem = archiveItems[0];
    const authorizedDownload = archiveItem ? await getAuthorizedDownload(archiveItem) : null;

    const displayTitle = movie?.Title || title;
    let text = `🎬 *${displayTitle}${movie?.Year ? ` (${movie.Year})` : ''}*\n\n`;
    if (movie) {
        text += `⭐ Rating: ${movie.imdbRating || 'N/A'}/10\n`;
        text += `📚 Genre: ${movie.Genre || 'N/A'}\n`;
        text += `⏱️ Runtime: ${movie.Runtime || 'N/A'}\n`;
        text += `🎬 Director: ${movie.Director || 'N/A'}\n`;
        text += `📋 ${movie.Plot || 'No short synopsis available.'}\n\n`;
    } else {
        text += 'ℹ️ Metadata service did not return a result; use the legal search links below.\n\n';
    }

    text += `✅ *Legal watch/rent/buy search:*\n${links.justwatch}\n${links.google}\n\n`;
    text += `🔎 *IMDb details:* ${movie?.imdbID ? `https://www.imdb.com/title/${movie.imdbID}` : links.imdb}`;

    if (archiveItem) {
        text += `\n\n📦 *Public-domain/authorized archive result:*\nhttps://archive.org/details/${encodeURIComponent(archiveItem.identifier)}`;
        if (authorizedDownload) {
            text += `\n⬇️ *Authorized download:*\n${authorizedDownload}`;
        } else {
            text += '\n⚠️ Direct download is not shown because the archive item did not clearly declare public-domain or Creative Commons rights.';
        }
    }

    const payload = movie?.Poster && movie.Poster !== 'N/A'
        ? { image: { url: movie.Poster }, caption: text }
        : { text };
    return sock.sendMessage(chatId, payload, { quoted: msg });
};
