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

        // Transform account data
        const checkingAccount = accounts.find(account => account.account_type === 'Checking') || { balance: 0 };
        const savingsAccount = accounts.find(account => account.account_type === 'Savings') || { balance: 0 };

        // Fetch recent transactions (optional: limit to last 5 for simplicity)
        const transactions = [];
        for (const account of accounts) {
            const accountTransactions = await fetchTransactions(account.account_id); // Assuming `account_id` is available
            transactions.push(...accountTransactions);
        }

        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort transactions by timestamp
        const recentTransactions = transactions.slice(0, 5);

        // Prepare employeeData
        const employeeData = {
            checkingBalance: checkingAccount.balance.toFixed(2),
            savingsBalance: savingsAccount.balance.toFixed(2),
            recentTransactions: recentTransactions.map(transaction => ({
                timestamp: new Date(transaction.timestamp).toLocaleString(),
                type: transaction.type,
                amount: transaction.amount.toFixed(2),
            })),
        };

        res.render('employeeAccount', { employeeData });
    } catch (error) {
        console.error('Error fetching employee account details:', error.message);
        res.status(500).render('error', { message: 'An error occurred while loading your account.' });
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
