const axios = require('axios');

// Country names are resolved to a major city so country-only queries work reliably.
const COUNTRY_CAPITALS = {
    pakistan: 'Islamabad', india: 'New Delhi', portugal: 'Lisbon', poland: 'Warsaw',
    philippines: 'Manila', paraguay: 'Asuncion', iceland: 'Reykjavik', jordan: 'Amman',
    japan: 'Tokyo', jamaica: 'Kingston', 'kingdom of serbia': 'Belgrade', serbia: 'Belgrade',
    yugoslavia: 'Belgrade', korea: 'Seoul', 'south korea': 'Seoul', 'north korea': 'Pyongyang',
    kenya: 'Nairobi', kazakhstan: 'Astana', iran: 'Tehran', iraq: 'Baghdad',
    ireland: 'Dublin', italy: 'Rome', indonesia: 'Jakarta', hungary: 'Budapest',
    afghanistan: 'Kabul', australia: 'Canberra', azerbaijan: 'Baku', bangladesh: 'Dhaka',
    bahrain: 'Manama', bahamas: 'Nassau', 'the bahamas': 'Nassau', argentina: 'Buenos Aires',
    'antigua barbuda': "Saint John's", 'antigua and barbuda': "Saint John's"
};

function normalizeQuery(value) {
    return String(value || '').trim().toLowerCase().replace(/[.,/]+/g, ' ').replace(/\s+/g, ' ');
}

function resolveWeatherLocation(query) {
    const normalized = normalizeQuery(query);
    return COUNTRY_CAPITALS[normalized] || String(query).trim();
}

function firstValue(value, fallback = 'N/A') {
    if (Array.isArray(value)) return value[0]?.value ?? fallback;
    return value ?? fallback;
}

async function getWeather(query) {
    const location = resolveWeatherLocation(query);
    const response = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
        timeout: 15000,
        headers: { 'User-Agent': 'MD-ZESHOO-BOT/4.0' }
    });
    const data = response.data;
    const current = data?.current_condition?.[0];
    const area = data?.nearest_area?.[0];
    if (!current || !area) throw new Error('Location not found');
    return {
        requested: query,
        location,
        city: firstValue(area.areaName),
        country: firstValue(area.country),
        temperatureC: firstValue(current.temp_C),
        temperatureF: firstValue(current.temp_F),
        humidity: firstValue(current.humidity),
        wind: firstValue(current.windspeedKmph),
        windDirection: firstValue(current.winddir16point),
        visibility: firstValue(current.visibility),
        condition: firstValue(current.weatherDesc),
        localTime: firstValue(area.localtime, 'N/A')
    };
}

module.exports = async function weatherCommand(sock, chatId, msg, query) {
    if (!query) {
        return sock.sendMessage(chatId, {
            text: '⚠️ Usage: .weather <city or country>\nExample: .weather Pakistan\nExample: .weather India'
        }, { quoted: msg });
    }
    try {
        await sock.sendMessage(chatId, { text: '⛅ Fetching weather...' }, { quoted: msg });
        const weather = await getWeather(query);
        const text = `*⛅ WEATHER: ${weather.city}, ${weather.country}*\n\n` +
            `*Requested:* ${weather.requested}\n` +
            `🌡️ *Temperature:* ${weather.temperatureC}°C / ${weather.temperatureF}°F\n` +
            `💧 *Humidity:* ${weather.humidity}%\n` +
            `💨 *Wind:* ${weather.wind} km/h (${weather.windDirection})\n` +
            `👁️ *Visibility:* ${weather.visibility} km\n` +
            `🔔 *Condition:* ${weather.condition}\n` +
            `🕒 *Local time:* ${weather.localTime}`;
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ Weather nahi mil saka for "${query}". City ka naam try karein, jaise .weather Lahore ya .weather Tokyo.`
        }, { quoted: msg });
    }
};

module.exports.getWeather = getWeather;
module.exports.resolveWeatherLocation = resolveWeatherLocation;
