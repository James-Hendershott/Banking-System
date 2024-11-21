var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session); // Import MySQL session store

// Adding routes
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var accountRouter = require('./routes/account');
var transferRouter = require('./routes/transfer');
var transactionRouter = require('./routes/transaction');
var registerRouter = require('./routes/register');
var homeRouter = require('./routes/home');
var helpRouter = require('./routes/help');
var forgotPasswordRouter = require('./routes/forgotPassword');
var adminRouter = require('./routes/admin');
var employeeRouter = require('./routes/employee');
var customerRouter = require('./routes/customer');

// Import role-checking middleware
var roleCheck = require('./middleware/roleCheck');
// Import the database module
var db = require('./lib/database');

// Import the session pool for MySQL
var sessionPool = require('./lib/sessionPool.js');

var app = express();

// Set up session store
var sessionStore = new MySQLStore({}, sessionPool);

// Set up session middleware
app.use(session({
    key: 'user_session_cookie',
    secret: process.env.SESSION_SECRET || 'yourSecretKey', // Secure for production
    store: sessionStore,
    resave: false, // Do not save session if not modified
    saveUninitialized: false, // Do not create session until something is stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
        maxAge: 1000 * 60 * 60 * 24 // Set session cookie expiration to 1 day (example)
    }
}));

// Initialize the database
db.initializeDatabase();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// Routes
app.use('/', homeRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/help', helpRouter);
app.use('/forgot-password', forgotPasswordRouter);

// Role-protected Routes
// Requires users to be authenticated and have specific roles
app.use('/account', roleCheck.checkCustomer, accountRouter);
app.use('/transaction', roleCheck.checkCustomer, transactionRouter);
app.use('/transfer', roleCheck.checkCustomer, transferRouter);
app.use('/admin', roleCheck.checkAdmin, adminRouter);
app.use('/employee', roleCheck.checkEmployee, employeeRouter);
app.use('/customer', roleCheck.checkCustomer, customerRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
