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

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.render('register', { error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
    return res.render('register', { error: 'Passwords do not match.' });
    }

    // Generate a unique username
    const username = generateUsername();

    // Generate salt and hashed password
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto.createHash('sha256').update(salt + password).digest('hex');

    try {
    // Insert user into database
    const insertUserQuery = `
        INSERT INTO users (username, hashed_password, salt, first_name, last_name, email, user_role_id)
        VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM user_roles WHERE type = 'regular'));
    `;
    await db.con.promise().query(insertUserQuery, [
        username,
        hashedPassword,
        salt,
        firstName,
        lastName,
        email,
    ]);

    console.log(`User '${username}' registered successfully.`);

    // Redirect user to their landing page
    res.redirect('/customer/account'); // Assuming all new users are customers initially
    } catch (error) {
    console.error('Error registering user:', error.message);
    res.render('register', { error: 'An error occurred during registration. Please try again.' });
    }
});

module.exports = router;
