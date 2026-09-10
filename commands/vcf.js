// vcf — download all group members' contact numbers as a .vcf file
const fs = require('fs').promises;
const path = require('path');

module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Ye command sirf group me kaam karti hai.' }, { quoted: msg });
    }
    try {
        const metadata = await sock.groupMetadata(from);
        const members = metadata.participants;
        if (!members || members.length === 0) {
            return await sock.sendMessage(from, { text: '❌ Group me koi member nahi mila.' }, { quoted: msg });
        }

        let vcf = '';
        let count = 0;
        for (const m of members) {
            const num = m.id.split('@')[0];
            vcf += 'BEGIN:VCARD\nVERSION:3.0\n';
            vcf += `FN:Member ${count + 1}\n`;
            vcf += `TEL;TYPE=CELL:+${num}\n`;
            vcf += 'END:VCARD\n';
            count++;
        }

        const dir = path.join(__dirname, '../data');
        await fs.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${metadata.subject.replace(/[^\w]/g, '') || 'group'}-members.vcf`);
        await fs.writeFile(filePath, vcf, 'utf8');

        await sock.sendMessage(from, { text: `✅ *${count} members* ki contacts file ban gayi. Ab file bhej raha hoon...` }, { quoted: msg });
        await sock.sendMessage(from, {
            document: await fs.readFile(filePath),
            mimetype: 'text/vcard',
            fileName: `${(metadata.subject || 'group').slice(0, 25)}-members.vcf`
        }, { quoted: msg });

        try { await fs.unlink(filePath); } catch (_) {}
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
};
