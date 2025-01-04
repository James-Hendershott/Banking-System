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
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    db.con.query(`CALL get_salt(?)`, [username], (err, saltResults) => {
        if (err || saltResults[0].length === 0) {
            console.error('Error fetching salt or invalid username:', err || 'No salt found.');
            req.flash('error', 'Invalid username or password.');
            return res.redirect('/login');
        }

        const salt = saltResults[0][0].salt;
        const hashedPassword = crypto
            .createHash('sha256')
            .update(salt + password)
            .digest('hex');

        db.con.query(`CALL validate_login(?)`, [username], (err, results) => {
            if (err || results[0].length === 0) {
                console.error('Error during login validation or invalid username:', err || 'No user found.');
                req.flash('error', 'Invalid username or password.');
                return res.redirect('/login');
            }

            const user = results[0][0];
            if (hashedPassword !== user.hashed_password) {
                req.flash('error', 'Invalid username or password.');
                return res.redirect('/login');
            }

            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
            };

            req.session.save((err) => {
                if (err) {
                    req.flash('error', 'An error occurred. Please try again later.');
                    return res.redirect('/login');
                }

                if (user.role === 'admin') res.redirect('/admin/account');
                else if (user.role === 'employee') res.redirect('/employee/account');
                else res.redirect('/customer/account');
            });
        });
    });
});


module.exports = router;
