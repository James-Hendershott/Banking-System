const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Import database module
const crypto = require('crypto'); // For hashing

// Render login page
router.get('/', (req, res) => {
    res.render('login'); // Display the login form
});

// Handle login form submission
router.post('/', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: 'All fields are required.' });
    }

    // Fetch salt for the username
    db.con.query(`CALL get_salt(?)`, [username], (err, saltResults) => {
        if (err || saltResults[0].length === 0) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        const salt = saltResults[0][0].salt; // Extract the salt
        const hashedPassword = crypto
            .createHash('sha256')
            .update(salt + password) // Concatenate salt and input password
            .digest('hex');

        // Validate login with stored procedure
        db.con.query(`CALL validate_login(?)`, [username], (err, results) => {
            if (err || results[0].length === 0) {
                return res.render('login', { error: 'Invalid username or password.' });
            }

            const user = results[0][0]; // Extract user data
            const storedPassword = user.hashed_password;

            // Compare hashed passwords
            if (hashedPassword !== storedPassword) {
                return res.render('login', { error: 'Invalid username or password.' });
            }

            // Store user session info
            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
            };

            // Redirect based on role
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.render('login', { error: 'An error occurred. Please try again later.' });
                }

                // Role-based redirection
                if (user.role === 'admin') {
                    res.redirect('/admin/account');
                } else if (user.role === 'employee') {
                    res.redirect('/employee/account');
                } else if (user.role === 'customer') {
                    res.redirect('/customer/account');
                } else {
                    res.redirect('/login'); // Default case if role is unknown
                }
            });
        });
    });
});

module.exports = router;
// ===== End of login.js =====
