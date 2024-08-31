const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  try {
    const sign = req.headers.authorization?.split(' ')[1];

    if (sign !== req.signature) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid signature provided'
        }
      });
    }

    switch (req.body.notification_type) {
      case 'user_validation': {
        console.log(req.body.user.id);
        const user = await db.userProgress.findOne({ name: req.body.user.id });

        if (user) {
          return res.status(200).send('USER_FOUND');
        } else {
          return res.status(400).json({
            error: {
              code: 'INVALID_USER',
              message: 'User not found in our database'
            }
          });
        }
      }

      case 'payment': {
        const payID = req.body.custom_parameters.pay_id;
        const userID = req.body.user.id;

        const payment = await db.payment.create({
          name: userID,
          paymentId: payID
        });

        console.log('Payment created:', payment);
        return res.status(200).send('OK');
      }

      default: {
        return res.status(400).json({
          error: {
            code: 'UNKNOWN_NOTIFICATION',
            message: 'Unknown notification type'
          }
        });
      }
    }
  } catch (err) {
    console.error('Error processing request:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred'
      }
    });
  }
});

module.exports = router;
