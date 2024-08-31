const mongoose = require('mongoose');

const telegramCacheSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true
  },
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Bot'
  },
  fileId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('TelegramCache', telegramCacheSchema);
