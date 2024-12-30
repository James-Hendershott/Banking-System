
var express = require('express');
var router = express.Router();
const db = require('../lib/database'); // Import database module
const crypto = require('crypto'); // For hashing

// GET login page
router.get('/', function (req, res) {
    res.render('login');
});

// POST login credentials
router.post('/', function (req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: 'All fields are required.' });
    }

    // Fetch salt for the given username
    db.con.query(`CALL get_salt(?)`, [username], (err, saltResults) => {
        if (err || saltResults[0].length === 0) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        const salt = saltResults[0][0].salt; // Extract the salt
        const hashedPassword = crypto
            .createHash('sha256')
            .update(salt + password) // Concatenate salt and input password
            .digest('hex');

        // Fetch user details using the stored procedure
        db.con.query(`CALL validate_login(?)`, [username], (err, results) => {
            if (err || results[0].length === 0) {
                return res.render('login', { error: 'Invalid username or password.' });
            }

            const user = results[0][0]; // Extract the user data from the stored procedure
            const storedPassword = user.hashed_password;

            // Compare hashed password with stored hashed password
            if (hashedPassword !== storedPassword) {
                return res.render('login', { error: 'Invalid username or password.' });
            }

            // Store user session info
            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
            };

            // Save the session and redirect based on role
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.render('login', { error: 'An error occurred. Please try again later.' });
                }

                // Redirect based on role
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
