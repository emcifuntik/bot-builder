const express = require('express');
const router = express.Router();
const db = require('../db');
const Graph = require('../graph');
const crypto = require('crypto');

function ksort(obj){
  var keys = Object.keys(obj).sort()
    , sortedObj = {};

  for(var i in keys) {
    sortedObj[keys[i]] = obj[keys[i]];
  }

  return sortedObj;
}

router.post('/', (req, res, next) => {

    let requestBody = ksort(req.body);
    let str = '';
    for(let i in requestBody)
        if(i != 'sig')
            str += i + '=' + requestBody[i];
    let hash = crypto.createHash('md5');
    hash.update(str + 'dRPepEBJoLeHRrx87Iko');
    let sign = hash.digest('hex');
    console.log(str);
    console.log(sign, req.body.sig)
    if(sign !== req.body.sig)
    {
        res.status(400);
        res.json({
            error: {
                error_code: 10,
                error_msg: 'Несовпадение вычисленной и переданной подписи запроса.', 
                critical: true 
            }
        });
        res.end();
        return;
    }
    else
    {
        switch(req.body.notification_type)
        {
            case 'get_item':
            case 'get_item_test':
            {
                let itemParts = decodeURIComponent(req.body.item).split(':');
                db.bot.findOne({_id: itemParts[1]}).populate('graph').exec((err, bot) => {
                    if(bot)
                    {
                        let botGraph = new Graph(JSON.parse(bot.graph.graph));
                        let vertice = botGraph.getVertice(itemParts[2]);
                        if(vertice.type == 'pay')
                        {
                            res.json({
                                response: {
                                    item_id: vertice.action.paymentId, 
                                    title: 'Доступ к квесту "' + bot.name + '"', 
                                    price: vertice.action.paymentValue
                                }
                            })
                        }
                        else
                        {
                            res.json({
                                error: {
                                    error_code: 20,
                                    error_msg: 'Товара не существует',
                                    critical: true
                                }
                            });
                            return;
                        }
                    }
                    else
                    {
                        res.json({
                            error: {
                                error_code: 20,
                                error_msg: 'Товара не существует',
                                critical: true
                            }
                        });
                        return;
                    }
                })
                break;
            }
            case 'order_status_change':
            case 'order_status_change_test':
            {
                if(req.body.status == 'chargeable')
                {
                    let userID = 'vk-' + req.body.user_id;
                    db.payment.create({
                        name: userID,
                        paymentId: req.body.item_id
                    }, (err, pay) => {
                        console.log('[Payment] VK Pay recieved from ' + userID + ' for ' + req.body.item_id);
                        res.json({
                            response: {
                                order_id: req.body.order_id,
                                app_order_id: pay._id
                            }
                        });
                    });
                }
                
                break;
            }
        }
    }
    
});

module.exports = router;
