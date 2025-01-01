const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Import database module
const roleCheck = require('../middleware/roleCheck'); // Import roleCheck middleware

// Render transaction history page
router.get('/:type/:accountId', roleCheck.checkRole(['customer', 'employee']), async (req, res) => {
    try {
        const { accountId, type } = req.params;
        const transactions = await fetchTransactions(accountId); // Fetch transactions for the account
        res.render('transaction', { 
            transactions, 
            backLink: type === 'customer' ? '/employee/manage-customer' : '/employee/account',
        }); // Pass transaction data to the view
    } catch (error) {
        res.render('transaction', { 
            transactions: [], 
            error: 'Error fetching transactions.',
            backLink: `/${req.session.user.role}/account`,
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
