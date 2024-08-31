const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  graph: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'BotSchema'
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true
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
  },
  vkToken: {
    type: String
  },
  vkActive: {
    type: Boolean,
    required: true,
    default: false
  },
  telegramToken: {
    type: String
  },
  telegramProviderToken: {
    type: String
  },
  telegramActive: {
    type: Boolean,
    required: true,
    default: false
  },
  whatsupToken: {
    type: String
  },
  whatsupActive: {
    type: Boolean,
    required: true,
    default: false
  },
  viberToken: {
    type: String
  },
  viberActive: {
    type: Boolean,
    required: true,
    default: false
  },
  messengerToken: {
    type: String
  },
  messengerActive: {
    type: Boolean,
    required: true,
    default: false
  }
});

module.exports = mongoose.model('Bot', botSchema);
