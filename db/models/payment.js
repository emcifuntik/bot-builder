const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model('Payment', paymentSchema);
