const express = require('express');
const router = express.Router();
const roleCheck = require('../middleware/roleCheck'); // Import roleCheck middleware
const fetchTransactionsByAccount = require('../lib/dataUtils').fetchTransactionsByAccount; // Correct function import

// Render transaction history page
router.get('/:accountId', roleCheck.checkRole(['customer', 'employee']), async (req, res) => {
    try {
        const { accountId } = req.params;
        console.log('DEBUG: Received request for accountId:', accountId);

        const transactions = await fetchTransactionsByAccount(accountId); // Call stored procedure
        console.log('DEBUG: Transactions fetched for accountId:', transactions);

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

module.exports = router;
