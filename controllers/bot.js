const express = require('express');
const router = express.Router();
const db = require('../db');
const executor = require('../executor');

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

// GET bots page
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const bots = await db.bot.find();
    const started = {};

    bots.forEach(bot => {
      started[bot._id] = executor.isStarted(bot._id);
    });

    res.render('bots', { title: 'Bot Editor', user: req.user, bots, started });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { code: 500 });
  }
});

// GET new bot page
router.get('/new', ensureAuthenticated, async (req, res) => {
  try {
    const graphs = await db.botSchema.find();
    res.render('newBot', { title: 'Bot Editor', user: req.user, graphs, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { code: 500 });
  }
});

// GET edit bot page
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const bot = await db.bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).render('error', { code: 404 });
    }

    const graphs = await db.botSchema.find();
    res.render('editBot', { title: 'Bot Editor', user: req.user, graphs, error: null, bot });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { code: 500 });
  }
});

// POST edit bot
router.post('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const bot = await db.bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).render('error', { code: 404 });
    }

    bot.name = req.body.botName;
    bot.graph = req.body.graph;
    bot.vkActive = req.body.vkActive === 'on';
    bot.vkToken = req.body.vkToken;
    bot.telegramActive = req.body.telegramActive === 'on';
    bot.telegramToken = req.body.telegramToken;
    bot.telegramProviderToken = req.body.telegramProviderToken;
    bot.viberActive = req.body.viberActive === 'on';
    bot.viberToken = req.body.viberToken;
    bot.messengerActive = req.body.messengerActive === 'on';
    bot.messengerToken = req.body.messengerToken;
    bot.whatsupActive = req.body.whatsupActive === 'on';
    bot.whatsupToken = req.body.whatsupToken;

    await bot.save();

    executor.stopBot(bot._id);
    executor.startBot(bot._id);

    res.redirect('/bot');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { code: 500 });
  }
});

// GET stop bot
router.get('/stop/:id', ensureAuthenticated, (req, res) => {
  executor.stopBot(req.params.id);
  res.redirect('back');
});

// GET start bot
router.get('/start/:id', ensureAuthenticated, (req, res) => {
  executor.startBot(req.params.id);
  res.redirect('back');
});

// POST new bot
router.post('/new', ensureAuthenticated, async (req, res) => {
  const { botName, graph, vkActive, vkToken, telegramActive, telegramToken, telegramProviderToken, viberActive, viberToken, messengerActive, messengerToken, whatsupActive, whatsupToken } = req.body;

  if (!botName || !graph) {
    const graphs = await db.botSchema.find();
    return res.render('newBot', {
      title: 'Bot Editor',
      user: req.user,
      graphs,
      error: 'Не все поля заполнены'
    });
  }

  try {
    const existingBot = await db.bot.findOne({ name: botName });
    if (existingBot) {
      const graphs = await db.botSchema.find();
      return res.render('newBot', {
        title: 'Bot Editor',
        user: req.user,
        graphs,
        error: 'Бот с таким именем уже существует'
      });
    }

    const bot = await db.bot.create({
      name: botName,
      graph,
      vkActive: vkActive === 'on',
      vkToken,
      telegramActive: telegramActive === 'on',
      telegramToken,
      telegramProviderToken,
      viberActive: viberActive === 'on',
      viberToken,
      messengerActive: messengerActive === 'on',
      messengerToken,
      whatsupActive: whatsupActive === 'on',
      whatsupToken
    });

    executor.startBot(bot._id);
    res.redirect('/bot');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { code: 500 });
  }
});

module.exports = router;
