const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const routes = {
    login: require('./routes/login'),
    transfer: require('./routes/transfer'),
    transaction: require('./routes/transaction'),
    register: require('./routes/register'),
    home: require('./routes/home'),
    help: require('./routes/help'),
    forgotPassword: require('./routes/forgotPassword'),
    admin: require('./routes/admin'),
    employee: require('./routes/employee'),
    customer: require('./routes/customer'),
    logout: require('./routes/logout'),
};

const roleCheck = require('./middleware/roleCheck');
const db = require('./lib/database');
const sessionPool = require('./lib/sessionPool');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const sessionConfig = {
    key: 'user_session_cookie',
    secret: process.env.SESSION_SECRET || 'yourSecretKey',
    store: new MySQLStore({}, sessionPool),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,
    },
};
app.use(session(sessionConfig));

db.initializeDatabase();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

Object.entries(routes).forEach(([route, handler]) => {
    app.use(`/${route === 'home' ? '' : route}`, handler);
});

app.use((req, res) => res.status(404).render('error', { message: 'Page Not Found', error: { status: 404 } }));
app.use((err, req, res) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).render('error', { message: err.message, error: {} });
});

module.exports = app;
