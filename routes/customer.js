const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Customer Account Overview
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Extract user ID from session
        const accounts = await fetchUserAccounts(userId); // Fetch associated accounts
        res.render('customerAccount', { accounts }); // Pass accounts to the view
    } catch (error) {
        res.render('customerAccount', { error: 'Error loading account details.' });
    }
});

// Render Transaction History for a Customer's Account
router.get('/transactions/:accountId', roleCheck.checkCustomer, async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId); // Fetch transactions for the account
        res.render('transaction', { transactions }); // Pass transaction data to the view
    } catch (error) {
        res.render('transaction', { error: 'Error fetching transactions.' });
    }
});

module.exports = router;