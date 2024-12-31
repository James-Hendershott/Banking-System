
const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const crypto = require('crypto'); // For generating salt and hashing passwords

// Generate a random username
function generateUsername() {
    return 'user' + Math.floor(Math.random() * 900000 + 100000); // 6-digit random number
}

// Generate a random salt
function generateSalt() {
    return crypto.randomBytes(16).toString('hex'); // Generate 16-byte salt
}

// Render registration page
router.get('/', (req, res) => {
    res.render('register'); // Display the registration form
});

// Handle registration form submission
router.post('/', (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.render('register', { error: 'All fields are required.' });
    }

    try {
        // Generate username and salt
        const uniqueID = generateUsername();
        const salt = generateSalt();

        // Hash the password
        const hashedPassword = crypto
            .createHash('sha256')
            .update(salt + password) // Concatenate salt and password
            .digest('hex');

        // Register user using a stored procedure
        db.con.query(
            `CALL register_user(?, ?, ?, ?, ?, @result)`,
            [uniqueID, hashedPassword, salt, firstName, lastName, email],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.render('register', { error: 'Registration failed. Please try again.' });
                }

                // Check stored procedure result
                db.con.query('SELECT @result AS result', (err, resultCheck) => {
                    if (err || resultCheck[0].result !== 0) {
                        return res.render('register', { error: 'User already exists or registration failed.' });
                    }

                    // Render success page
                    res.render('registerSuccess', { uniqueID, firstName });
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.render('register', { error: 'An error occurred. Please try again later.' });
    }
});

module.exports = router;
