const express = require('express');
const router = express.Router();
const db = require('../db');
const executor = require('../executor');

router.get('/', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    db.bot.find((err, bots) => {
        let started = {};
        for(let i in bots)
            if (bots.hasOwnProperty(i))
                started[bots[i]._id] = executor.isStarted(bots[i]._id);
        res.render('bots', { title: 'Bot Editor', user: req.user, bots: bots, started: started });
    });
});

router.get('/new', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    db.botSchema.find((err, graphs) => {
        res.render('newBot', {
            title: 'Bot Editor',
            user: req.user,
            graphs: graphs,
            error: null
        });
    });
});

router.get('/edit/:id', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    if(req.params.id)
    {
        db.bot.findOne({_id: req.params.id}, (err, oldBot) => {
            if(oldBot)
            {
                db.botSchema.find((err, graphs) => {
                    res.render('editBot', {
                        title: 'Bot Editor',
                        user: req.user,
                        graphs: graphs,
                        error: null,
                        bot: oldBot
                    });
                });
            }
            else
                res.render('error', {code: 404});
        });
    }
});

router.post('/edit/:id', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    if(req.params.id)
    {
        db.bot.findOne({_id: req.params.id}, (err, oldBot) => {
            oldBot.name = req.body.botName;
            oldBot.graph = req.body.graph;
            oldBot.vkActive = req.body.vkActive === 'on';
            oldBot.vkToken = req.body.vkToken;
            oldBot.telegramActive = req.body.telegramActive === 'on';
            oldBot.telegramToken = req.body.telegramToken;
            oldBot.telegramProviderToken = req.body.telegramProviderToken;
            oldBot.viberActive = req.body.viberActive === 'on';
            oldBot.viberToken = req.body.viberToken;
            oldBot.messengerActive = req.body.messengerActive === 'on';
            oldBot.messengerToken = req.body.messengerToken;
            oldBot.whatsupActive = req.body.whatsupActive === 'on';
            oldBot.whatsupToken = req.body.whatsupToken;
            oldBot.save();
            executor.stopBot(oldBot._id);
            executor.startBot(oldBot._id);
            res.redirect('/bot');
        });
    }
});

router.get('/stop/:id', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    executor.stopBot(req.params.id);
    res.redirect('back');
});

router.get('/start/:id', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    executor.startBot(req.params.id);
    res.redirect('back');
});


router.post('/new', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    if(req.body.botName && req.body.graph)
    {
        db.bot.findOne({name: req.body.botName}, (err, bot) => {
            if(!bot) {
                db.bot.create({
                    name: req.body.botName,
                    graph: req.body.graph,
                    vkActive: req.body.vkActive === 'on',
                    vkToken: req.body.vkToken,
                    telegramActive: req.body.telegramActive === 'on',
                    telegramToken: req.body.telegramToken,
                    telegramProviderToken: req.body.telegramProviderToken,
                    viberActive: req.body.viberActive === 'on',
                    viberToken: req.body.viberToken,
                    messengerActive: req.body.messengerActive === 'on',
                    messengerToken: req.body.messengerToken,
                    whatsupActive: req.body.whatsupActive === 'on',
                    whatsupToken: req.body.whatsupToken
                }, (err, bot) => {
                    if(err)
                        console.error(err);
                    else
                        executor.startBot(bot._id);
                    console.log(bot);
                });
                res.redirect('/bot');
            }
            else {
                db.botSchema.find((err, graphs) => {
                    res.render('newBot', {
                        title: 'Bot Editor',
                        user: req.user,
                        graphs: graphs,
                        error: 'Бот с таким именем уже существует'
                    });
                });
            }
        });
    }
    else {
        db.botSchema.find((err, graphs) => {
            res.render('newBot', {
                title: 'Bot Editor',
                user: req.user,
                graphs: graphs,
                error: 'Не все поля заполнены'
            });
        });
    }
});

module.exports = router;
