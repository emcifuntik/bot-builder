const db = require('../../db');
const Graph = require('../../graph');
const crypto = require('crypto');
const payment = require('../../payment');
const Bot = require('messenger-bot')

let _tokens = [];

function getExecutor(validator) {
    for(let e of _tokens)
        if(e.validator === validator)
            return e.executor;
    return null;
}

class MessengerExec {
    constructor(token, botID, validator)
    {
        _tokens.push({
            executor: this,
            validator: validator
        });
        this.api = new Bot({
            token: token,
            verify: validator
        });
        this.botID = botID;
        this.botGraph = null;
        this.started = false;
    }

    updateGraph() {
        db.bot.findOne({_id: this.botID}).populate('graph').exec((err, bot) => {
            if(bot)
                this.botGraph = new Graph(JSON.parse(bot.graph.graph));
        })
    }

    getImage(image, cb)
    {
        // let parts = image.split(',');
        // let buffer = Buffer.from(parts[1], 'base64');
        // let hash = crypto.createHash('md5').update(buffer).digest('hex');
        // db.docCache.findOne({hash: hash}).exec((err, doc) => {
        //     if(doc) {
        //         cb(doc.doc);
        //     }
        //     else {
        //         this.api.file.uploadDocument(buffer, this.id).then((document) => {
        //             let docText = 'doc' + document[0].owner_id + '_' + document[0].id;
        //             db.docCache.create({
        //                 hash: hash,
        //                 doc: docText
        //             });
        //             cb(docText);
        //         }).catch(console.error);
        //     }
        // });
    }

