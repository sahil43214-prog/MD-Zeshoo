// .1917style — 1917 film-style text effect (EPHOTO360)
// NOTE: filename is style1917.js because JS module names cannot start with a digit;
// the bot command name is registered as "1917style" in index.js.
const { ephotoCommand } = require('../lib/ephoto-cmd');
module.exports = ephotoCommand(
    '1917style',
    'https://en.ephoto360.com/1917-style-text-effect-523.html',
    '1917 Style',
    '🎬'
);
