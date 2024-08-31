const { Telegraf, Markup } = require('telegraf');
const db = require('../../db');
const Graph = require('../../graph');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const email = require('emailjs');

const server = email.server.connect({
  user: 'eugene@migheap.com',
  password: 'Jenia199555',
  host: 'smtp.yandex.ru',
  port: 465,
  ssl: true
});

class TelegramExec {
  constructor(token, paymentToken, botID, graph) {
    this.api = new Telegraf(token);
    this.botID = botID;
    this.paymentToken = paymentToken;
    this.botGraph = graph;
    this.started = false;
    this.currentSelection = [];
    this.isMenu = {};
    this.menu = ['Начать заново', 'Другие проекты', 'Связаться с нами', 'Продолжить'];
    this.api.on('message', this.onMessage.bind(this));
    this.api.on('pre_checkout_query', this.onPreCheckout.bind(this));
  }

  async getImage(filename) {
    const buffer = fs.readFileSync(path.resolve('public/images/' + filename));
    const hash = crypto.createHash('md5').update(filename).digest('hex');
    const file = await db.telegramCache.findOne({ bot: this.botID, hash });
    return { fileId: file ? file.fileId : null, buffer, hash };
  }

  async onPreCheckout(ctx) {
    const from = ctx.update.pre_checkout_query.from.id;
    const invoice = ctx.update.pre_checkout_query.invoice_payload;
    const payment = await db.payment.findOne({ name: from, paymentId: invoice });
    ctx.answerPreCheckoutQuery(!payment, payment ? 'Вы уже оплатили этот квест' : '');
  }

  async onMessage(ctx) {
    if (!this.botGraph) return;

    const userID = 'telegram-' + ctx.from.id;
    const user = await db.user.findOne({ name: userID });

    if (!user) {
      await db.user.create({ name: userID });
    }

    if (ctx.updateSubType === 'successful_payment') {
      await db.payment.create({
        name: userID,
        paymentId: ctx.update.message.successful_payment.invoice_payload
      });
      ctx.reply('Оплата прошла успешно!');
      return;
    }

    if (this.isMenu[userID]) {
      this.handleMenu(ctx, userID);
      return;
    }

    this.processMessage(ctx, userID);
  }

  handleMenu(ctx, userID) {
    const selection = ctx.message.text;
    switch (this.menu.indexOf(selection)) {
      case 0:
        db.userProgress.saveProgress(userID, this.botID, null);
        ctx.reply('Прогресс сброшен', Markup.keyboard(['Далее']).oneTime().resize().extra());
        break;
      case 1:
        ctx.reply('vk.com/horoshocrew', Markup.keyboard(['Далее']).oneTime().resize().extra());
        break;
      case 2:
        ctx.reply('t.me/ghezzi_rus', Markup.keyboard(['Далее']).oneTime().resize().extra());
        break;
      case 3:
        delete this.isMenu[userID];
        break;
      default:
        break;
    }
  }

  async processMessage(ctx, userID) {
    let current = await this.botGraph.getStart();

    const progress = await db.userProgress.getProgress(userID, this.botID);
    if (progress !== null) {
      current = await this.botGraph.getVertice(progress);
    }

    const repeat = async (vertice) => {
      const variables = await db.variable.find({ bot: this.botID, user: userID });
      const blockText = this.replaceVariables(vertice.actionObject?.text || '', variables);

      const nextFunction = vertice.actionObject?.delay
        ? (fn) => setTimeout(fn, vertice.actionObject.delay * 1000)
        : process.nextTick;

      switch (vertice.type) {
        case 'text':
        case 'start':
          await this.handleTextStart(ctx, vertice, blockText, nextFunction, repeat);
          break;
        case 'pay':
          await this.handlePayment(ctx, vertice, userID, nextFunction, repeat);
          break;
        case 'question':
          await this.handleQuestion(ctx, vertice, userID, blockText, repeat);
          break;
        case 'textinput':
          await this.handleTextInput(ctx, vertice, userID, variables, repeat);
          break;
        case 'sendmail':
          this.handleSendMail(userID, vertice, blockText, nextFunction, repeat);
          break;
        case 'math':
          await this.handleMath(vertice, userID, variables, nextFunction, repeat);
          break;
        case 'condition':
          await this.handleCondition(vertice, userID, variables, nextFunction, repeat);
          break;
        case 'final':
          await this.handleFinal(ctx, vertice, blockText);
          break;
      }
    };

    repeat(current);
  }

