const VK = require('vk-fast-longpoll');
const db = require('../../db');
const Graph = require('../../graph');
const crypto = require('crypto');
const payment = require('../../payment');
const fs = require('fs');
const path = require('path');
const request = require('request');
const email = require('emailjs');

const server = email.server.connect({
   user: 'eugene@migheap.com', 
   password: 'Jenia199555', 
   host: 'smtp.yandex.ru',
   port: 465, 
   ssl: true
});

class VKExec {
  constructor(token, botID, graph) {
    this.api = new VK(token);
    this.botID = botID;
    this.botGraph = graph;
    this.started = false;
    this.id = null;
    this.alias = null;
    this.type = null;
    this.name = null;
    this.isMenu = {};

    this.api.longpoll.on('message', this.onMessage.bind(this));

    this.api.api.groups.getById().then((res) => {
      if (res.length > 0) {
        this.id = res[0].id;
        this.alias = res[0].screen_name;
        this.type = res[0].type;
        this.name = res[0].name;
        console.log(this.id, this.alias, this.type, this.name);
      }
    }).catch(console.error);
  }

  getImage(filename, cb) {
    let hash = crypto.createHash('md5').update(filename).digest('hex');
    db.docCache.findOne({
      hash: hash
    }).exec((err, doc) => {
      if (doc) {
        cb(doc.doc);
      } else {
        this.api.api.docs.getWallUploadServer({group_id: this.id}).then((result) => {
          let req = request({
            uri: result.upload_url,
            method: 'POST',
            formData: {
              file: fs.createReadStream(path.resolve('public/images/' + filename))
            },
            json: true
          }, (err, res, body) => {
            this.api.api.docs.save(body).then((doc) => {
              let docText = 'doc' + doc[0].owner_id + '_' + doc[0].id;
              db.docCache.create({
                hash: hash,
                doc: docText
              });
              cb(docText);
            }).catch(console.error);
          });
        }).catch(console.error);
      }
    });
  }

