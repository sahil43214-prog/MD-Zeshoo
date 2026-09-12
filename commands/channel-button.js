const CHANNEL_JID = '120363429085670060@newsletter';
const CHANNEL_NAME = '𝗠𝗗-𝗭𝗘𝗦𝗛𝗢𝗢-𝗕𝗢𝗧';

function channelContextInfo() {
    return {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: CHANNEL_JID,
            newsletterName: CHANNEL_NAME,
            serverMessageId: -1
        }
    };
}

module.exports = {
    CHANNEL_JID,
    CHANNEL_NAME,
    channelContextInfo
};
