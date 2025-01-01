const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // For hashing and salt generation
const db = require('../lib/database'); // Database module

// Generate a unique username
function generateUsername() {
  return 'user' + Math.floor(Math.random() * 900000 + 100000); // 6-digit random number
}

// Render registration page
router.get('/', (req, res) => {
  res.render('register'); // Display the registration form
});

// Handle registration form submission
router.post('/', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Check if all fields are provided
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.render('register', { error: 'All fields are required.' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.render('register', { error: 'Passwords do not match.' });
    }

    try {
        // Generate username
        const username = 'user' + Math.floor(Math.random() * 900000 + 100000);

        // Generate salt and hash
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.createHash('sha256').update(salt + password).digest('hex');

        // Register user in the database
        await db.con.promise().query(`CALL register_user(?, ?, ?, ?, ?, ?, @result)`, [
            username,
            hashedPassword,
            salt,
            firstName,
            lastName,
            email,
        ]);

        const [result] = await db.con.promise().query('SELECT @result AS result');
        if (result[0].result !== 0) {
            return res.render('register', { error: 'Registration failed. User may already exist.' });
        }

        // Fetch the newly created user
        const [[user]] = await db.con.promise().query(`SELECT * FROM users WHERE username = ?`, [username]);

        // Set the session
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            role: 'customer',
        };

        // Redirect to the customer's landing page
        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error during registration:', error);
        res.render('register', { error: 'An error occurred during registration. Please try again.' });
    }
});


module.exports = router;
