const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// Generate a random username
function generateUsername() {
    return 'user' + Math.floor(Math.random() * 900000 + 100000); // 6-digit random number
}

// Render registration page
router.get('/', (req, res) => {
    res.render('register'); // Display the registration form
});

// Handle registration form submission
router.post('/', (req, res) => {
    const { firstName, lastName, email, salt, hashedPassword } = req.body;

    if (!firstName || !lastName || !email || !salt || !hashedPassword) {
        return res.render('register', { error: 'All fields are required.' });
    }

    const username = generateUsername();

    const sql = `
        CALL register_user(?, ?, ?, ?, ?, ?, @result)
    `;
    db.con.query(sql, [username, hashedPassword, salt, firstName, lastName, email], (err) => {
        if (err) {
            console.error(err);
            return res.render('register', { error: 'Registration failed. Please try again.' });
        }

        db.con.query('SELECT @result AS result', (err, resultCheck) => {
            if (err || resultCheck[0]?.result !== 0) {
                return res.render('register', { error: 'User already exists or registration failed.' });
            }

            res.render('registerSuccess', { username, firstName });
        });
    });
});

module.exports = router;
