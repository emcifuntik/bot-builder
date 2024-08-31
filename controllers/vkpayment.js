const express = require('express');
const router = express.Router();
const db = require('../db');
const Graph = require('../graph');
const crypto = require('crypto');

// Utility function to sort object keys
function ksort(obj) {
  return Object.keys(obj).sort().reduce((sortedObj, key) => {
    sortedObj[key] = obj[key];
    return sortedObj;
  }, {});
}

router.post('/', async (req, res) => {
  try {
    const requestBody = ksort(req.body);
    let str = '';

    for (const key in requestBody) {
      if (key !== 'sig') {
        str += `${key}=${requestBody[key]}`;
      }
    }

    const hash = crypto.createHash('md5');
    hash.update(str + 'dRPepEBJoLeHRrx87Iko');
    const sign = hash.digest('hex');

    console.log(str);
    console.log(sign, req.body.sig);

    if (sign !== req.body.sig) {
      return res.status(400).json({
        error: {
          error_code: 10,
          error_msg: 'Несовпадение вычисленной и переданной подписи запроса.',
          critical: true
        }
      });
    }

    switch (req.body.notification_type) {
      case 'get_item':
      case 'get_item_test': {
        const itemParts = decodeURIComponent(req.body.item).split(':');
        const bot = await db.bot.findOne({ _id: itemParts[1] }).populate('graph');

        if (bot) {
          const botGraph = new Graph(JSON.parse(bot.graph.graph));
          const vertice = botGraph.getVertice(itemParts[2]);

          if (vertice.type === 'pay') {
            return res.json({
              response: {
                item_id: vertice.action.paymentId,
                title: `Доступ к квесту "${bot.name}"`,
                price: vertice.action.paymentValue
              }
            });
          }
        }

        return res.status(400).json({
          error: {
            error_code: 20,
            error_msg: 'Товара не существует',
            critical: true
          }
        });
      }

      case 'order_status_change':
      case 'order_status_change_test': {
        if (req.body.status === 'chargeable') {
          const userID = `vk-${req.body.user_id}`;
          const payment = await db.payment.create({
            name: userID,
            paymentId: req.body.item_id
          });

          console.log(`[Payment] VK Pay received from ${userID} for ${req.body.item_id}`);
          return res.json({
            response: {
              order_id: req.body.order_id,
              app_order_id: payment._id
            }
          });
        }
        break;
      }

      default:
        return res.status(400).json({
          error: {
            error_code: 30,
            error_msg: 'Неизвестный тип уведомления',
            critical: true
          }
        });
    }
  } catch (err) {
    console.error('Error processing request:', err);
    return res.status(500).json({
      error: {
        error_code: 500,
        error_msg: 'Внутренняя ошибка сервера',
        critical: true
      }
    });
  }
});

module.exports = router;
