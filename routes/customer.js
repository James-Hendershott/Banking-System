const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Database connection
const roleCheck = require('../middleware/roleCheck'); // Middleware for role checking

// **Customer Account Landing Page**
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // Fetch account balances
        const [rawAccounts] = await db.con.promise().query('CALL get_user_account_balances(?)', [userId]);
        console.log('DEBUG: First Result Set of Accounts:', rawAccounts[0]); // Debugging: Log raw account data

        const accounts = rawAccounts[0].map(account => ({
            ...account,
            balance: parseFloat(account.balance), // Convert balance to a number
        })).filter(account => account && account.account_type); // Filter valid accounts

        // Fetch recent transactions
        const transactions = [];
        for (const account of accounts) {
            const [rawTransactions] = await db.con.promise().query('CALL fetch_recent_transactions(?)', [account.account_id]);
            console.log('DEBUG: First Result Set of Transactions:', rawTransactions[0]); // Debugging: Log raw transaction data

            transactions.push({
                accountType: account.account_type,
                transactions: rawTransactions[0].filter(txn => txn.timestamp && txn.amount), // Filter valid transactions
            });
        }

        // Render the customer account page with balances and transactions
        res.render('customerAccount', {
            accounts,
            transactions,
            message: accounts.length === 0 ? 'No accounts found.' : '',
        });
    } catch (error) {
        console.error('Error fetching customer account details:', error.message);
        res.status(500).render('error', { message: 'Unable to load account details.', error });
    }
});

// **Transfer Funds**
router.post('/transfer', roleCheck.checkCustomer, async (req, res) => {
    const { from_account_id, to_account_id, amount, memo } = req.body;

    try {
        // Validate inputs
        if (!from_account_id || !to_account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid transfer input. Please select valid accounts and enter a positive amount.');
        }
        if (from_account_id === to_account_id) {
            throw new Error('Cannot transfer funds between the same account.');
        }

        // Perform the transfer
        await db.con.promise().query('CALL transfer_funds(?, ?, ?, ?, @result)', [
            from_account_id, to_account_id, amount, memo || 'Transfer',
        ]);

        const [result] = await db.con.promise().query('SELECT @result AS result');
        if (result[0].result !== 0) {
            throw new Error('Error processing transfer.');
        }

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error during transfer:', error.message);
        res.render('error', { message: 'Unable to process transfer.', error });
    }
});

// **Deposit Funds**
router.post('/deposit', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount, memo } = req.body;

    try {
        // Validate inputs
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid deposit input. Please select an account and enter a positive amount.');
        }

        // Auto-populate memo if not provided
        const user = req.session.user;
        const finalMemo = memo && memo.trim() !== '' 
            ? memo 
            : `${user.username} chose not to provide a memo for this transaction.`;

        // Perform the deposit
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            account_id, null, amount, finalMemo,
        ]);

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.render('error', { message: 'Unable to process deposit.', error });
    }
});


// **Withdraw Funds**
router.post('/withdraw', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount } = req.body;

    try {
        // Validate inputs
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid withdrawal input. Please select an account and enter a positive amount.');
        }

        // Check sufficient funds
        const [rows] = await db.con.promise().query('SELECT balance FROM bank_accounts WHERE account_id = ?', [account_id]);
        if (!rows.length || rows[0].balance < amount) {
            throw new Error('Insufficient funds for withdrawal.');
        }

        // Perform the withdrawal
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            null, account_id, -amount, 'Withdrawal',
        ]);

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error processing withdrawal:', error.message);
        res.render('error', { message: 'Unable to process withdrawal.', error });
    }
});

// **Change Password**
router.post('/change-password', roleCheck.checkCustomer, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        // Validate inputs
        if (!currentPassword || !newPassword) {
            throw new Error('Both current and new passwords are required.');
        }

        const userId = req.session.user.user_id;

        // Fetch the current user's salt and hashed password
        const [userResults] = await db.con.promise().query('CALL fetch_user_by_id(?)', [userId]);
        const user = userResults[0];
        if (!user) throw new Error('User not found.');

        const currentSalt = user.salt;
        const storedHashedPassword = user.hashed_password;

        // Validate current password
        const hashedInputPassword = crypto.createHash('sha256').update(currentSalt + currentPassword).digest('hex');
        if (hashedInputPassword !== storedHashedPassword) {
            throw new Error('Incorrect current password.');
        }

        // Update with new password
        const newSalt = crypto.randomBytes(16).toString('hex');
        const hashedNewPassword = crypto.createHash('sha256').update(newSalt + newPassword).digest('hex');
        await db.con.promise().query(
            'UPDATE users SET hashed_password = ?, salt = ? WHERE user_id = ?',
            [hashedNewPassword, newSalt, userId]
        );

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.render('error', { message: 'Unable to change password.', error });
    }
});

module.exports = router;