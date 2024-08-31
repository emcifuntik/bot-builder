const mongoose = require('mongoose');

class BlockClass {
  get actionObject() {
    return JSON.parse(this.action || '{}');
  }
}

const blockSchema = new mongoose.Schema({
  botSchema: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'BotSchema'
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  position_x: {
    type: Number,
    required: true,
    default: 0
  },
  position_y: {
    type: Number,
    required: true,
    default: 0
  },
  children: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
    ref: 'Block'
  },
  action: {
    type: String,
    default: ''
  }
});

blockSchema.loadClass(BlockClass);

module.exports = mongoose.model('Block', blockSchema);