    onMessage(message) {
        // if(!message.isOutbox)
        // {
        //     let userID = 'fb-' + message.sender;
        //     db.user.findOne({name: userID}, (err, user) => {
        //         if(!user)
        //             db.user.create({user: userID});
        //     });
        //     db.userProgress.getProgress(userID, this.botID, (progress) => {
        //         let current = null;
        //         let handled = false;
        //         if(progress === null)
        //             current = this.botGraph.getStart();
        //         else
        //             current = this.botGraph.getVertice(progress);
        //         let getRandom = (arr) => { return arr[Math.round(Math.random() * (arr.length - 1))]; };

        //         let repeat = (vertice) =>
        //         {
        //             switch(vertice.type)
        //             {
        //                 case 'text': {
        //                     let next = repeat.bind(null,
        //                         this.botGraph.getVertice(getRandom(vertice.children))
        //                     );

        //                     if(vertice.action && (vertice.action.image || vertice.action.text))
        //                     {
        //                         if(vertice.action.image)
        //                             this.getImage(vertice.action.image, (doc) => {
        //                                 this.api.api.messages.send({user_id: message.sender, message: vertice.action.text, attachment: doc}).then(next);
        //                             });
        //                         else
        //                             this.api.api.messages.send({user_id: message.sender, message: vertice.action.text}).then(next);
        //                     }
        //                     else
        //                         process.nextTick(next);
        //                     break;
        //                 }
        //                 case 'start': {
        //                     let next = repeat.bind(null,
        //                         this.botGraph.getVertice(getRandom(vertice.children))
        //                     );

        //                     if(vertice.action && (vertice.action.image || vertice.action.text))
        //                     {
        //                         if(vertice.action.image)
        //                             this.getImage(vertice.action.image, (doc) => {
        //                                 this.api.api.messages.send({user_id: message.sender, message: vertice.action.text, attachment: doc}).then(next);
        //                             });
        //                         else
        //                             this.api.api.messages.send({user_id: message.sender, message: vertice.action.text}).then(next);
        //                     }
        //                     else
        //                         process.nextTick(next);
        //                     handled = true;
        //                     break;
        //                 }
        //                 case 'pay': {
        //                     db.payment.findOne({name: userID, paymentId: vertice.action.paymentId}, (err, pay) => {
        //                         if(pay)
        //                         {
        //                             let next = repeat.bind(null,
        //                                 this.botGraph.getVertice(getRandom(vertice.children))
        //                             );
        //                             process.nextTick(next);
        //                         }
        //                         else
        //                         {
        //                             payment.createToken(userID, vertice.action.paymentId, parseFloat(vertice.action.paymentValue), (body) => {
        //                                 let text = '';
        //                                 if(vertice.action && vertice.action.text)
        //                                     text = vertice.action.text;
        //                                 text += '\r\nhttps://sandbox-secure.xsolla.com/paystation3/?access_token=' + body.token;
        //                                 if(vertice.action && vertice.action.image)
        //                                     this.getImage(vertice.action.image, (doc) => {
        //                                         this.api.api.messages.send({user_id: message.sender, message: text, attachment: doc});
        //                                     });
        //                                 else
        //                                     this.api.api.messages.send({user_id: message.sender, message: text});
        //                             });
        //                             db.userProgress.saveProgress(userID, this.botID, vertice.uid, (err) => {});
        //                         }
        //                     });
        //                     break;
        //                 }
        //                 case 'question': {
        //                     if(handled) {
        //                         let text = vertice.action.text;
        //                         let nr = 1;
        //                         for(let a of vertice.children)
        //                             text += '\r\n' + (nr++) + '. ' + this.botGraph.getVertice(a).action.text;

        //                         if(vertice.action.image)
        //                             this.getImage(vertice.action.image, (doc) => {
        //                                 this.api.api.messages.send({user_id: message.sender, message: text, attachment: doc});
        //                             });
        //                         else
        //                             this.api.api.messages.send({user_id: message.sender, message: text});
        //                         db.userProgress.saveProgress(userID, this.botID, vertice.uid, (err) => {});
        //                     }
        //                     else {
        //                         handled = true;
        //                         let number = parseInt(message.text.split(' ')[0].split('.')[0]);
        //                         if(!Number.isNaN(number) && number > 0 && number <= vertice.children.length) {
        //                             let nextVertice = this.botGraph.getVertice(vertice.children[number - 1]);
        //                             process.nextTick(repeat.bind(null, this.botGraph.getVertice(getRandom(nextVertice.children))));
        //                         }
        //                         else {
        //                             handled = true;
        //                             process.nextTick(repeat.bind(null, vertice));
        //                         }
        //                     }
        //                     break;
        //                 }
        //                 case 'final': {
        //                     if(vertice.action && (vertice.action.image || vertice.action.text))
        //                     {
        //                         if(vertice.action.image)
        //                             this.getImage(vertice.action.image, (doc) => {
        //                                 this.api.api.messages.send({user_id: message.sender, message: vertice.action.text, attachment: doc});
        //                             });
        //                         else
        //                             this.api.api.messages.send({user_id: message.sender, message: vertice.action.text});
        //                     }
        //                     db.userProgress.saveProgress(userID, this.botID, null, (err) => {});
        //                     break;
        //                 }
        //             }
        //         };
        //         repeat(current);
        //     });
        // }
    }

    start() {
        if(!this.started)
        {
            this.started = true;
            //this.api.longpoll.start();
            this.updateGraph();
        }
    }

    stop() {
        if(this.started)
        {
            this.started = false;
            //this.api.longpoll.stop();
        }
    }
}

function onUpdate(req, res, next) {
    console.log(req.query);
    console.log(req.body);
    if(req.method == 'GET')
    {
        if (req.query['hub.mode'] === 'subscribe') {
            let exec = getExecutor(req.query['hub.verify_token']);
            if(exec)
                return exec.api.middleware()(req, res, next);
            else
                res.sendStatus(403);
        } else 
            res.sendStatus(403);    
    }
    else if(req.method == 'POST')
    {
        console.log(req.body);
        res.sendStatus(200);
    }  
}

module.exports = {
    executor: MessengerExec,
    callback: onUpdate
};