  async onMessage(message) {
    if (!message.isOutbox) {
      let userID = 'vk-' + message.sender;
      if(userID in this.isMenu && this.isMenu[userID] === true) {
        switch(message.text) {
          case '1':
            db.userProgress.saveProgress(userID, this.botID, null, (err) => {});
            delete this.isMenu[userID];
            this.api.api.messages.send({
              user_id: message.sender,
              message: 'Игра сброшена'
            }).catch(console.error);
          return;
          case '2':
            this.api.api.messages.send({
              user_id: message.sender,
              message: 'https://vk.com/horoshocrew'
            }).catch(console.error);
          return;
          case '3':
            this.api.api.messages.send({
              user_id: message.sender,
              message: 't.me/ghezzi_rus'
            }).catch(console.error);
          return;
          case '4':
            try {
              delete this.isMenu[userID];
            }
            catch(err) {
              console.error(err);
            }
          break;
          default:
            this.api.api.messages.send({
            user_id: message.sender,
            message: '1. Начать сначала\r\n2. Другие проекты\r\n3. Связаться с нами\r\n4. Продолжить квест'
          }).catch(console.error);
          return;
        }
      }
      if(['меню', 'menu'].indexOf(message.text.toLowerCase().trim()) != -1) {
        this.isMenu[userID] = true;
        this.api.api.messages.send({
          user_id: message.sender,
          message: '1. Начать сначала\r\n2. Другие проекты\r\n3. Связаться с нами\r\n4. Продолжить квест'
        }).catch(console.error);
        return;
      }
      db.user.findOne({
        name: userID
      }, (err, user) => {
        if (!user)
          db.user.create({
            user: userID
          });
      });
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

        let repeat = async (vertice) => {
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
            {
              let next = repeat.bind(null,
                await this.botGraph.getVertice(getRandom(vertice.children))
              );
              if (vertice.actionObject && (vertice.actionObject.image || vertice.actionObject.text)) {
                if (vertice.actionObject.image)
                  this.getImage(vertice.actionObject.image, (doc) => {
                    this.api.api.messages.send({
                      user_id: message.sender,
                      message: blockText,
                      attachment: doc
                    }).then(nextFunction.bind(null, next));
                  });
                else
                  this.api.api.messages.send({
                    user_id: message.sender,
                    message: blockText
                  }).then(nextFunction.bind(null, next));
              } else
                nextFunction(next);
              break;
            }
            case 'start':
            {
              let next = repeat.bind(null,
                await this.botGraph.getVertice(getRandom(vertice.children))
              );

              if (vertice.actionObject && (vertice.actionObject.image || vertice.actionObject.text)) {
                if (vertice.actionObject.image)
                  this.getImage(vertice.actionObject.image, (doc) => {
                    this.api.api.messages.send({
                      user_id: message.sender,
                      message: blockText,
                      attachment: doc
                    }).then(nextFunction.bind(null, next));
                  });
                else
                  this.api.api.messages.send({
                    user_id: message.sender,
                    message: blockText
                  }).then(nextFunction.bind(null, next));
              } else
                nextFunction(next);
              handled = true;
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
                  let text = '';
                  if (vertice.actionObject && vertice.actionObject.text)
                    text = blockText;
                  text += '\r\nhttps://vk.com/app6045075?quest:' + this.botID + ':' + vertice.uid;
                  if (vertice.actionObject && vertice.actionObject.image)
                    this.getImage(vertice.actionObject.image, (doc) => {
                      this.api.api.messages.send({
                        user_id: message.sender,
                        message: text,
                        attachment: doc
                      });
                    });
                  else
                    this.api.api.messages.send({
                      user_id: message.sender,
                      message: text
                    });
                  db.userProgress.saveProgress(userID, this.botID, vertice._id, (err) => {});
                }
              });
              break;
            }
            case 'question':
            {
              if (handled) {
                console.log(vertice);
                let text = blockText;
                let nr = 1;
                for (let a of vertice.children)
                  text += '\r\n' + (nr++) + '. ' + (await this.botGraph.getVertice(a)).actionObject.text;
                text += '\r\n\r\n0. Меню';

                if (vertice.actionObject.image)
                  this.getImage(vertice.actionObject.image, (doc) => {
                    this.api.api.messages.send({
                      user_id: message.sender,
                      message: text,
                      attachment: doc
                    });
                  });
                else
                  this.api.api.messages.send({
                    user_id: message.sender,
                    message: text
                  });
                db.userProgress.saveProgress(userID, this.botID, vertice._id, (err) => {});
              } else {
                handled = true;
                let number = parseInt(message.text.split(' ')[0].split('.')[0]);
                if (!Number.isNaN(number) && number > 0 && number <= vertice.children.length) {
                  let nextVertice = await this.botGraph.getVertice(vertice.children[number - 1]);
                  nextFunction(repeat.bind(null, (await this.botGraph.getVertice(getRandom(nextVertice.children)))));
                } 
                else if(number == 0) {
                  this.isMenu[userID] = true;
                  this.api.api.messages.send({
                    user_id: message.sender,
                    message: '1. Начать сначала\r\n2. Другие проекты\r\n3. Связаться с нами\r\n4. Продолжить квест'
                  }).catch(console.error);
                }
                else {
                  handled = true;
                  process.nextTick(repeat.bind(null, vertice));
                }
              }
              break;
            }
            case 'textinput':
            {
              if (handled) {
                let text = blockText;

                if (vertice.actionObject.image)
                  this.getImage(vertice.actionObject.image, (doc) => {
                    this.api.api.messages.send({
                      user_id: message.sender,
                      message: text,
                      attachment: doc
                    });
                  });
                else
                  this.api.api.messages.send({
                    user_id: message.sender,
                    message: text
                  });
                db.userProgress.saveProgress(userID, this.botID, vertice._id, (err) => {});
              } else {
                handled = true;

                let stored = false;
                for(let v of variables) {
                  if(v.name == vertice.actionObject.varname) {
                    v.value_string = message.text.trim();
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
                    value_string: message.text.trim()
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
                if (vertice.actionObject.image)
                  this.getImage(vertice.actionObject.image, (doc) => {
                    this.api.api.messages.send({
                      user_id: message.sender,
                      message: blockText,
                      attachment: doc
                    });
                  });
                else
                  this.api.api.messages.send({
                    user_id: message.sender,
                    message: blockText
                  });
              }
              await db.variable.remove({bot: this.botID, user: userID});
              await db.userProgress.saveProgress(userID, this.botID, null, (err) => {});
              break;
            }
          }
        };
        repeat(current);
      });
    }
  }

  start() {
    if (!this.started) {
      this.started = true;
      this.api.longpoll.start();
    }
  }

  stop() {
    if (this.started) {
      this.started = false;
      this.api.longpoll.stop();
    }
  }
}

module.exports = VKExec;
