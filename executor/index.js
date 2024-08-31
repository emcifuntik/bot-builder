const VKExec = require('./platforms/vk');
const TelegramExec = require('./platforms/telegram');
const db = require('../db');
const Graph = require('../graph');

const exec = {
  startedBots: [],

  start: async () => {
    try {
      const bots = await db.bot.find().exec();
      bots.forEach(bot => {
        if (bot.enabled) {
          exec.startBotInstance(bot);
        }
      });
    } catch (err) {
      console.error('Error starting bots:', err);
    }
  },

  startBot: async (id) => {
    if (!exec.isStarted(id)) {
      try {
        const bot = await db.bot.findById(id).exec();
        if (bot && bot.enabled) {
          const existingBot = exec.getById(id);
          if (!existingBot) {
            exec.startBotInstance(bot);
          } else {
            exec.restartBotInstance(existingBot, bot);
          }
        }
      } catch (err) {
        console.error('Error starting bot:', err);
      }
    }
  },

  stopBot: (id) => {
    const bot = exec.getById(id);
    if (bot) {
      if (bot.vk) bot.vk.stop();
      if (bot.telegram) bot.telegram.stop();
      bot.started = false;
    }
  },

  isStarted: (id) => {
    return exec.startedBots.some(bot => bot.botDb._id.toString() === id.toString() && bot.started);
  },

  getById: (id) => {
    return exec.startedBots.find(bot => bot.botDb._id.toString() === id.toString()) || false;
  },

  startBotInstance: (bot) => {
    const startedBot = {
      botDb: bot,
      vk: null,
      telegram: null,
      started: true
    };

    const graph = new Graph(bot.graph);

    if (bot.vkActive && bot.vkToken) {
      startedBot.vk = new VKExec(bot.vkToken, bot._id, graph);
      startedBot.vk.start();
    }

    if (bot.telegramActive && bot.telegramToken) {
      startedBot.telegram = new TelegramExec(bot.telegramToken, bot.telegramProviderToken, bot._id, graph);
      startedBot.telegram.start();
    }

    exec.startedBots.push(startedBot);
  },

  restartBotInstance: (existingBot, bot) => {
    if (existingBot.vk) {
      if (bot.vkActive) {
        existingBot.vk.start();
      } else {
        existingBot.vk.stop();
        existingBot.vk = null;
      }
    } else if (bot.vkActive && bot.vkToken) {
      existingBot.vk = new VKExec(bot.vkToken, bot._id);
      existingBot.vk.start();
    }

    if (existingBot.telegram) {
      if (bot.telegramActive) {
        existingBot.telegram.start();
      } else {
        existingBot.telegram.stop();
        existingBot.telegram = null;
      }
    } else if (bot.telegramActive && bot.telegramToken) {
      existingBot.telegram = new TelegramExec(bot.telegramToken, bot.telegramProviderToken, bot._id);
      existingBot.telegram.start();
    }

    existingBot.started = true;
  }
};

module.exports = exec;
