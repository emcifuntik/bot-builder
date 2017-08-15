const express = require('express');
const router = express.Router();
const Messenger = require('../executor/platforms/messenger');

router.all('/messenger', Messenger.callback);

module.exports = router;
