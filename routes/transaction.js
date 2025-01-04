const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Import database module
const roleCheck = require('../middleware/roleCheck'); // Import roleCheck middleware

// Render transaction history page
router.get('/:accountId', roleCheck.checkRole(['customer', 'employee']), async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId); // Fetch transactions for the account
        console.log('DEBUG: Fetching transactions for accountId:', accountId);

        res.render('transaction', {
            transactions,
            backLink: `/${req.session.user.role}/account`,
        });
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
        console.log('DEBUG: Fetching transactions for accountId:', accountId);

        res.status(404).render('error', {
            message: 'Page Not Found',
            errorCode: 404,
        });
    }
});


// Handle form submissions or additional actions (if needed)
router.post('/', roleCheck.checkRole(['customer', 'employee']), (req, res) => {
    console.log("transaction.js: POST - Handling transaction actions");

    // Example: Redirect back to the transaction page after handling
    res.redirect('/transaction');
});

module.exports = router;
