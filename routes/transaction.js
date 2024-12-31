const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Database module for querying

// Render transaction history page
router.get('/', (req, res) => {
    console.log("transaction.js: GET - Fetching transaction history");

    const userId = req.session.user ? req.session.user.user_id : null;

    // Check if user is logged in
    if (!userId) {
        return res.redirect('/login');
    }

    // Fetch transactions from the database for the logged-in user
    db.con.query(
        `CALL fetch_transactions(?)`,
        [userId],
        (err, results) => {
            if (err) {
                console.error('Error fetching transactions:', err);
                return res.render('transaction', { error: 'Unable to fetch transactions.' });
            }

            // Pass transaction history and user details to the view
            res.render('transaction', {
                transactionHistory: results[0], // Transactions fetched from the database
                accountType: "Combined", // Default to Combined
                backLink: `/${req.session.user.role}/account`, // Back link based on user role
            });
        }
    );
});

// Handle form submissions or additional actions (if needed)
router.post('/', (req, res) => {
    console.log("transaction.js: POST - Handling transaction actions");

    // Example: Redirect back to the transaction page after handling
    res.redirect('/transaction');
});

module.exports = router;