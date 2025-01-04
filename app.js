// Required dependencies
const createError = require('http-errors'); // For handling HTTP errors
const express = require('express'); // Web framework for building the app
const path = require('path'); // To work with file and directory paths
const cookieParser = require('cookie-parser'); // To parse cookies in HTTP requests
const logger = require('morgan'); // To log HTTP requests
const session = require('express-session'); // To manage user sessions
const MySQLStore = require('express-mysql-session')(session); // To store sessions in the MySQL database
const flash = require('connect-flash'); // For flash messages

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

// Middleware to enforce role-based access
const roleCheck = require('./middleware/roleCheck');

// Database and session pool setup
const db = require('./lib/database'); // Custom module to handle database setup and queries
const sessionPool = require('./lib/sessionPool'); // Custom pool for managing database sessions

const app = express(); // Initialize the Express application

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

app.use((req, res, next) => {
    console.log(`DEBUG: Incoming request - Method: ${req.method}, URL: ${req.originalUrl}`);
    next();
});

// **Add Flash Middleware**
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});
app.use('/transactions', require('./routes/transaction'));

// **Initialize Database**
db.initializeDatabase();

// **Middleware for Logging and Parsing**
app.use(logger('dev')); // Log HTTP requests in development mode
app.use(express.json()); // Parse JSON bodies in incoming requests
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded form data
app.use(cookieParser()); // Parse cookies in HTTP requests

// **Static File Serving**
// Serve static files (e.g., CSS, JS) from public and Bootstrap directories
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// **Session Data in Views**
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// **Route Handlers**
// Map routes to their respective modules
Object.entries(routes).forEach(([route, handler]) => {
    const prefix = route === 'home' ? '/' : `/${route}`;
    app.use(prefix, handler);
});

// **Error Handling**
// 404 - Page Not Found
app.use((req, res) => {
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
