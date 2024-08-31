const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Bot'
  },
  progress: {
    type: String,
    default: null
  }
});

userProgressSchema.statics.getProgress = async function (user, bot) {
  try {
    const progress = await this.findOne({ name: user, bot: bot });
    return progress ? progress.progress : null;
  } catch (err) {
    throw err;
  }
};

userProgressSchema.statics.saveProgress = async function (user, bot, progress) {
  try {
    let userProgress = await this.findOne({ name: user, bot: bot });
    if (userProgress) {
      userProgress.progress = progress;
      await userProgress.save();
    } else {
      userProgress = await this.create({ name: user, bot: bot, progress: progress });
    }
  } catch (err) {
    throw err;
  }
};

module.exports = mongoose.model('UserProgress', userProgressSchema);
