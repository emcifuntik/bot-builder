module.exports = (mongoose) => {
    return mongoose.model('User', new mongoose.Schema({
        name: {
            type: String,
            required: true
        }
    }));
};