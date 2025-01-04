const fs = require('fs');
const path = require('path');

// Utility for logging unauthorized access attempts
function logError(message) {
    const logDir = path.join(__dirname, '../logs');
    const logPath = path.join(logDir, 'role_errors.log');
    const timestamp = new Date().toISOString();

    // Ensure the logs directory exists
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Append the error message to the log file
    fs.appendFile(logPath, `[${timestamp}] ${message}\n`, (err) => {
        if (err) console.error('Failed to log role error:', err);
    });
}

// Middleware to validate the user's role for a specific route
function validateRole(requiredRoles, req, res, next) {
    const user = req.session?.user;
    const requestedUrl = req.originalUrl;

    if (!user) {
        logError(`Unauthorized access attempt to '${requestedUrl}': No user session.`);
        return res.redirect('/login'); // Redirect to login if no session exists
    }

    // Check if the user's role is in the required roles array
    if (!Array.isArray(requiredRoles)) {
        requiredRoles = [requiredRoles]; // Ensure single role is converted to an array
    }

    if (!requiredRoles.includes(user.role)) {
        logError(
            `Access denied for User ID ${user.user_id} to '${requestedUrl}': Role mismatch (current role: '${user.role}', required roles: '${requiredRoles.join(', ')}')`
        );
        return res.status(403).render('error', {
            message: `Access denied: ${requiredRoles.join(', ')} role required.`,
            error: { status: 403 },
        });
    }

    next(); // Proceed to the next middleware/route
}

// Predefined middleware for specific roles
const roleCheck = {
    checkRole: (requiredRoles) => (req, res, next) => validateRole(requiredRoles, req, res, next),
    checkCustomer: (req, res, next) => validateRole(['customer'], req, res, next),
    checkEmployee: (req, res, next) => validateRole(['employee'], req, res, next),
    checkAdmin: (req, res, next) => validateRole(['admin'], req, res, next),
};

module.exports = roleCheck;