const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/botbuilder');

module.exports = {
    account: require('./models/account')(mongoose),
    bot: require('./models/bot')(mongoose),
    botSchema: require('./models/botSchema')(mongoose),
    userProgress: require('./models/userProgress')(mongoose),
    payment: require('./models/payment')(mongoose),
    docCache: require('./models/docCache')(mongoose),
    telegramCache: require('./models/telegramCache')(mongoose),
    user: require('./models/user')(mongoose),
    block: require('./models/block')(mongoose),
    variable: require('./models/variable')(mongoose),
    mongoose: mongoose
};