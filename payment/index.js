const request = require('request');

const config = {
    merchantID: 36404,
    marchantToken: 'vGHqHipFUUC0KQXn',
    project_id: 21309
};

//https://sandbox-secure.xsolla.com/paystation3/?access_token=

class Payment {
    static createToken(userID, payID, amount, cb) {
        request({
            url: 'https://api.xsolla.com/merchant/merchants/' + config.merchantID + '/token',
            method: 'POST',
            json: {
                user: {
                    id: {
                        value: userID
                    },
                    country: {
                        value: 'RU',
                        allow_modify: true
                    }
                },
                settings: {
                    project_id: config.project_id,
                    language: 'ru',
                    currency: 'RUB',
                    mode: 'sandbox',
                    external_id: Math.round(Math.random()*1000000000000).toString(16) + Math.round(Math.random()*1000000000000).toString(16) + Math.round(Math.random()*1000000000000).toString(16)
                },
                purchase: {
                    checkout: {
                        amount: amount,
                        currency: 'RUB'
                    }
                },
                custom_parameters: {
                    pay_id: payID
                }
            },
            headers: {
                Authorization: 'Basic ' + new Buffer(config.merchantID + ':' + config.marchantToken).toString('base64')
            }
        }, (err, res, body) => {
            cb(body);
        });
    }
}

module.exports = Payment;