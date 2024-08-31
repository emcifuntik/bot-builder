const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  res.render('index', {
    title: 'Bot Constructor',
    user: req.user
  });
});

module.exports = router;
