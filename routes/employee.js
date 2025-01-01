const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Employee Landing Page
router.get('/account', roleCheck.checkEmployee, (req, res) => {
    res.render('employeeAccount'); // Render landing page with options
});

// Employee’s Own Account View
router.get('/own-account', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Employee's own user ID
        const accounts = await fetchUserAccounts(userId);

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found for this employee.');
        }

        // Transform account data
        const checkingAccount = accounts.find(account => account.account_type === 'Checking') || { balance: 0 };
        const savingsAccount = accounts.find(account => account.account_type === 'Savings') || { balance: 0 };

        // Ensure balance is a number
        checkingAccount.balance = Number(checkingAccount.balance || 0);
        savingsAccount.balance = Number(savingsAccount.balance || 0);

        // Fetch recent transactions (optional: limit to last 5 for simplicity)
        const transactions = [];
        for (const account of accounts) {
            const accountTransactions = await fetchTransactions(account.account_id); // Assuming account_id is available
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

        res.render('customerAccount', { customerData: employeeData }); // Use customerAccount view for uniformity
    } catch (error) {
        console.error('Error loading employee’s own account:', error.message);
        res.status(500).render('error', { message: 'Unable to load account details.', error });
    }
});

// Render the search customer page
router.get('/manage-customer', roleCheck.checkEmployee, (req, res) => {
    res.render('searchCustomer', { error: null }); // Render view with no error initially
});

// Handle customer search by username
router.post('/manage-customer', roleCheck.checkEmployee, async (req, res) => {
    const { username } = req.body;

    try {
        const customer = await fetchUserByUsername(username);
        const accounts = await fetchUserAccounts(customer.user_id);

        res.render('employeeCustomerView', { customer, accounts });
    } catch (error) {
        console.error('Error fetching customer accounts:', error.message);
        res.render('searchCustomer', { error: error.message });
    }
});


// Handle Deposit for a Customer
router.post('/deposit', roleCheck.checkEmployee, async (req, res) => {
    const { account_id, amount, deposit_type, validation } = req.body;

    if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.render('error', { message: 'Invalid deposit input.' });
    }

    try {
        // Perform deposit logic
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            account_id,
            null,
            amount,
            `Deposit (${deposit_type}): ${validation || 'N/A'}`,
        ]);

        res.redirect('/employee/manage-customer');
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.render('error', { message: 'Unable to process deposit.' });
    }
});

// Handle Withdrawal for a Customer
router.post('/withdraw', roleCheck.checkEmployee, async (req, res) => {
    const { account_id, amount } = req.body;

    if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.render('error', { message: 'Invalid withdrawal input.' });
    }

    try {
        // Perform withdrawal logic
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            null,
            account_id,
            -amount,
            'Withdrawal',
        ]);

        res.redirect('/employee/manage-customer');
    } catch (error) {
        console.error('Error processing withdrawal:', error.message);
        res.render('error', { message: 'Unable to process withdrawal.' });
    }
});


module.exports = router;