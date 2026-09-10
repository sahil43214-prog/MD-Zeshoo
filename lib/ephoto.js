// Ephoto360 scraper — text effect renderer
// Fetches the effect page, resolves the render endpoint, submits text, returns the result image URL.
const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

function buildCookieString(jar) {
    // jar: { name: { value, expires, path } }
    return Object.entries(jar)
        .map(([name, entry]) => `${encodeURIComponent(name)}=${encodeURIComponent(entry.value)}`)
        .join('; ');
}

function normalizeUrl(url, base) {
    if (!url) return null;
    try {
        return new URL(url, base).href;
    } catch (_) {
        return null;
    }
}

async function ephoto360(effectUrl, text) {
    const client = axios.create({ timeout: 60000, headers: HEADERS, maxRedirects: 5 });

    // 1. Fetch the effect page and keep cookies
    const jar = {};
    client.interceptors.response.use(resp => {
        const setCookies = resp.headers['set-cookie'];
        if (setCookies) {
            for (const c of setCookies) {
                const [nameVal, ...rest] = c.split(';');
                const [name, ...vparts] = nameVal.split('=');
                if (name && vparts.length) {
                    jar[name.trim()] = { value: vparts.join('=').trim() };
                }
            }
        }
        return resp;
    });

    const pageRes = await client.get(effectUrl, { headers: { ...HEADERS, Referer: 'https://en.ephoto360.com/' } });
    const $ = cheerio.load(pageRes.data);
    const form = $('#form-value');
    const submitUrl = form.attr('action');
    const token = form.find('input[name="token"]').val();
    const buildServer = $('#build_server') ? $('#build_server').val() : '';

    if (!submitUrl || !token) {
        throw new Error('Effect form not found on page (effect unavailable)');
    }

    // 2. Get session ID from /session endpoint
    const sessionIdRes = await client.get('https://en.ephoto360.com/session', {
        headers: { ...HEADERS, Referer: effectUrl, Cookie: buildCookieString(jar) }
    });
    const sessionId = sessionIdRes.data?.id;
    if (!sessionId) throw new Error('Failed to obtain session id');

    // 3. POST text to render
    const submitRes = await client.post(
        submitUrl,
        new URLSearchParams({ build_server: buildServer, form_value_input: text, token, submit: 'Go' }).toString(),
        {
            headers: {
                ...HEADERS,
                Referer: effectUrl,
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: buildCookieString(jar)
            }
        }
    );
    const $2 = cheerio.load(submitRes.data);
    // 4. Poll image status endpoint
    const imgInput = $2('#image-value');
    const statusUrl = imgInput.attr('data-url') || $2('input[name="form_value_input"]').attr('data-url');
    if (!statusUrl) {
        const direct = $2('#download').attr('href') || $2('.btn-download').attr('href');
        if (direct) return normalizeUrl(direct, effectUrl);
        throw new Error('Render status URL not found');
    }

    const maxPolls = 30;
    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 1500));
        try {
            const pollRes = await client.get(statusUrl, {
                headers: { ...HEADERS, Referer: submitRes.config?.url || submitUrl, Cookie: buildCookieString(jar) }
            });
            const data = pollRes.data;
            let imageUrl = null;
            if (typeof data === 'string') {
                try { imageUrl = JSON.parse(data)?.image || null; } catch (_) {}
            } else {
                imageUrl = data?.image || null;
            }
            if (imageUrl) return normalizeUrl(imageUrl, effectUrl);
        } catch (_) { /* keep polling */ }
    }
    throw new Error('Render timed out');
}

module.exports = { ephoto360 };
