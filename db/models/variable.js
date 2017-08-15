module.exports = (mongoose) => {
  let variable = new mongoose.Schema({
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Bot'
    },
    user: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['number', 'string'],
      required: true
    },
    value_number: {
      type: Number,
      default: 0
    },
    value_string: {
      type: String,
      default: ''
    }
  });
  return mongoose.model('Variable', variable);
};