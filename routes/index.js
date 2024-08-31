const path = require('path');

module.exports = function(app) {
  app.use('/', require(path.join(__dirname, '../controllers/index')));
  app.use('/editor', require(path.join(__dirname, '../controllers/editor')));
  app.use('/users', require(path.join(__dirname, '../controllers/users')));
  app.use('/bot', require(path.join(__dirname, '../controllers/bot')));
  app.use('/payment', require(path.join(__dirname, '../controllers/payment')));
  app.use('/vkpayment', require(path.join(__dirname, '../controllers/vkpayment')));
};
