const mongoose = require('mongoose');

const docCacheSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true
  },
  doc: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('DocCache', docCacheSchema);
