const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// GET Customer Account Overview
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const accounts = await fetchUserAccounts(userId);
        res.render('customerAccount', { accounts });
    } catch (error) {
        res.render('customerAccount', { error: 'Error loading account details.' });
    }
});

// GET Transaction History
router.get('/transactions/:accountId', roleCheck.checkCustomer, async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId);
        res.render('transaction', { transactions });
    } catch (error) {
        res.render('transaction', { error: 'Error fetching transactions.' });
    }
});

module.exports = router;
