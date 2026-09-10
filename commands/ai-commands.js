const axios = require('axios');
const { OpenAI } = require('openai');

const MAX_PROMPT_LENGTH = 4000;
const SAFE_SYSTEM_PROMPT = 'You are a respectful WhatsApp assistant. Answer helpfully and clearly. Do not produce harassment, hate speech, sexual abuse, threats, or abusive insults.';

function clean(value) {
    return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function promptFrom(args) {
    return String(Array.isArray(args) ? args.join(' ') : args || '').trim().slice(0, MAX_PROMPT_LENGTH);
}

function providerStatus(error) {
    return Number(error?.status || error?.response?.status || 0);
}

function providerMessage(error) {
    return String(error?.error?.message || error?.response?.data?.error?.message || error?.message || 'unknown error').slice(0, 240);
}

async function sendUsage(sock, chatId, msg, command, description) {
    await sock.sendMessage(chatId, {
        text: `Usage: .${command} <prompt>\n${description}`
    }, { quoted: msg });
}

async function sendConfigError(sock, chatId, msg, command, variable) {
    await sock.sendMessage(chatId, {
        text: `⚠️ .${command} ke liye Railway Variables me ${variable} set karna zaroori hai.`
    }, { quoted: msg });
}

async function react(sock, msg, emoji) {
    try {
        if (msg?.key) await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
    } catch (_) {}
}

async function gpt(sock, chatId, msg, session, args) {
    const prompt = promptFrom(args);
    if (!prompt) return sendUsage(sock, chatId, msg, 'gpt', 'GPT se text answer lene ke liye apna sawaal likhein.');
    await react(sock, msg, '🤖');
    try {
        const answer = await session.getAIResponse(chatId, prompt, SAFE_SYSTEM_PROMPT);
        await sock.sendMessage(chatId, { text: `🤖 GPT\n\n${answer}` }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `⚠️ GPT error: ${providerMessage(error)}` }, { quoted: msg });
    }
}

async function gemini(sock, chatId, msg, session, args) {
    const prompt = promptFrom(args);
    if (!prompt) return sendUsage(sock, chatId, msg, 'gemini', 'Gemini se text answer lene ke liye apna sawaal likhein.');
    const apiKey = clean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    if (!apiKey) return sendConfigError(sock, chatId, msg, 'gemini', 'GEMINI_API_KEY');
    const model = clean(process.env.GEMINI_MODEL) || 'gemini-3.7-flash';
    await react(sock, msg, '✨');
    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await axios.post(endpoint, {
            systemInstruction: { parts: [{ text: SAFE_SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 700 }
        }, { timeout: 15000 });
        const answer = (response.data?.candidates || [])
            .flatMap(candidate => candidate?.content?.parts || [])
            .map(part => part?.text)
            .filter(Boolean)
            .join('\n')
            .trim();
        if (!answer) throw new Error('Gemini ne empty response diya.');
        await sock.sendMessage(chatId, { text: `✨ GEMINI\n\n${answer}` }, { quoted: msg });
    } catch (error) {
        const status = providerStatus(error);
        const detail = status === 400 ? 'Gemini request/model reject hui.' : status === 401 || status === 403 ? 'Gemini API key invalid ya unauthorized hai.' : providerMessage(error);
        await sock.sendMessage(chatId, { text: `⚠️ Gemini error: ${detail}` }, { quoted: msg });
        if (session?.sendLog) session.sendLog(`[AI] Gemini failed (${status || 'network'}): ${providerMessage(error)}`, 'error');
    }
}

function openAIClient() {
    const apiKey = clean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
    if (!apiKey) return null;
    let baseURL = clean(process.env.AI_BASE_URL || process.env.OPENAI_API_BASE) || 'https://api.openai.com/v1';
    baseURL = baseURL.replace(/\/+$/, '');
    try {
        const parsed = new URL(baseURL);
        if (!parsed.pathname || parsed.pathname === '/') parsed.pathname = '/v1';
        baseURL = parsed.toString().replace(/\/$/, '');
    } catch (_) {}
    return new OpenAI({ apiKey, baseURL });
}

async function imagine(sock, chatId, msg, session, args) {
    const prompt = promptFrom(args);
    if (!prompt) return sendUsage(sock, chatId, msg, 'imagine', 'Text prompt se AI image banane ke liye description likhein.');
    const client = openAIClient();
    if (!client) return sendConfigError(sock, chatId, msg, 'imagine', 'OPENAI_API_KEY ya AI_API_KEY');
    const model = clean(process.env.IMAGINE_MODEL || process.env.IMAGE_MODEL) || 'gpt-image-1.5';
    await react(sock, msg, '🎨');
    try {
        const options = { model, prompt, n: 1, size: clean(process.env.IMAGE_SIZE) || '1024x1024' };
        if (/^dall-e/i.test(model)) options.response_format = 'url';
        else options.output_format = 'png';
        const response = await client.images.generate(options);
        const image = response?.data?.[0];
        if (image?.b64_json) {
            await sock.sendMessage(chatId, { image: Buffer.from(image.b64_json, 'base64'), caption: `🎨 IMAGINE\n\n${prompt}` }, { quoted: msg });
        } else if (image?.url) {
            await sock.sendMessage(chatId, { image: { url: image.url }, caption: `🎨 IMAGINE\n\n${prompt}` }, { quoted: msg });
        } else {
            throw new Error('Image provider ne image output nahi diya.');
        }
    } catch (error) {
        const status = providerStatus(error);
        const detail = status === 401 ? 'AI key invalid hai.' : status === 404 ? 'Image model/API URL nahi mila; IMAGINE_MODEL check karein.' : status === 429 ? 'Image provider quota/billing limit reached hai.' : providerMessage(error);
        await sock.sendMessage(chatId, { text: `⚠️ Imagine error: ${detail}` }, { quoted: msg });
        if (session?.sendLog) session.sendLog(`[AI] Imagine failed (${status || 'network'}): ${providerMessage(error)}`, 'error');
    }
}

function imageOutput(output) {
    if (typeof output === 'string') return output;
    if (Array.isArray(output)) {
        for (const item of output) {
            const found = imageOutput(item);
            if (found) return found;
        }
    }
    if (output && typeof output === 'object') {
        return output.url || output.uri || output.image || output.output || null;
    }
    return null;
}

async function waitForFluxPrediction(prediction, token) {
    let current = prediction;
    const getUrl = current?.urls?.get;
    if (!getUrl || ['succeeded', 'failed', 'canceled'].includes(current.status)) return current;
    for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await axios.get(getUrl, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000
        });
        current = response.data;
        if (['succeeded', 'failed', 'canceled'].includes(current?.status)) return current;
    }
    return current;
}

