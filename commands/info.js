const axios = require('axios');

const DEFAULT_TIMEZONE = process.env.BOT_TIMEZONE || 'Asia/Karachi';
const API_TIMEOUT = 12000;

function reply(sock, chatId, msg, text) {
    return sock.sendMessage(chatId, { text }, { quoted: msg });
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-US');
}

function formatDate(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone,
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch (_) {
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    }
}

function formatTime(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(date);
    } catch (_) {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(date);
    }
}

async function geocodeCity(query) {
    const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: query, count: 1, language: 'en', format: 'json' },
        timeout: API_TIMEOUT,
        headers: { 'User-Agent': 'MD-ZESHOO-BOT/4.0' }
    });
    const result = response.data?.results?.[0];
    if (!result) throw new Error('City not found');
    return result;
}

async function dateCommand(sock, chatId, msg) {
    return reply(sock, chatId, msg, `📅 *DATE*

${formatDate()}

Timezone: ${DEFAULT_TIMEZONE}`);
}

async function timeCommand(sock, chatId, msg, query) {
    let timeZone = DEFAULT_TIMEZONE;
    let label = 'Default location';
    if (query) {
        try {
            const city = await geocodeCity(query);
            timeZone = city.timezone || DEFAULT_TIMEZONE;
            label = `${city.name}, ${city.country || ''}`.replace(/, $/, '');
        } catch (_) {
            return reply(sock, chatId, msg, `❌ City not found: ${query}\nExample: .time Lahore`);
        }
    }
    return reply(sock, chatId, msg, `🕒 *LOCAL TIME*\n\n${formatTime(new Date(), timeZone)}\n\nLocation: ${label}\nTimezone: ${timeZone}`);
}

async function cityInfoCommand(sock, chatId, msg, query) {
    if (!query) return reply(sock, chatId, msg, '⚠️ Usage: .cityinfo <city>\nExample: .cityinfo Lahore');
    try {
        const city = await geocodeCity(query);
        const mapUrl = `https://www.google.com/maps?q=${city.latitude},${city.longitude}`;
        const text = `🏙️ *CITY INFO*\n\n` +
            `*City:* ${city.name}\n` +
            `*Country:* ${city.country || 'N/A'} (${city.country_code || 'N/A'})\n` +
            `*Region:* ${city.admin1 || 'N/A'}\n` +
            `*District:* ${city.admin2 || 'N/A'}\n` +
            `*Population:* ${city.population ? formatNumber(city.population) : 'N/A'}\n` +
            `*Timezone:* ${city.timezone || 'N/A'}\n` +
            `*Coordinates:* ${city.latitude}, ${city.longitude}\n` +
            `*Map:* ${mapUrl}`;
        return reply(sock, chatId, msg, text);
    } catch (_) {
        return reply(sock, chatId, msg, `❌ City information nahi mil saki for "${query}".`);
    }
}

async function covidCommand(sock, chatId, msg, query) {
    try {
        const endpoint = query
            ? `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(query)}`
            : 'https://disease.sh/v3/covid-19/all';
        const response = await axios.get(endpoint, { timeout: API_TIMEOUT });
        const data = response.data || {};
        const label = data.country || 'Worldwide';
        const text = `🦠 *COVID-19 SUMMARY: ${label}*\n\n` +
            `*Total cases:* ${formatNumber(data.cases)}\n` +
            `*Today cases:* ${formatNumber(data.todayCases)}\n` +
            `*Deaths:* ${formatNumber(data.deaths)}\n` +
            `*Recovered:* ${formatNumber(data.recovered)}\n` +
            `*Active:* ${formatNumber(data.active)}\n` +
            `*Critical:* ${formatNumber(data.critical)}\n\n` +
            `Source: disease.sh`;
        return reply(sock, chatId, msg, text);
    } catch (_) {
        return reply(sock, chatId, msg, '❌ COVID data abhi available nahi hai. Baad me dobara try karein.');
    }
}

module.exports = {
    date: dateCommand,
    time: timeCommand,
    cityinfo: cityInfoCommand,
    covid: covidCommand,
    formatDate,
    formatTime,
    geocodeCity
};
