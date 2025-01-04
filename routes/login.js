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
            console.error('Error fetching salt or invalid username:', err || 'No salt found.');
            return res.render('login', { error: 'Invalid username or password.' });
        }

        const salt = saltResults[0][0].salt; // Extract the salt
        console.log(`DEBUG: Salt retrieved for username "${username}": ${salt}`); // Debugging: Log the salt

        const hashedPassword = crypto
            .createHash('sha256')
            .update(salt + password) // Concatenate salt and input password
            .digest('hex');
        console.log(`DEBUG: Hashed password for input: ${hashedPassword}`); // Debugging: Log the hashed password

        // Validate login with stored procedure
        db.con.query(`CALL validate_login(?)`, [username], (err, results) => {
            if (err || results[0].length === 0) {
                console.error('Error during login validation or invalid username:', err || 'No user found.');
                return res.render('login', { error: 'Invalid username or password.' });
            }

            const user = results[0][0]; // Extract user data
            const storedPassword = user.hashed_password;
            console.log(`DEBUG: Stored password in database: ${storedPassword}`); // Debugging: Log the stored password

            // Compare hashed passwords
            if (hashedPassword !== storedPassword) {
                console.error('DEBUG: Password mismatch: Input hashed password does not match stored password.');
                return res.render('login', { error: 'Invalid username or password.' });
            }

            console.log(`DEBUG: Login successful for username "${username}"`); // Debugging: Log successful login

            // Store user session info
            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
            };

            // Log the user's role for debugging
            console.log('User role:', user.role);

            // Log the session object after setting user data
            console.log('Session before saving:', req.session);

            // Redirect based on role
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.render('login', { error: 'An error occurred. Please try again later.' });
                }
                // Log session data after saving
                console.log('Session after saving:', req.session);

                // Role-based redirection
                if (user.role === 'admin') {
                    console.log('Redirecting to admin/account...');
                    res.redirect('/admin/account');
                } else if (user.role === 'employee') {
                    console.log('Redirecting to employee/account...');
                    res.redirect('/employee/account');
                } else if (user.role === 'customer') {
                    console.log('Redirecting to customer/account...');
                    res.redirect('/customer/account');
                } else {
                    console.log('Unknown role. Redirecting to login...');
                    res.redirect('/login'); // Default case if role is unknown
                }
            });
        });
    });
});

module.exports = router;
