module.exports = (mongoose) => {
    return mongoose.model('DocCache', new mongoose.Schema({
        hash: {
            type: String,
            required: true
        },
        doc: {
            type: String,
            required: true
        }
    }));
};