  replaceVariables(text, variables) {
    variables.forEach((v) => {
      const regex = new RegExp(`{{${v.name}}}`, 'g');
      text = text.replace(regex, v.type === 'number' ? v.value_number : v.value_string);
    });
    return text;
  }

  async handleTextStart(ctx, vertice, blockText, nextFunction, repeat) {
    const next = repeat.bind(null, await this.botGraph.getVertice(this.getRandomChild(vertice)));
    if (vertice.actionObject?.image) {
      const { fileId, buffer, hash } = await this.getImage(vertice.actionObject.image);
      if (fileId) {
        await ctx.telegram.sendPhoto(ctx.from.id, fileId);
      } else {
        const photo = await ctx.telegram.sendPhoto(ctx.from.id, { source: buffer });
        await db.telegramCache.create({
          bot: this.botID,
          hash,
          fileId: photo.photo[photo.photo.length - 1].file_id
        });
      }
      if (vertice.actionObject.text) {
        await ctx.telegram.sendMessage(ctx.from.id, blockText);
      }
    } else if (vertice.actionObject?.text) {
      await ctx.telegram.sendMessage(ctx.from.id, blockText);
    }
    nextFunction(next);
  }

  async handlePayment(ctx, vertice, userID, nextFunction, repeat) {
    const payment = await db.payment.findOne({
      name: userID,
      paymentId: vertice.actionObject.paymentId
    });

    if (payment) {
      const next = repeat.bind(null, await this.botGraph.getVertice(this.getRandomChild(vertice)));
      nextFunction(next);
    } else {
      await ctx.telegram.sendInvoice(ctx.from.id, {
        title: 'Quest access',
        description: vertice.actionObject.text,
        payload: vertice.actionObject.paymentId,
        provider_token: this.paymentToken,
        start_parameter: Math.random().toString(36).substr(2),
        currency: 'RUB',
        prices: [{ label: 'Доступ', amount: Math.round(parseFloat(vertice.actionObject.paymentValue) * 100) }]
      });
      await db.userProgress.saveProgress(userID, this.botID, vertice._id);
    }
  }

  async handleQuestion(ctx, vertice, userID, blockText, repeat) {
    if (this.currentSelection.length === 0) {
      for (let a of vertice.children) {
        const childVertice = await this.botGraph.getVertice(a);
        if (childVertice?.actionObject?.text) {
          this.currentSelection.push(childVertice.actionObject.text);
        }
      }
      this.currentSelection.push('Меню');
    }

    if (this.currentSelection.includes(ctx.message.text)) {
      const number = this.currentSelection.indexOf(ctx.message.text);
      const nextVertice = await this.botGraph.getVertice(vertice.children[number]);
      const nxt = await this.botGraph.getVertice(this.getRandomChild(nextVertice));
      repeat(nxt);
    } else if (ctx.message.text === 'Меню') {
      this.isMenu[userID] = true;
      const replyOptions = Markup.keyboard(this.menu).oneTime().resize().extra();
      await ctx.telegram.sendMessage(ctx.from.id, 'Меню', replyOptions);
    } else {
      repeat(vertice);
    }
  }

