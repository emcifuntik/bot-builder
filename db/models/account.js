const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const accountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  }
});

// Apply the passportLocalMongoose plugin to accountSchema
accountSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', accountSchema);