async function flux(sock, chatId, msg, session, args) {
    const prompt = promptFrom(args);
    if (!prompt) return sendUsage(sock, chatId, msg, 'flux', 'Flux image banane ke liye detailed visual prompt likhein.');
    const token = clean(process.env.REPLICATE_API_TOKEN || process.env.FLUX_API_TOKEN);
    if (!token) return sendConfigError(sock, chatId, msg, 'flux', 'REPLICATE_API_TOKEN');
    const model = clean(process.env.FLUX_MODEL) || 'black-forest-labs/flux-2-pro';
    const versionedModel = model.includes(':');
    const endpoint = versionedModel
        ? 'https://api.replicate.com/v1/predictions'
        : `https://api.replicate.com/v1/models/${model}/predictions`;
    await react(sock, msg, '🌀');
    try {
        const body = versionedModel
            ? { version: model.split(':').slice(1).join(':'), input: { prompt } }
            : { input: { prompt } };
        const response = await axios.post(endpoint, body, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Prefer: 'wait=55',
                'Cancel-After': '60s'
            },
            timeout: 65000
        });
        const prediction = await waitForFluxPrediction(response.data, token);
        if (prediction?.status !== 'succeeded') {
            throw new Error(prediction?.error || `prediction ${prediction?.status || 'incomplete'}`);
        }
        const output = imageOutput(prediction.output);
        if (!output || typeof output !== 'string') throw new Error('Flux ne image URL return nahi ki.');
        await sock.sendMessage(chatId, { image: { url: output }, caption: `🌀 FLUX\n\n${prompt}` }, { quoted: msg });
    } catch (error) {
        const status = providerStatus(error);
        const detail = status === 401 ? 'Replicate token invalid hai.' : status === 404 ? 'Flux model nahi mila; FLUX_MODEL check karein.' : status === 429 ? 'Replicate quota/rate limit reached hai.' : providerMessage(error);
        await sock.sendMessage(chatId, { text: `⚠️ Flux error: ${detail}` }, { quoted: msg });
        if (session?.sendLog) session.sendLog(`[AI] Flux failed (${status || 'network'}): ${providerMessage(error)}`, 'error');
    }
}

module.exports = { gpt, gemini, flux, imagine };
