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
const logoutRouter = require('./routes/logout');

// Import middleware
const roleCheck = require('./middleware/roleCheck');
const db = require('./lib/database'); // Database module
const sessionPool = require('./lib/sessionPool'); // Session pool for session storage

const app = express();
// Set the view engine and views directory
app.set('views', path.join(__dirname, 'views')); // Define the views directory
app.set('view engine', 'ejs'); // Use EJS as the view engine

// Set up session store
var sessionStore = new MySQLStore({}, sessionPool);

// Session middleware
app.use(
    session({
        key: 'user_session_cookie', // Cookie name
        secret: process.env.SESSION_SECRET || 'yourSecretKey', // Secure secret
        store: sessionStore,
        resave: false, // Do not save session if unmodified
        saveUninitialized: false, // Do not create empty sessions
        cookie: {
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            maxAge: 1000 * 60 * 60 * 24, // 1-day expiration
        },
    })
);

// Initialize the database
db.initializeDatabase(); // Ensure database is set up and ready

// Logging and parsers
app.use(logger('dev')); // Use Morgan for logging HTTP requests
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request bodies
app.use(cookieParser()); // Parse cookies

// Static files
app.use(express.static(path.join(__dirname, 'public'))); // Public directory
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist/'))); // Bootstrap CSS and JS
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font'))); // Bootstrap icons

// Session data for views
app.use((req, res, next) => {
    res.locals.session = req.session; // Make session data available to views
    next();
});

// Public routes
app.use('/', homeRouter); // Home page
app.use('/login', loginRouter); // Login functionality
app.use('/register', registerRouter); // Registration functionality
app.use('/help', helpRouter); // Help page
app.use('/forgot-password', forgotPasswordRouter); // Password recovery
app.use('/logout', logoutRouter); // Logout

// Role-protected routes
app.use('/account', roleCheck.checkCustomer, accountRouter); // Customer account management
app.use('/transaction', roleCheck.checkCustomer, transactionRouter); // Customer transactions
app.use('/transfer', roleCheck.checkCustomer, transferRouter); // Customer funds transfer
app.use('/admin', roleCheck.checkAdmin, adminRouter); // Admin management
app.use('/employee', roleCheck.checkEmployee, employeeRouter); // Employee actions
app.use('/customer', roleCheck.checkCustomer, customerRouter); // Customer actions

// Error handling
// Handle 404 errors (Page Not Found)
app.use((req, res, next) => {
    res.status(404).render('error', {
        message: 'Page Not Found',
        error: { status: 404 },
    });
});

// General error handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {}; // Show stack trace in dev mode
    res.status(err.status || 500).render('error'); // Render error view
});

module.exports = app;