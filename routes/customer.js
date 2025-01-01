const express = require('express');
const router = express.Router();
const { fetchUserAccounts, fetchTransactions, fetchUserById } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Customer Account Overview
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Customer's user ID
        const accounts = await fetchUserAccounts(userId); // Fetch user's accounts

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found for this user.');
        }

        // Ensure each account's balance is a number
        accounts.forEach(account => {
            account.balance = Number(account.balance || 0).toFixed(2);
        });

        // Fetch recent transactions for all accounts
        const transactions = [];
        for (const account of accounts) {
            const accountTransactions = await fetchTransactions(account.account_id);
            transactions.push(...accountTransactions);
        }

        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp descending
        const recentTransactions = transactions.slice(0, 5);

        // Prepare the customer data object
        const customerData = {
            accounts, // Include all account details
            recentTransactions: recentTransactions.map(transaction => ({
                date: new Date(transaction.timestamp).toLocaleString(),
                type: transaction.type,
                amount: Number(transaction.amount).toFixed(2),
                memo: transaction.memo || '',
            })),
        };

        res.render('customerAccount', { customerData });
    } catch (error) {
        console.error('Error fetching customer account details:', error.message);
        res.status(500).render('error', {
            message: 'Unable to load account details.',
            error,
        });
    }
});

// Render Checking Account Details
router.get('/account/checking', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const accounts = await fetchUserAccounts(userId);
        const checkingAccount = accounts.find(account => account.account_type === 'Checking');

        if (!checkingAccount) throw new Error('Checking account not found.');

        const transactions = await fetchTransactions(checkingAccount.account_id);
        res.render('transaction', { transactions });
    } catch (error) {
        console.error('Error loading checking account:', error.message);
        res.status(500).render('error', { message: 'Unable to load checking account details.' });
    }
});

// Render Savings Account Details
router.get('/account/savings', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const accounts = await fetchUserAccounts(userId);
        const savingsAccount = accounts.find(account => account.account_type === 'Savings');

        if (!savingsAccount) throw new Error('Savings account not found.');

        const transactions = await fetchTransactions(savingsAccount.account_id);
        res.render('transaction', { transactions });
    } catch (error) {
        console.error('Error loading savings account:', error.message);
        res.status(500).render('error', { message: 'Unable to load savings account details.' });
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

router.post('/deposit', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount, deposit_type, validation } = req.body;

    try {
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
    console.error('Invalid input:', { account_id, amount });
    throw new Error('Invalid deposit input. Please select an account and enter a positive amount.');
    }

        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [account_id, null, amount, `Deposit (${deposit_type})`]);
        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.render('error', { message: 'Unable to process deposit.', error });
    }
});

router.post('/withdraw', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount } = req.body;

    try {
        // Debugging: Log request body
        console.log('Withdraw Request Body:', req.body);

        // Validate input
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            console.error('Invalid input:', { account_id, amount });
            throw new Error('Invalid withdrawal input. Please select an account and enter a positive amount.');
        }


        // Check account balance in the database
        const [rows] = await db.con.promise().query('SELECT balance FROM bank_accounts WHERE account_id = ?', [account_id]);
        if (!rows.length || rows[0].balance < amount) {
            throw new Error('Insufficient funds for withdrawal.');
        }

        // Perform withdrawal
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [null, account_id, -amount, 'Withdrawal']);

        res.redirect('/customer/account');
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

        const hashedInputPassword = hashPassword(currentPassword, user.salt);
        if (hashedInputPassword !== user.hashed_password) throw new Error('Incorrect current password.');

        await db.con.promise().query('CALL change_user_password(?, ?)', [user.username, newPassword]);
        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.render('error', { message: 'Unable to change password.', error });
    }
});


module.exports = router;