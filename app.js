var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

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
const roleCheck = require('./middleware/roleCheck');
// Import the database module
var db = require('./lib/database'); 

var app = express();

// Set up session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey', // Secure for production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Secure cookies in production
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
