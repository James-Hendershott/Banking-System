const fs = require('fs');
const path = require('path');

// Utility for logging unauthorized access attempts
function logError(message) {
    const logPath = path.join(__dirname, '../logs/role_errors.log');
    const timestamp = new Date().toISOString();
    fs.appendFile(logPath, `[${timestamp}] ${message}\n`, (err) => {
        if (err) console.error('Failed to log role error:', err);
    });
}

// Middleware to validate the user's role for a specific route
function validateRole(requiredRole, req, res, next) {
    const user = req.session?.user;
    if (!user) {
        logError(`Unauthorized access attempt: No user session.`);
        return res.redirect('/login'); // Redirect to login if no session exists
    }

    if (user.role !== requiredRole) {
        logError(`Role mismatch: User ID ${user.user_id}, Role ${user.role}, Required ${requiredRole}`);
        return res.status(403).render('error', {
            message: `Access denied: ${requiredRole} role required.`,
            error: { status: 403 },
        });
    }

    next(); // Proceed to the next middleware/route
}

// Predefined middleware for specific roles
const roleCheck = {
    checkCustomer: (req, res, next) => validateRole('customer', req, res, next),
    checkEmployee: (req, res, next) => validateRole('employee', req, res, next),
    checkAdmin: (req, res, next) => validateRole('admin', req, res, next),
};

module.exports = roleCheck;