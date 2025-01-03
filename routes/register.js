const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // For hashing and salt generation
const db = require('../lib/database'); // Database module

// **Generate a Unique Username**
// Create a random 6-digit numeric suffix for the username
function generateUsername() {
    return 'user' + Math.floor(Math.random() * 900000 + 100000); // 6-digit random number
}

// **Render Registration Page**
// Display the registration form when the registration page is accessed
router.get('/', (req, res) => {
    res.render('register'); // Render the registration form
});

// **Handle Registration Submission**
// Process form data and register a new user
router.post('/', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // **Validation Checks**
    // Ensure all fields are provided
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.render('register', { error: 'All fields are required.' });
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
        return res.render('register', { error: 'Passwords do not match.' });
    }

    try {
        // **Generate Username**
        const username = generateUsername();

        // **Generate Salt and Hash Password**
        const salt = crypto.randomBytes(16).toString('hex'); // Create a 16-byte salt
        const hashedPassword = crypto.createHash('sha256').update(salt + password).digest('hex'); // Hash password with salt

        // **Register User in Database**
        await db.con.promise().query(`CALL register_user(?, ?, ?, ?, ?, ?, @result)`, [
            username,
            hashedPassword,
            salt,
            firstName,
            lastName,
            email,
        ]);

        // **Check Registration Result**
        const [result] = await db.con.promise().query('SELECT @result AS result');
        if (result[0].result !== 0) {
            return res.render('register', { error: 'Registration failed. User may already exist.' });
        }

        // **Retrieve New User ID**
        const [userIdResult] = await db.con.promise().query(
            'SELECT user_id FROM users WHERE username = ? LIMIT 1',
            [username]
        );

        const userId = userIdResult[0]?.user_id; // Extract user ID
        if (!userId) {
            throw new Error('Failed to retrieve new user ID.');
        }

        // **Add Default Bank Accounts**
        const defaultAccounts = [
            { accountType: 'Checking', balance: 0 }, // $0 Checking account
            { accountType: 'Savings', balance: 0 },  // $0 Savings account
        ];

        for (const account of defaultAccounts) {
            await db.con.promise().query(
                `CALL add_bank_account(?, ?, ?)`,
                [userId, account.accountType, account.balance]
            );
        }

        // **Render Success Page**
        res.render('registerSuccess', { firstName, uniqueID: username });
    } catch (error) {
        // **Error Handling**
        console.error('Error during registration:', error); // Log the error for debugging
        res.render('register', { error: 'An error occurred during registration. Please try again.' }); // Inform the user
    }
});

module.exports = router;