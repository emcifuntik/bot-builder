module.exports = (mongoose) => {
    return mongoose.model('Payment', new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        paymentId: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true,
            default: Date.now
        }
    }));
};