module.exports = function(app) {
    app.use('/', require(__dirname + '/../controllers/index'));
    app.use('/editor', require(__dirname + '/../controllers/editor'));
    app.use('/users', require(__dirname + '/../controllers/users'));
    app.use('/bot', require(__dirname + '/../controllers/bot'));
    app.use('/payment', require(__dirname + '/../controllers/payment'));
    app.use('/vkpayment', require(__dirname + '/../controllers/vkpayment'));
};