  async handleTextInput(ctx, vertice, userID, variables, repeat) {
    const varName = vertice.actionObject.varname;
    let stored = false;

    for (let v of variables) {
      if (v.name === varName) {
        v.value_string = ctx.message.text.trim();
        await v.save();
        stored = true;
      }
    }

    if (!stored) {
      await db.variable.create({
        bot: this.botID,
        user: userID,
        name: varName,
        type: 'string',
        value_string: ctx.message.text.trim()
      });
    }

    const next = await this.botGraph.getVertice(this.getRandomChild(vertice));
    repeat(next);
  }

  handleSendMail(userID, vertice, blockText, nextFunction, repeat) {
    server.send(
      {
        from: `${userID} <eugene@migheap.com>`,
        to: `Admin <${vertice.actionObject.recipient}>`,
        subject: vertice.actionObject.subject,
        text: blockText
      },
      (err) => {
        if (err) console.log(err);
      }
    );
    const next = repeat.bind(null, this.botGraph.getVertice(this.getRandomChild(vertice)));
    nextFunction(next);
  }

  async handleMath(vertice, userID, variables, nextFunction, repeat) {
    const varName = vertice.actionObject.varName;
    const value = parseFloat(vertice.actionObject.value);
    const operation = vertice.actionObject.operation;

    for (let v of variables) {
      if (v.name === varName) {
        if (v.type !== 'number') {
          v.type = 'number';
        }
        switch (operation) {
          case '=':
            v.value_number = value;
            break;
          case '+':
            v.value_number += value;
            break;
          case '-':
            v.value_number -= value;
            break;
          case '*':
            v.value_number *= value;
            break;
          case '/':
            v.value_number /= value;
            break;
        }
        await v.save();
      }
    }

    const next = repeat.bind(null, this.botGraph.getVertice(this.getRandomChild(vertice)));
    nextFunction(next);
  }

  async handleCondition(vertice, userID, variables, nextFunction, repeat) {
    const varName = vertice.actionObject.varName;
    const value = vertice.actionObject.value;
    const event = vertice.actionObject.event;

    let isTrue = false;

    for (let v of variables) {
      if (v.name === varName) {
        switch (event) {
          case '==':
            isTrue = v.value_number == value;
            break;
          case '!=':
            isTrue = v.value_number != value;
            break;
          case '>':
            isTrue = v.value_number > value;
            break;
          case '>=':
            isTrue = v.value_number >= value;
            break;
          case '<':
            isTrue = v.value_number < value;
            break;
          case '<=':
            isTrue = v.value_number <= value;
            break;
        }
      }
    }

    const nextVertice = await this.botGraph.getVertice(
      isTrue && vertice.children.length >= 1 ? vertice.children[0] : vertice.children[1]
    );
    nextFunction(repeat.bind(null, nextVertice));
  }

  async handleFinal(ctx, vertice, blockText) {
    const replyOptions = Markup.keyboard(['Заново']).oneTime().resize().extra();
    if (vertice.actionObject?.image) {
      const { fileId, buffer, hash } = await this.getImage(vertice.actionObject.image);
      if (fileId) {
        await ctx.telegram.sendPhoto(ctx.from.id, fileId);
      } else {
        const photo = await ctx.telegram.sendPhoto(ctx.from.id, { source: buffer });
        await db.telegramCache.create({
          bot: this.botID,
          hash,
          fileId: photo.photo[photo.photo.length - 1].file_id
        });
      }
      if (vertice.actionObject.text) {
        await ctx.telegram.sendMessage(ctx.from.id, blockText, replyOptions);
      }
    } else if (vertice.actionObject?.text) {
      await ctx.telegram.sendMessage(ctx.from.id, blockText, replyOptions);
    }

    await db.userProgress.saveProgress(userID, this.botID, null);
  }

  getRandomChild(vertice) {
    return vertice.children[Math.floor(Math.random() * vertice.children.length)];
  }

  start() {
    if (!this.started) {
      this.started = true;
      this.api.startPolling();
    }
  }

  stop() {
    if (this.started) {
      this.started = false;
      this.api.stop();
    }
  }
}

module.exports = TelegramExec;
