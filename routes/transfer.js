const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Import database module
const roleCheck = require('../middleware/roleCheck'); // Import roleCheck middleware

// Render transfer funds page
router.get('/', roleCheck.checkRole(['customer', 'employee']), (req, res) => {
    console.log("transfer.js: GET - Loading transfer funds page");

    // Ensure the user is logged in
    const userId = req.session.user ? req.session.user.user_id : null;
    if (!userId) {
        return res.redirect('/login');
    }

    // Fetch user accounts to display in the transfer form
    db.con.query(`CALL get_user_account_balances(?)`, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user accounts:', err);
            return res.render('transfer', {
                error: 'Error loading accounts',
                backLink: `/${req.session.user.role}/account`, // Back link based on user role
            });
        }

        const accounts = results[0]; // List of user accounts
        res.render('transfer', {
            accounts,
            backLink: `/${req.session.user.role}/account`, // Back link based on user role
        });
    });
});

// Handle transfer funds action
router.post('/', roleCheck.checkRole(['customer', 'employee']), (req, res) => {
    console.log("transfer.js: POST - Processing fund transfer");

    const { fromAccount, toAccount, amount, memo } = req.body;

    // Validate input
    if (!fromAccount || !toAccount || amount <= 0) {
        return res.render('transfer', {
            error: 'Invalid input. Please check all fields and try again.',
            backLink: `/${req.session.user.role}/account`, // Back link based on user role
        });
    }

    // Call the `transfer_funds` stored procedure
    db.con.query(`CALL transfer_funds(?, ?, ?, ?, @result)`, [fromAccount, toAccount, amount, memo], (err) => {
        if (err) {
            console.error('Error during fund transfer:', err);
            return res.render('transfer', {
                error: 'Transfer failed due to an internal error.',
                backLink: `/${req.session.user.role}/account`, // Back link based on user role
            });
        }

        // Check the result of the transfer
        db.con.query('SELECT @result AS result', (err, resultCheck) => {
            if (err) {
                console.error('Error checking transfer result:', err);
                return res.render('transfer', {
                    error: 'Transfer failed due to an internal error.',
                    backLink: `/${req.session.user.role}/account`, // Back link based on user role
                });
            }

            const resultCode = resultCheck[0].result;

            // Handle specific result codes from the stored procedure
            if (resultCode === 1) {
                res.render('transfer', {
                    error: 'Insufficient funds for this transfer.',
                    backLink: `/${req.session.user.role}/account`, // Back link based on user role
                });
            } else if (resultCode === 2) {
                res.render('transfer', {
                    error: 'You cannot transfer funds to the same account.',
                    backLink: `/${req.session.user.role}/account`, // Back link based on user role
                });
            } else if (resultCode === 3) {
                res.render('transfer', {
                    error: 'The destination account does not exist.',
                    backLink: `/${req.session.user.role}/account`, // Back link based on user role
                });
            } else {
                res.render('transfer', {
                    success: 'Transfer completed successfully!',
                    backLink: `/${req.session.user.role}/account`, // Back link based on user role
                });
            }
        });
    });
});

module.exports = router;
