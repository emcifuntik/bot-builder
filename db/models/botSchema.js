module.exports = (mongoose) => {
  return mongoose.model('BotSchema', new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true
    },
    created: {
      type: Date,
      required: true,
      default: Date.now
    },
    updated: {
      type: Date,
      required: true,
      default: Date.now
    }
  }));
};