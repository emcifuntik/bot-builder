const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', (req, res, next) => {
    let sign = req.headers.authorization.split(' ')[1];
    if(sign !== req.signature)
    {
        res.status(400);
        res.json({
            error: {
                code: 'INVALID_SIGNATURE',
                message: 'Invalid signature provided'
            }
        });
        res.end();
        return;
    }
    else
    {
        switch(req.body.notification_type)
        {
            case 'user_validation':
            {
                console.log(req.body.user.id);
                db.userProgress.findOne({name: req.body.user.id}, (err, user) => {
                    if(user)
                    {
                        res.writeHead(200, 'USER_FOUND');
                        res.end();
                        return;
                    }
                    else
                    {
                        res.status(400);
                        res.json({
                            error: {
                                code: 'INVALID_USER',
                                message: 'User not found in our database'
                            }
                        });
                        res.end();
                        return;
                    }
                });
                break;
            }
            case 'payment': 
            {
                let payID = req.body.custom_parameters.pay_id;
                let userID = req.body.user.id;
                db.payment.create({
                    name: userID,
                    paymentId: payID
                }, (err, pay) => {
                    console.log(err, pay);
                    res.writeHead(200, 'OK');
                    res.end();
                });
                break;
            }
        }
    }
    
});

module.exports = router;
