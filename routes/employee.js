const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Employee Account Overview
router.get('/account', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Extract employee's user ID

        // Fetch account balances
        const accounts = await fetchUserAccounts(userId);

        // Extract checking and savings balances
        const checkingAccount = accounts.find(account => account.account_type === 'Checking') || { balance: 0 };
        const savingsAccount = accounts.find(account => account.account_type === 'Savings') || { balance: 0 };

        // Fetch recent transactions
        const recentTransactions = await fetchTransactions(userId);

        // Prepare employee data
        const employeeData = {
            checkingBalance: checkingAccount.balance,
            savingsBalance: savingsAccount.balance,
            recentTransactions: recentTransactions || [],
        };

        res.render('employeeAccount', { employeeData });
    } catch (error) {
        console.error('Error rendering employee account:', error);
        res.render('employeeAccount', { error: 'Error loading account details.' });
    }
});

// Handle Search for Customer Accounts
router.post('/manage-customer', roleCheck.checkEmployee, async (req, res) => {
    try {
        const customerId = req.body.customerId;
        const customer = await fetchUserById(customerId); // Fetch customer details
        if (!customer) throw new Error('Customer not found.');

        const accounts = await fetchUserAccounts(customer.user_id); // Fetch accounts for the customer
        res.render('employeeCustomerView', { customer, accounts }); // Pass customer and account data
    } catch (error) {
        console.error('Error managing customer accounts:', error);
        res.render('employeeAccount', { error: error.message });
    }
});

// Render Transaction History for a Specific Account
router.get('/transactions/:accountId', roleCheck.checkEmployee, async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId); // Fetch transactions for the account
        res.render('transaction', { transactions }); // Pass transaction data to the view
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.render('transaction', { error: 'Error fetching transactions.' });
    }
});

module.exports = router;
