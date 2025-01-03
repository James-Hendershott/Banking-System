const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Used for hashing and generating salts
const db = require('../lib/database'); // Database operations module

// **Generate a unique username**
// Creates a 6-digit random number prefixed with "user"
function generateUsername() {
    return 'user' + Math.floor(Math.random() * 900000 + 100000);
}

// **Render the registration page**
router.get('/', (req, res) => {
    res.render('register'); // Serves the registration form
});

// **Handle registration form submission**
router.post('/', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // **Validation: Check if all fields are provided**
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.render('register', { error: 'All fields are required.' });
    }

    // **Validation: Check for a valid email format**
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('register', { error: 'Invalid email format.' });
    }

    // **Validation: Ensure passwords match**
    if (password !== confirmPassword) {
        return res.render('register', { error: 'Passwords do not match.' });
    }

    try {
        // **Generate a unique username**
        const username = generateUsername();

        // **Generate salt and hash password**
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.createHash('sha256').update(salt + password).digest('hex');

        // **Store user in the database using the `register_user` stored procedure**
        await db.con.promise().query(`CALL register_user(?, ?, ?, ?, ?, ?, @result)`, [
            username, // Generated unique username
            hashedPassword, // Hashed password
            salt, // Generated salt
            firstName, // User's first name
            lastName, // User's last name
            email, // User's email
        ]);

        // **Check the result of the stored procedure**
        const [result] = await db.con.promise().query('SELECT @result AS result');
        if (result[0].result !== 0) {
            return res.render('register', { error: 'Registration failed. User may already exist.' });
        }

        // **Render the success page**
        res.render('registerSuccess', {
            firstName, // Pass first name to the success view
            uniqueID: username, // Pass the generated username
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.render('register', { error: 'An error occurred during registration. Please try again.' });
    }
});

module.exports = router;