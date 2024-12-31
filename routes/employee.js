const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Employee Account Overview
router.get('/account', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Employee ID from session
        const accounts = await fetchUserAccounts(userId); // Fetch employee's accounts
        res.render('employeeAccount', { accounts });
    } catch (error) {
        res.render('employeeAccount', { error: 'Error loading account details.' });
    }
});

// Transaction History for Checking Account
router.get('/account/checking/transactions', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Employee ID from session
        const accounts = await fetchUserAccounts(userId);
        const checkingAccount = accounts.find(account => account.type === 'Checking');

        if (!checkingAccount) throw new Error('Checking account not found.');

        const transactions = await fetchTransactions(checkingAccount.account_id);
        res.render('transaction', {
            transactions,
            backLink: '/employee/account',
        }); // Use transaction.ejs and pass transactions + backLink
    } catch (error) {
        res.render('transaction', {
            transactions: [],
            error: error.message,
            backLink: '/employee/account',
        });
    }
});

// Transaction History for Savings Account
router.get('/account/savings/transactions', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Employee ID from session
        const accounts = await fetchUserAccounts(userId);
        const savingsAccount = accounts.find(account => account.type === 'Savings');

        if (!savingsAccount) throw new Error('Savings account not found.');

        const transactions = await fetchTransactions(savingsAccount.account_id);
        res.render('transaction', {
            transactions,
            backLink: '/employee/account',
        }); // Use transaction.ejs and pass transactions + backLink
    } catch (error) {
        res.render('transaction', {
            transactions: [],
            error: error.message,
            backLink: '/employee/account',
        });
    }
});

module.exports = router;
