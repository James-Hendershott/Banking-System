const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Customer Account Overview
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Extract user ID from session
        
        // Fetch associated accounts
        const accounts = await fetchUserAccounts(userId);

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

        // Prepare customerData
        const customerData = {
            checkingBalance: checkingAccount.balance.toFixed(2),
            savingsBalance: savingsAccount.balance.toFixed(2),
            recentTransactions: recentTransactions.map(transaction => ({
                date: new Date(transaction.timestamp).toLocaleString(),
                type: transaction.type,
                amount: transaction.amount.toFixed(2),
            })),
        };

        res.render('customerAccount', { customerData });
    } catch (error) {
        console.error('Error fetching customer account details:', error.message);
        res.status(500).render('error', { message: 'An error occurred while loading your account.' });
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