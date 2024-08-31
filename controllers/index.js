const express = require('express');
const router = express.Router();
const passport = require('passport');
const db = require('../db/index');
const Account = db.account;

// Render the homepage, redirecting to login if not authenticated
router.get('/', (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  res.render('index', { title: 'Bot Constructor', user: req.user });
});

// Render the login page
router.get('/login', (req, res) => {
  res.render('login', { title: 'Bot Constructor', user: req.user, error: req.flash('error') });
});

// Handle login POST request
router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), (req, res, next) => {
  req.session.save(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Handle logout and session save
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    req.session.save(err => {
      if (err) {
        return next(err);
      }
      res.redirect('/');
    });
  });
});

// Render the registration page
router.get('/register', (req, res) => {
  res.render('register', { title: 'Bot Constructor' });
});

// Handle registration POST request
router.post('/register', (req, res, next) => {
  const newAccount = new Account({ username: req.body.username });

  Account.register(newAccount, req.body.password, (err) => {
    if (err) {
      return res.render('register', { error: err.message });
    }

    passport.authenticate('local')(req, res, () => {
      req.session.save(err => {
        if (err) {
          return next(err);
        }
        res.redirect('/');
      });
    });
  });
});

module.exports = router;
