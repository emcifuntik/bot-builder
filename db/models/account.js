module.exports = (mongoose) => {
    const passportLocalMongoose = require('passport-local-mongoose');

    const Account = new mongoose.Schema({
        username: String,
        password: String
    });

    Account.plugin(passportLocalMongoose);
    return mongoose.model('accounts', Account);
};