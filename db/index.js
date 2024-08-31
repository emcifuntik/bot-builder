const mongoose = require('mongoose');

// Connection URI
const mongoURI = 'mongodb://localhost:27017/botbuilder';

// Connect to MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
});

module.exports = {
    account: require('./models/account'),
    bot: require('./models/bot'),
    botSchema: require('./models/botSchema'),
    userProgress: require('./models/userProgress'),
    payment: require('./models/payment'),
    docCache: require('./models/docCache'),
    telegramCache: require('./models/telegramCache'),
    user: require('./models/user'),
    block: require('./models/block'),
    variable: require('./models/variable'),
    mongoose: mongoose
};
