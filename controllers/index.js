const express = require('express');
const router = express.Router();
const passport = require('passport');
const db = require('../db/index');
const Account = db.account;

router.get('/', (req, res, next) => {
    if(!req.user)
        return res.redirect('/login');
    res.render('index', { title: 'Bot constructor', user : req.user });
});

router.get('/login', (req, res) => {
    res.render('login', { title: 'Bot constructor', user : req.user, error : req.flash('error')});
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), (req, res, next) => {
    req.session.save((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/logout', (req, res, next) => {
    req.logout();
    req.session.save((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/register', (req, res) => {
    res.render('register', { title: 'Bot constructor'});
});

router.post('/register', (req, res, next) => {
    Account.register(new Account({ username : req.body.username }), req.body.password, (err, account) => {
        if (err) {
            return res.render('register', { error : err.message });
        }

        passport.authenticate('local')(req, res, () => {
            req.session.save((err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});

module.exports = router;
