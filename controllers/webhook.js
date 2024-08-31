const express = require('express');
const router = express.Router();
const Messenger = require('../executor/platforms/messenger');

// Route to handle all HTTP methods for the '/messenger' endpoint
router.route('/messenger')
  .all(Messenger.callback);

module.exports = router;
