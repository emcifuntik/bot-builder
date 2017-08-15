const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    res.render('index', { title: 'Bot constructor', user : req.user });
});

module.exports = router;
