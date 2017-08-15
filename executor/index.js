const VKExec = require('./platforms/vk');
const TelegramExec = require('./platforms/telegram');
const db = require('../db');
const Graph = require('../graph');

let exec = {
  start: () => {
    db.bot.find((err, bots) => {
      for (let bot of bots) {
        if (bot.enabled) {
          let startedBot = {
            botDb: bot,
            vk: null,
            telegram: null,
            viber: null,
            whatsup: null,
            messenger: null
          };
          let graph = new Graph(bot.graph);
          if (bot.vkActive && bot.vkToken)
          {
            startedBot.vk = new VKExec(bot.vkToken, bot._id, graph);
            startedBot.vk.start();
          }
          if(bot.telegramActive && bot.telegramToken)
          {
            startedBot.telegram = new TelegramExec(bot.telegramToken, bot.telegramProviderToken, bot._id, graph);
            startedBot.telegram.start();
          }
          startedBot.started = true;
          exec.startedBots.push(startedBot);
        }
      }
    });
  },
  startBot: (id) => {
    if(!exec.isStarted(id))
    {
      db.bot.findOne({_id: id}, (err, bot) => {
        if(bot) {
          if (bot.enabled) {
            let sBot = exec.getById(id);
            if(sBot === false){
              let startedBot = {
                botDb: bot,
                vk: null,
                telegram: null,
                viber: null,
                whatsup: null,
                messenger: null
              };
              if (bot.vkActive && bot.vkToken)
              {
                startedBot.vk = new VKExec(bot.vkToken, bot._id);
                startedBot.vk.start();
              }
              if(bot.telegramActive && bot.telegramToken)
              {
                startedBot.telegram = new TelegramExec(bot.telegramToken, bot.telegramProviderToken, bot._id);
                startedBot.telegram.start();
              }
              startedBot.started = true;
              exec.startedBots.push(startedBot);
            }
            else {
              if (sBot.vk && bot.vkActive)
                sBot.vk.start();
              else if (bot.vkActive && bot.vkToken)
              {
                sBot.vk = new VKExec(bot.vkToken, bot._id);
                sBot.vk.start();
              }
              if(sBot.telegram && bot.telegramActive)
                sBot.telegram.start();
              else if(bot.telegramActive && bot.telegramToken)
              {
                sBot.telegram = new TelegramExec(bot.telegramToken, bot.telegramProviderToken, bot._id);
                sBot.telegram.start();
              }
              sBot.started = true;
            }
          }
        }
      });
    }
  },
  stopBot: (id) => {
    if(exec.isStarted(id))
    {
      let bot = exec.getById(id);
      if(bot) {
        if (bot.vk)
          bot.vk.stop();
        if(bot.telegram)
          bot.telegram.stop();
        bot.started = false;
      }
    }
  },
  isStarted: (id) => {
    for(let bot of exec.startedBots)
      if(bot.botDb._id.toString() === id.toString())
        return bot.started;
    return false;
  },
  getById: (id) => {
    for(let bot of exec.startedBots)
      if(bot.botDb._id.toString() === id.toString())
        return bot;
    return false;
  },
  startedBots: []
};

module.exports = exec;
