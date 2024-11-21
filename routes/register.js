var express = require('express');
var router = express.Router();
const db = require('../lib/database');

// Function to generate a random username
function generateUsername() {
    return 'user' + Math.floor(Math.random() * 900000 + 100000); // Generates a 6-digit random number
}

// GET registration page
router.get('/', function (req, res) {
    res.render('register');
});

// POST registration form submission
router.post('/', function (req, res) {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.render('register', { error: 'All fields are required.' });
    }

    try {
        // Generate a random username
        const uniqueID = generateUsername();

        // Insert user into the database using a stored procedure
        db.con.query(
            `CALL register_user(?, ?, ?, ?, ?, @result)`,
            [uniqueID, password, firstName, lastName, email],
            (err, results) => {
                if (err) {
                    console.error(err);
                    return res.render('register', { error: 'Registration failed. Please try again.' });
                }

                // Check if the stored procedure succeeded
                db.con.query('SELECT @result AS result', (err, resultCheck) => {
                    if (err || resultCheck[0].result !== 0) {
                        return res.render('register', { error: 'User already exists or registration failed.' });
                    }

                    // Pass the generated username (uniqueID) and firstName to the success page
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
