const Telegraf = require('telegraf');
const {
  Markup,
  Telegram
} = require('telegraf');
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
    this.menu = [
      'Начать заново',
      'Другие проекты',
      'Связаться с нами',
      'Продолжить'
    ];
    this.api.on('message', this.onMessage.bind(this));
    this.api.on('pre_checkout_query', this.onPreCheckout.bind(this));
  }

  getImage(filename, cb) {
    let buffer = fs.readFileSync(path.resolve('public/images/' + filename));
    let hash = crypto.createHash('md5').update(filename).digest('hex');
    db.telegramCache.findOne({
      bot: this.botID,
      hash: hash
    }, (err, file) => {
      if (file)
        cb(file.fileId, hash);
      else
        cb(buffer, hash);
    });
  }

  onPreCheckout(ctx) {
    let from = ctx.update.pre_checkout_query.from.id;
    let invoice = ctx.update.pre_checkout_query.invoice_payload;
    db.payment.findOne({
      name: from,
      paymentId: invoice
    }, (err, pay) => {
      if (pay) {
        ctx.answerPreCheckoutQuery(false, 'Вы уже оплатили этот квест');
      } else
        ctx.answerPreCheckoutQuery(true);
    });
  }

  onMessage(ctx) {
    if (!this.botGraph)
      return;
    let userID = 'telegram-' + ctx.from.id;
    db.user.findOne({
      name: userID
    }, (err, user) => {
      if (!user)
        db.user.create({
          user: userID
        });
    });
    if (ctx.updateSubType === 'successful_payment') {
      console.log(ctx.update.message.successful_payment);
      db.payment.create({
        name: userID,
        paymentId: ctx.update.message.successful_payment.invoice_payload
      }, (err, pay) => {
        ctx.reply('Оплата прошла успешно!');
      });
      return;
    }

    if(userID in this.isMenu) {
      if(this.menu.indexOf(ctx.message.text) != -1) {
        switch(this.menu.indexOf(ctx.message.text)) {
          case 0:
          db.userProgress.saveProgress(userID, this.botID, null, (err) => {});
          ctx.telegram.sendMessage(ctx.from.id, 'Прогресс сброшен', Markup.keyboard(['Далее']).oneTime().resize().extra());
          return;
          case 1:
          ctx.telegram.sendMessage(ctx.from.id, 'vk.com/horoshocrew', Markup.keyboard(['Далее']).oneTime().resize().extra());
          return;
          case 2: 
          ctx.telegram.sendMessage(ctx.from.id, 't.me/ghezzi_rus', Markup.keyboard(['Далее']).oneTime().resize().extra());
          return;
          case 3:
          delete this.isMenu[userID];
          break;
          default:
          return;
        }
      }
    }

    db.userProgress.getProgress(userID, this.botID, async (progress) => {
      let current = null;
      let handled = false;
      if (progress === null)
        current = await this.botGraph.getStart();
      else
        current = await this.botGraph.getVertice(progress);
      let getRandom = (arr) => {
        return arr[Math.round(Math.random() * (arr.length - 1))];
      };
      let loops = 0;
      let repeat = async (vertice) => {
        loops++;
        let variables = [];
          let blockText = '';
          try {
            variables = await db.variable.find({bot: this.botID, user: userID});
            if (vertice.actionObject 
            && 'text' in vertice.actionObject 
            && vertice.actionObject.text != null
            && vertice.actionObject.text.length > 0) {
              blockText = vertice.actionObject.text;
              for(let v of variables) {
                while(blockText.indexOf('{{' + v.name + '}}') != -1) {
                  blockText = blockText.replace(
                    '{{' + v.name + '}}', 
                    v.type == 'number' ? v.value_number : v.value_string
                  );
                }
              }
            }
          }
          catch(err) {
            console.error(err);
          }

          let nextFunction = null;
          if (vertice.actionObject 
          && 'delay' in vertice.actionObject 
          && vertice.actionObject.delay !== null
          && vertice.actionObject.delay != 0) {
            let _nextFunction = (delay, fn) => {
              setTimeout(fn, delay)
            };
            nextFunction = _nextFunction.bind(null, vertice.actionObject.delay * 1000);
          }
          else {
            nextFunction = process.nextTick;
          }

          switch (vertice.type) {
          case 'text':
          case 'start':
          {
            let next = repeat.bind(null,
              await this.botGraph.getVertice(getRandom(vertice.children))
            );
            if (vertice.actionObject && (vertice.actionObject.image || vertice.actionObject.text)) {
              if (vertice.actionObject.image) {
                this.getImage(vertice.actionObject.image, (img, hash) => {
                  if (typeof img === 'string') {
                    ctx.telegram.sendPhoto(ctx.from.id, img).then(() => {
                      if (vertice.actionObject.text)
                        ctx.telegram.sendMessage(ctx.from.id, blockText).then(nextFunction.bind(null, next));
                      else
                        nextFunction(next);
                    })
                  } else {
                    ctx.telegram.sendPhoto(ctx.from.id, {
                      source: img
                    }).then((photo) => {
                      db.telegramCache.create({
                        bot: this.botID,
                        hash: hash,
                        fileId: photo.photo[photo.photo.length - 1].file_id
                      });
                      if (vertice.actionObject.text)
                        ctx.telegram.sendMessage(ctx.from.id, blockText).then(nextFunction.bind(null, next));
                      else
                        nextFunction(next);
                    });
                  }
                });
              } else
                ctx.telegram.sendMessage(ctx.from.id, blockText).then(nextFunction.bind(null, next));
            } else
              nextFunction(next);
            break;
          }
          case 'pay':
          {
            db.payment.findOne({
              name: userID,
              paymentId: vertice.actionObject.paymentId
            }, async (err, pay) => {
              if (pay) {
                let next = repeat.bind(null,
                  await this.botGraph.getVertice(getRandom(vertice.children))
                );
                nextFunction(next);
              } else {
                //userID, vertice.actionObject.paymentId, parseFloat(vertice.actionObject.paymentValue)
                ctx.telegram.sendInvoice(ctx.from.id, {
                  title: 'Quest access',
                  description: blockText,
                  payload: vertice.actionObject.paymentId,
                  provider_token: this.paymentToken, //'284685063:TEST:Zjc3NDc5YjQ3NWNj',
                  start_parameter: Math.random().toString(36).substr(2),
                  currency: 'RUB',
                  prices: [{
                    label: 'Доступ',
                    amount: Math.round(parseFloat(vertice.actionObject.paymentValue) * 100)
                  }]
                });
                db.userProgress.saveProgress(userID, this.botID, vertice._id, (err) => {});
              }
            });
            break;
          }
          case 'question':
          {
            if (handled) {
              this.currentSelection = [];
              for (let a of vertice.children) {
                if ((await this.botGraph.getVertice(a)).actionObject)
                  this.currentSelection.push((await this.botGraph.getVertice(a)).actionObject.text);
              }
              this.currentSelection.push('Меню');
              const replyOptions = Markup.keyboard(this.currentSelection).oneTime().extra();

              if (vertice.actionObject) {
                if (vertice.actionObject.image) {
                  this.getImage(vertice.actionObject.image, (img, hash) => {
                    if (typeof img === 'string') {
                      ctx.telegram.sendPhoto(ctx.from.id, img).then(() => {
                        if (vertice.actionObject.text)
                          ctx.telegram.sendMessage(ctx.from.id, blockText, replyOptions);
                      })
                    } else {
                      ctx.telegram.sendPhoto(ctx.from.id, {
                        source: img
                      }).then((photo) => {
                        db.telegramCache.create({
                          bot: this.botID,
                          hash: hash,
                          fileId: photo.photo[photo.photo.length - 1].file_id
                        });
                        if (vertice.actionObject.text)
                          ctx.telegram.sendMessage(ctx.from.id, blockText, replyOptions);
                      });
                    }
                  });
                } else
                  ctx.telegram.sendMessage(ctx.from.id, blockText, replyOptions);
              }
              db.userProgress.saveProgress(userID, this.botID, vertice._id, (err) => {});
            } else {
              handled = true;
              let number = this.currentSelection.indexOf(ctx.message.text);
              if (number >= 0 && number < vertice.children.length) {
                let nextVertice = await this.botGraph.getVertice(vertice.children[number]);
                let nxt = await this.botGraph.getVertice(getRandom(nextVertice.children));
                nextFunction(repeat.bind(null, nxt));
              } 
              else if(number == vertice.children.length) {
                this.isMenu[userID] = true;
                const replyOptions = Markup.keyboard(this.menu).oneTime().resize().extra();
                ctx.telegram.sendMessage(ctx.from.id, 'Меню', replyOptions);
              }
              else {
                handled = true;
                nextFunction(repeat.bind(null, vertice));
              }
            }
            break;
          }
          case 'textinput':
          {
            if (loops > 1) {
              let text = blockText;
              if (vertice.actionObject) {
                if (vertice.actionObject.image) {
                  this.getImage(vertice.actionObject.image, (img, hash) => {
                    if (typeof img === 'string') {
                      ctx.telegram.sendPhoto(ctx.from.id, img).then(() => {
                        if (vertice.actionObject.text)
                          ctx.telegram.sendMessage(ctx.from.id, blockText);
                      })
                    } else {
                      ctx.telegram.sendPhoto(ctx.from.id, {
                        source: img
                      }).then((photo) => {
                        db.telegramCache.create({
                          bot: this.botID,
                          hash: hash,
                          fileId: photo.photo[photo.photo.length - 1].file_id
                        });
                        if (vertice.actionObject.text)
                          ctx.telegram.sendMessage(ctx.from.id, blockText);
                      });
                    }
                  });
                } else
                  ctx.telegram.sendMessage(ctx.from.id, blockText);
              }
              db.userProgress.saveProgress(userID, this.botID, vertice._id, (err) => {});
            } else {
              handled = true;

              let stored = false;
              for(let v of variables) {
                if(v.name == vertice.actionObject.varname) {
                  v.value_string = ctx.message.text.trim();
                  v.save();
                  stored = true;
                }
              }
              if(!stored) {
                db.variable.create({
                  bot: this.botID,
                  user: userID,
                  name: vertice.actionObject.varname,
                  type: 'string',
                  value_string: ctx.message.text.trim()
                }, (err, variable) => {
                  if(err) 
                    console.error(err);
                  else {
                    console.log(variable);
                  }
                });
              }
              let next = repeat.bind(null,
                await this.botGraph.getVertice(getRandom(vertice.children))
              );
              nextFunction(next);
            }
            break;
          }
          case 'sendmail':
          {
            server.send({
              from: userID + ' <eugene@migheap.com>',
              to: 'Admin <' + vertice.actionObject.recipient + '>',
              subject: vertice.actionObject.subject,
              text: blockText
            }, function(err, message) { if(err) console.log(err); });
            let next = repeat.bind(null,
              await this.botGraph.getVertice(getRandom(vertice.children))
            );
            nextFunction(next);
            break;
          }
          case 'math':
          {
            if(vertice.actionObject.operation == '=') {
              let found = false;
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'string')
                    v.type = 'number';
                  v.value_number = vertice.actionObject.value;
                  v.save();
                  found = true;
                  break;
                }
              }
              if(!found) {
                await db.variable.create({
                  bot: this.botID,
                  user: userID,
                  name: vertice.actionObject.varName,
                  type: 'number',
                  value_number: vertice.actionObject.value
                });
              }
            }
            else if(vertice.actionObject.operation == '+') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number') {
                    v.value_number += parseFloat(vertice.actionObject.value);
                    v.save();
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.operation == '-') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number') {
                    v.value_number -= parseFloat(vertice.actionObject.value);
                    v.save();
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.operation == '*') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number') {
                    v.value_number *= parseFloat(vertice.actionObject.value);
                    v.save();
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.operation == '/') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number') {
                    v.value_number /= parseFloat(vertice.actionObject.value);
                    v.save();
                    break;
                  }
                }
              }
            }
            let next = repeat.bind(null,
              await this.botGraph.getVertice(getRandom(vertice.children))
            );
            nextFunction(next);
            break;
          }
          case 'condition':
          {
            let isTrue = false;
            if(vertice.actionObject.event == '==') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number' && v.value_number == vertice.actionObject.value) {
                    isTrue = true;
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.event == '>') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number' && v.value_number > vertice.actionObject.value) {
                    isTrue = true;
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.event == '>=') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number' && v.value_number >= vertice.actionObject.value) {
                    isTrue = true;
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.event == '!=') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number' && v.value_number != vertice.actionObject.value) {
                    isTrue = true;
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.event == '<') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number' && v.value_number < vertice.actionObject.value) {
                    isTrue = true;
                    break;
                  }
                }
              }
            }
            else if(vertice.actionObject.event == '<=') {
              for(let v of variables) {
                if(v.name == vertice.actionObject.varName) {
                  if(v.type == 'number' && v.value_number <= vertice.actionObject.value) {
                    isTrue = true;
                    break;
                  }
                }
              }
            }
            if(isTrue) {
              if(vertice.children.length >= 1) {
                let next = repeat.bind(null,
                  await this.botGraph.getVertice(vertice.children[0])
                );
                nextFunction(next);
              }
            }
            else {
              if(vertice.children.length >= 2) {
                let next = repeat.bind(null,
                  await this.botGraph.getVertice(vertice.children[1])
                );
                nextFunction(next);
              }
            }
            break;
          }
          case 'final':
          {
            if (vertice.actionObject && (vertice.actionObject.image || vertice.actionObject.text)) {
              this.currentSelection = [];
              if (vertice.actionObject.image) {
                this.getImage(vertice.actionObject.image, (img, hash) => {
                  if (typeof img === 'string') {
                    ctx.telegram.sendPhoto(ctx.from.id, img).then(() => {
                      if (vertice.actionObject.text)
                        ctx.telegram.sendMessage(ctx.from.id, blockText, Markup.keyboard(['Заново']).oneTime().resize().extra())
                    })
                  } else {
                    ctx.telegram.sendPhoto(ctx.from.id, {
                      source: img
                    }).then((photo) => {
                      db.telegramCache.create({
                        bot: this.botID,
                        hash: hash,
                        fileId: photo.photo[photo.photo.length - 1].file_id
                      });
                      if (vertice.actionObject.text)
                        ctx.telegram.sendMessage(ctx.from.id, blockText, Markup.keyboard(['Заново']).oneTime().resize().extra())
                    });
                  }
                });
              } else
                ctx.telegram.sendMessage(ctx.from.id, blockText, Markup.keyboard(['Заново']).oneTime().resize().extra());
            }
            db.userProgress.saveProgress(userID, this.botID, null, (err) => {});
            break;
          }
        }
      };
      repeat(current);
    });
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