const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Employee Account Overview (My Own Account)
router.get('/account', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Employee's own user ID
        const accounts = await fetchUserAccounts(userId);

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found for this employee.');
        }

        res.render('employeeAccount', { accounts }); // Employee's own account details
    } catch (error) {
        console.error('Error fetching employee accounts:', error.message);
        res.status(500).render('employeeAccount', { error: 'Error loading account details.' });
    }
});

// Manage Customer Accounts (Search Page)
router.get('/manage-customer', roleCheck.checkEmployee, (req, res) => {
    res.render('searchCustomer'); // Render search form
});

// Handle Search for Customer Accounts
router.post('/manage-customer', roleCheck.checkEmployee, async (req, res) => {
    const { customerId } = req.body;

    try {
        const accounts = await fetchUserAccounts(customerId);
        if (!accounts || accounts.length === 0) throw new Error('No accounts found for this customer.');

        res.render('employeeCustomerView', { accounts, customerId }); // Render customer accounts
    } catch (error) {
        res.render('searchCustomer', { error: error.message }); // Return to search view with error
    }
});

// View Transactions for Employee's Own or Customer Accounts
router.get('/:type/:accountId/transactions', roleCheck.checkEmployee, async (req, res) => {
    const { accountId, type } = req.params;

    try {
        const transactions = await fetchTransactions(accountId);

        res.render('transaction', {
            transactions,
            backLink: type === 'customer' ? '/employee/manage-customer' : '/employee/account', // BackLink based on type
        });
    } catch (error) {
        res.render('transaction', {
            transactions: [],
            error: error.message,
            backLink: type === 'customer' ? '/employee/manage-customer' : '/employee/account',
        });
    }
});

module.exports = router;
