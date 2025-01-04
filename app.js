// Required dependencies
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('connect-flash');

// Import route handlers
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

// Database and session pool setup
const db = require('./lib/database');
const sessionPool = require('./lib/sessionPool');

const app = express();

// **View Engine Setup**
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// **Session Configuration**
const sessionConfig = {
    key: 'user_session_cookie',
    secret: process.env.SESSION_SECRET || 'yourSecretKey',
    store: new MySQLStore({}, sessionPool),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
};
app.use(session(sessionConfig));

// **Add Flash Middleware**
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.session = req.session; // Session available globally in views
    next();
});

// **Initialize Database**
db.initializeDatabase();

// **Middleware for Logging and Parsing**
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// **Static File Serving**
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// **Route Handlers**
Object.entries(routes).forEach(([route, handler]) => {
    const prefix = route === 'home' ? '/' : `/${route}`;
    app.use(prefix, handler);
});

// **Error Handling**
// 404 - Page Not Found
app.use((req, res) => {
    req.flash('error', 'Page Not Found'); // Optional: Flash error message for 404
    res.status(404).render('error', {
        message: 'Page Not Found',
        error: { status: 404 },
    });
});

// General Errors
app.use((err, req, res) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).render('error', {
        message: err.message || 'Internal Server Error',
        error: req.app.get('env') === 'development' ? err : {},
    });
});

module.exports = app;
