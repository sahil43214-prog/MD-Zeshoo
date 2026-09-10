// .sand — Write names and messages on the sand (EPHOTO360)
const { ephotoCommand } = require('../lib/ephoto-cmd');
module.exports = ephotoCommand(
    'sand',
    'https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html',
    'Write On Sand',
    '🏖️'
);
