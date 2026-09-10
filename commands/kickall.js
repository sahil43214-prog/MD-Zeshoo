const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const delay = ms => new Promise(res => setTimeout(res, ms));

async function kickallCommand(sock, from, msg, isAdmin) {
    const isGroup = from.endsWith('@g.us');
    if (!isGroup) return await sock.sendMessage(from, { text: '❌ This command only works in groups!' }, { quoted: msg });
    
    // Only admins/owner can use this command
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Only group admins can use this command!' }, { quoted: msg });

    try {
        // 1. Get Bot ID and Metadata
        const botId = jidNormalizedUser(sock.user.id);
        const botNumber = botId.split('@')[0].split(':')[0];
        
        let groupMetadata = await sock.groupMetadata(from);
        let botParticipant = groupMetadata.participants.find(p => 
            jidNormalizedUser(p.id) === botId || p.id.includes(botNumber)
        );

        // Retry logic for metadata
        if (!botParticipant) {
            await delay(1500);
            groupMetadata = await sock.groupMetadata(from);
            botParticipant = groupMetadata.participants.find(p => 
                jidNormalizedUser(p.id) === botId || p.id.includes(botNumber)
            );
        }

        // 2. Admin Status Check with Bypass
        const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
        
        if (!isBotAdmin) {
            try {
                await sock.groupInviteCode(from);
            } catch (err) {
                return await sock.sendMessage(from, { 
                    text: `❌ *ADMIN ERROR*\n\nI am not an admin in this group. Please make me admin first.` 
                }, { quoted: msg });
            }
        }

        // 3. Prepare Lists
        const senderId = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);
        const senderNumber = senderId.split('@')[0].split(':')[0];

        // List of members to kick (Non-admins)
        const participantsToKick = groupMetadata.participants
            .filter(p => {
                const pId = p.id.split('@')[0].split(':')[0];
                return pId !== botNumber && pId !== senderNumber && !p.admin;
            })
            .map(p => p.id);

        // List of admins to demote (All admins except sender and bot)
        const adminsToDemote = groupMetadata.participants
            .filter(p => {
                const pId = p.id.split('@')[0].split(':')[0];
                return pId !== botNumber && pId !== senderNumber && (p.admin === 'admin' || p.admin === 'superadmin');
            })
            .map(p => p.id);

        if (participantsToKick.length === 0 && adminsToDemote.length === 0) {
            return await sock.sendMessage(from, { text: '❌ No members to kick or admins to demote.' }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ *HIJACK IN PROGRESS...*\n\nTarget:\n- Kick: ${participantsToKick.length} members\n- Dismiss: ${adminsToDemote.length} admins\n\n_Bot is taking full control..._` }, { quoted: msg });

        // 4. Execution: Kicking Members
        let kickedCount = 0;
        for (const jid of participantsToKick) {
            try {
                await sock.groupParticipantsUpdate(from, [jid], 'remove');
                kickedCount++;
                await delay(2500); // Safe delay
            } catch (err) {
                await delay(1000);
            }
        }

        // 5. Execution: Dismissing (Demoting) Admins
        let demotedCount = 0;
        for (const jid of adminsToDemote) {
            try {
                await sock.groupParticipantsUpdate(from, [jid], 'demote');
                demotedCount++;
                await delay(2000); // Safe delay
            } catch (err) {
                await delay(1000);
            }
        }

        // 6. HIJACK COMPLETION - RENAME AND MESSAGE
        try {
            // Change Group Name to: ꧁⚔️𝘼𝙥𝙠𝙖 𝙈𝙪𝙨𝙠𝙪𝙧𝙖𝙣𝙖⚔️꧂
            await sock.groupUpdateSubject(from, "꧁⚔️𝘼𝙥𝙠𝙖 𝙈𝙪𝙨𝙠𝙪𝙧𝙖𝙣𝙖⚔️꧂");
            
            // Send Hijack Message
            const hijackMsg = `𝘼𝙋𝙆𝘼 𝙂𝙍𝙊𝙐𝙋 𝙈𝙀𝙍𝙀 𝙋𝘼𝙎 👑\n\n𝘏𝘢𝘮 𝘔𝘦𝘩𝘧𝘪𝘭  𝘔𝘦 𝘈𝘵𝘦 𝘕𝘢𝘩𝘪, 𝘉𝘢𝘭𝘬𝘪 𝘗𝘶𝘳𝘪 𝘔𝘦𝘩𝘧𝘪𝘭 𝘒𝘰 (𝙁𝙞𝙖𝙢𝙖𝙣𝙞𝙡𝙡𝙖𝙝) 𝘒𝘢𝘳 𝘓𝘦𝘵𝘦 𝘏𝘦𝘪𝘯\n\n𝙏𝙝𝙞𝙨 𝙞𝙨 𝙕𝙚𝙨𝙝𝙤𝙤. 😎🔥`;
            
            await sock.sendMessage(from, { text: hijackMsg });
            
            // Final Status
            await sock.sendMessage(from, { 
                text: `✅ *HIJACK COMPLETED*\n\n📊 *Final Report:*\n- Members Kicked: ${kickedCount}\n- Admins Dismissed: ${demotedCount}\n- Group Renamed: YES\n- Hijack Message: SENT\n\n_Only YOU and the BOT are now admins._` 
            }, { quoted: msg });

        } catch (hijackErr) {
            console.error("Hijack Final Steps Error:", hijackErr.message);
            await sock.sendMessage(from, { text: `✅ Hijack partially completed. Kicked: ${kickedCount}, Demoted: ${demotedCount}. Failed to rename or send final message.` }, { quoted: msg });
        }

    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
}

module.exports = kickallCommand;
