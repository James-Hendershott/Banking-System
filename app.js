const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // Import MySQL session store

// Adding routes
const loginRouter = require('./routes/login');
const accountRouter = require('./routes/account');
const transferRouter = require('./routes/transfer');
const transactionRouter = require('./routes/transaction');
const registerRouter = require('./routes/register');
const homeRouter = require('./routes/home');
const helpRouter = require('./routes/help');
const forgotPasswordRouter = require('./routes/forgotPassword');
const adminRouter = require('./routes/admin');
const employeeRouter = require('./routes/employee');
const customerRouter = require('./routes/customer');

// Import middleware
const roleCheck = require('./middleware/roleCheck');
const db = require('./lib/database'); // Database module
const sessionPool = require('./lib/sessionPool'); // Session pool

const app = express();

// Set up session store
var sessionStore = new MySQLStore({}, sessionPool);

// Session middleware
app.use(
    session({
        key: 'user_session_cookie',
        secret: process.env.SESSION_SECRET || 'yourSecretKey', // Secure for production
        store: sessionStore,
        resave: false, // Do not save session if not modified
        saveUninitialized: false, // Do not create session until something is stored
        cookie: {
            secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
            maxAge: 1000 * 60 * 60 * 24, // Set session cookie expiration to 1 day
        },
    })
);

// Initialize the database
db.initializeDatabase();

// Logging and parsers
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// Session data for views
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Public routes
app.use('/', homeRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/help', helpRouter);
app.use('/forgot-password', forgotPasswordRouter);

// Role-protected routes
app.use('/account', roleCheck.checkCustomer, accountRouter);
app.use('/transaction', roleCheck.checkCustomer, transactionRouter);
app.use('/transfer', roleCheck.checkCustomer, transferRouter);
app.use('/admin', roleCheck.checkAdmin, adminRouter);
app.use('/employee', roleCheck.checkEmployee, employeeRouter);
app.use('/customer', roleCheck.checkCustomer, customerRouter);

// Error handling
app.use((req, res, next) => {
    res.status(404).render('error', {
        message: 'Page Not Found',
        error: { status: 404 },
    });
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500).render('error');
});

module.exports = app;