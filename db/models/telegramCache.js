module.exports = (mongoose) => {
    return mongoose.model('TelegramCache', new mongoose.Schema({
        hash: {
            type: String,
            required: true
        },
        bot: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        fileId: {
            type: String,
            required: true
        }
    }));
};