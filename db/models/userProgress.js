module.exports = (mongoose) => {
    let userProgress = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        bot: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        progress: {
            type: String,
            default: null
        }
    });

    let model = mongoose.model('UserProgress', userProgress);
    model.getProgress = (user, bot, cb) => {
        return model.findOne({
            name: user,
            bot: bot
        }, (err, progress) => {

            if(progress)
                cb(progress.progress);
            else
                cb(null);
        });
    };

    model.saveProgress = (user, bot, progress, cb) => {
        return model.findOne({
            name: user,
            bot: bot
        }, (err, _progress) => {
            if(_progress) {
                _progress.progress = progress;
                _progress.save();
                cb(null);
            }
            else
                model.create({
                    name: user,
                    bot: bot,
                    progress: progress
                }, (err, p) => {
                    if(err)
                        cb(err);
                });
        })
    };
    return model;
};