const express = require('express');
const router = express.Router();
const roleCheck = require('../middleware/roleCheck');
const fetchTransactionsByAccount = require('../lib/dataUtils').fetchTransactionsByAccount;

// Render transaction history page
router.get('/:accountId', roleCheck.checkRole(['customer', 'employee']), async (req, res) => {
    try {
        const { accountId } = req.params;
        console.log('DEBUG: Fetching transactions for accountId:', accountId);

        const transactions = await fetchTransactionsByAccount(accountId);
        console.log('DEBUG: Transactions fetched for accountId:', transactions);
        console.log('DEBUG: Transaction route reached for accountId:', req.params.accountId);

        res.render('transaction', {
            transactions,
            backLink: `/${req.session.user.role}/account`,
        });
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
        res.status(404).render('error', {
            message: 'Page Not Found',
            errorCode: 404,
        });
    }
});

module.exports = router;
