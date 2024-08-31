const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model('BotSchema', botSchema);
