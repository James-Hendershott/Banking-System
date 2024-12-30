var express = require('express');
var router = express.Router();
const db = require('../lib/database'); // Import database module

/* GET transfer funds page */
router.get('/', function (req, res) {
    console.log("transfer.js: GET");

    // Fetch user accounts dynamically
    const userId = req.session.user ? req.session.user.user_id : null;
    if (!userId) {
        return res.redirect('/login');
    }

    db.con.query(`CALL get_user_account_balances(?)`, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user accounts:', err);
            return res.render('transfer', { error: 'Error loading accounts', backLink: `/${req.session.user.role}/account` });
        }

        const accounts = results[0]; // User account list
        res.render('transfer', { accounts, backLink: `/${req.session.user.role}/account` });
    });
});

/* POST transfer funds action */
router.post('/', function (req, res) {
    console.log("transfer.js: POST");
    const { fromAccount, toAccount, amount, memo } = req.body;

    if (!fromAccount || !toAccount || amount <= 0) {
        return res.render('transfer', { error: 'Invalid input', backLink: `/${req.session.user.role}/account` });
    }

    // Call the transfer_funds stored procedure
    db.con.query(`CALL transfer_funds(?, ?, ?, ?, @result)`, [fromAccount, toAccount, amount, memo], (err) => {
        if (err) {
            console.error('Error during fund transfer:', err);
            return res.render('transfer', { error: 'Transfer failed', backLink: `/${req.session.user.role}/account` });
        }

        db.con.query('SELECT @result AS result', (err, resultCheck) => {
            if (err) {
                console.error('Error checking transfer result:', err);
                return res.render('transfer', { error: 'Transfer failed', backLink: `/${req.session.user.role}/account` });
            }

            const resultCode = resultCheck[0].result;

            // Handle result codes
            if (resultCode === 1) {
                res.render('transfer', { error: 'Insufficient funds', backLink: `/${req.session.user.role}/account` });
            } else if (resultCode === 2) {
                res.render('transfer', { error: 'Cannot transfer to the same account', backLink: `/${req.session.user.role}/account` });
            } else if (resultCode === 3) {
                res.render('transfer', { error: 'Invalid destination account', backLink: `/${req.session.user.role}/account` });
            } else {
                res.render('transfer', { success: 'Transfer completed successfully', backLink: `/${req.session.user.role}/account` });
            }
        });
    });
});

module.exports = router;
