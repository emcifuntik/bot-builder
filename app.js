const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const session = require('express-session');
const crypto = require('crypto');
const http = require('http');
const websocket = require('./websocket');
const executor = require('./executor');
const app = express();

const port = process.env.PORT || 3000;

// View engine setup
app.set('port', port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(logger('dev'));
app.use(bodyParser.json({
  limit: '500mb',
  verify: (req, res, buf) => {
    const hash = crypto.createHash('md5').update(buf + 'dRPepEBJoLeHRrx87Iko');
    req.signature = hash.digest('hex');
  }
}));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use(cookieParser());
app.use(session({
  secret: '4890c234786x7ni151023c0941xz140968cn',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Passport configuration
const db = require('./db/index');
const Account = db.account;
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Routes
require('./routes/index')(app);

// Executor start
executor.start();

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', { title: 'Bot constructor' });
});

// Server setup
const server = http.createServer(app);
websocket(server);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}

module.exports = app;
