const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Customer Account Overview
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Customer's user ID
        const accounts = await fetchUserAccounts(userId);

        // Default empty accounts
        const checkingAccount = accounts.find(account => account.account_type === 'Checking') || { account_type: 'Checking', balance: 0 };
        const savingsAccount = accounts.find(account => account.account_type === 'Savings') || { account_type: 'Savings', balance: 0 };

        // Ensure balance is a number
        checkingAccount.balance = Number(checkingAccount.balance || 0);
        savingsAccount.balance = Number(savingsAccount.balance || 0);

        // Fetch recent transactions
        const transactions = [];
        for (const account of accounts) {
            const accountTransactions = await fetchTransactions(account.account_id);
            transactions.push(...accountTransactions);
        }

        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort transactions by timestamp
        const recentTransactions = transactions.slice(0, 5);

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
        res.status(500).render('error', {
            message: 'An error occurred while loading your account.',
            error: error, // Pass the error object for debugging purposes
        });
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

router.post('/deposit', async (req, res) => {
    const { account_id, amount, deposit_type, validation } = req.body;

    try {
        if (!account_id || amount <= 0) throw new Error('Invalid deposit input.');

        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [account_id, null, amount, `Deposit (${deposit_type})`]);
        res.redirect(`/${req.session.user.role}/account`);
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.render('error', { message: 'Unable to process deposit.', error });
    }
});

router.post('/withdraw', async (req, res) => {
    const { account_id, amount } = req.body;

    try {
        if (!account_id || amount <= 0) throw new Error('Invalid withdrawal input.');

        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [null, account_id, -amount, 'Withdrawal']);
        res.redirect(`/${req.session.user.role}/account`);
    } catch (error) {
        console.error('Error processing withdrawal:', error.message);
        res.render('error', { message: 'Unable to process withdrawal.', error });
    }
});

router.post('/change-password', roleCheck.checkCustomer, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) throw new Error('Both current and new passwords are required.');

        const userId = req.session.user.user_id;
        const user = await fetchUserById(userId);

        // Validate current password
        const hashedInputPassword = hashPassword(currentPassword, user.salt);
        if (hashedInputPassword !== user.hashed_password) throw new Error('Incorrect current password.');

        // Update password
        await db.con.promise().query('CALL change_user_password(?, ?)', [user.username, newPassword]);
        res.render('customerAccount', { message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.render('error', { message: 'Unable to change password.', error });
    }
});

module.exports = router;