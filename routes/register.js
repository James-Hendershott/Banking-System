const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// Render registration form
router.get('/', (req, res) => {
    res.render('register', { error: null });
});

// Handle registration
router.post('/', async (req, res) => {
    const { username, password, first_name, last_name, email } = req.body;
    try {
        if (!username || !password || !first_name || !last_name || !email) {
            throw new Error('All fields are required.');
        }
        const salt = generateSalt();
        const hashedPassword = hashPassword(password, salt);

        await db.con.promise().query('CALL register_user(?, ?, ?, ?, ?, ?, ?)', [username, hashedPassword, salt, first_name, last_name, email]);
        res.redirect('/login');
    } catch (error) {
        res.render('register', { error: 'Error registering user. Please try again.' });
    }
});

module.exports = router;
