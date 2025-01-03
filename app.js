// Required dependencies
const createError = require('http-errors'); // For handling HTTP errors
const express = require('express'); // Web framework for building the app
const path = require('path'); // To work with file and directory paths
const cookieParser = require('cookie-parser'); // To parse cookies in HTTP requests
const logger = require('morgan'); // To log HTTP requests
const session = require('express-session'); // To manage user sessions
const MySQLStore = require('express-mysql-session')(session); // To store sessions in the MySQL database

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
// Define the directory for EJS views and set EJS as the template engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// **Session Configuration**
// Define session options including MySQL-based session storage
const sessionConfig = {
    key: 'user_session_cookie', // Name of the cookie storing the session ID
    secret: process.env.SESSION_SECRET || 'yourSecretKey', // Secret key for signing the session ID cookie
    store: new MySQLStore({}, sessionPool), // Store session data in the MySQL database
    resave: false, // Do not save session data if it hasn't changed
    saveUninitialized: false, // Do not create empty sessions
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 1000 * 60 * 60 * 24, // Set cookie expiration to 1 day
    },
};
app.use(session(sessionConfig)); // Enable session management

// **Initialize Database**
// Ensure the database, tables, and stored procedures are set up
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
// Make session data available in all views (e.g., for dynamic navigation)
app.use((req, res, next) => {
    res.locals.session = req.session; // Attach session data to the response
    next();
});

// **Route Handlers**
// Map routes to their respective modules
Object.entries(routes).forEach(([route, handler]) => {
    app.use(`/${route === 'home' ? '' : route}`, handler); // Root route maps to 'home'
});

// **Error Handling**
// Handle 404 errors (Page Not Found)
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page Not Found',
        error: { status: 404 },
    });
});

// Handle general errors (e.g., server errors)
// Log errors and provide a user-friendly error message
app.use((err, req, res) => {
    console.error('Error:', err.message); // Log the error for debugging
    res.status(err.status || 500).render('error', {
        message: err.message || 'Internal Server Error', // User-friendly message
        error: req.app.get('env') === 'development' ? err : {}, // Show stack trace only in development
    });
});

// Export the app for use by the server
module.exports = app;
