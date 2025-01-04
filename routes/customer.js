const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Database connection
const roleCheck = require('../middleware/roleCheck'); // Middleware for role checking
const crypto = require('crypto');


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

        // Render the customer account page with balances
        res.render('customerAccount', {
            accounts,
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
        if (!from_account_id || !to_account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid transfer input. Please select valid accounts and enter a positive amount.');
        }
        if (from_account_id === to_account_id) {
            throw new Error('Cannot transfer funds between the same account.');
        }

        await db.con.promise().query('CALL transfer_funds(?, ?, ?, ?, @result)', [
            from_account_id, to_account_id, amount, memo || 'Transfer',
        ]);

        const [result] = await db.con.promise().query('SELECT @result AS result');
        if (result[0].result !== 0) {
            throw new Error('Error processing transfer.');
        }

        // Redirect with success message
        res.redirect('/customer/account?success=Your transfer was successful!');
    } catch (error) {
        console.error('Error during transfer:', error.message);
        res.redirect('/customer/account?error=Unable to perform Transfer, please check the information and try again.');
    }
});


// **Deposit Funds**
router.post('/deposit', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount, memo } = req.body;

    try {
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid deposit input. Please select an account and enter a positive amount.');
        }

        const user = req.session.user;
        const finalMemo = memo && memo.trim() !== ''
            ? memo
            : `${user.username} chose not to provide a memo for this transaction.`;

        // Perform the deposit
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            null, account_id, amount, finalMemo,
        ]);

        // Fetch updated account balances
        const [updatedAccounts] = await db.con.promise().query('CALL get_user_account_balances(?)', [user.user_id]);
        const accounts = updatedAccounts[0].map(account => ({
            ...account,
            balance: parseFloat(account.balance),
        })).filter(account => account && account.account_type);

        res.redirect('/customer/account?success=Your deposit was successful!');
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.redirect('/customer/account?error=Unable to perform Deposit. Please check the information and try again.');
    }
});

// **Withdraw Funds**
router.post('/withdraw', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount, memo } = req.body;

    try {
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid withdrawal input. Please select an account and enter a positive amount.');
        }

        // Fetch the account balance
        const [rows] = await db.con.promise().query('SELECT balance FROM bank_accounts WHERE account_id = ?', [account_id]);
        if (!rows.length) {
            throw new Error('Account not found.');
        }

        const currentBalance = parseFloat(rows[0].balance);
        if (currentBalance < amount) {
            throw new Error('Insufficient funds for withdrawal.');
        }

        const user = req.session.user;
        const finalMemo = memo && memo.trim() !== '' 
            ? memo 
            : `${user.username} did not provide a memo for this transaction.`;

        // Perform the withdrawal
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            account_id, null, -amount, finalMemo,
        ]);

        // Fetch updated account balances
        const [updatedAccounts] = await db.con.promise().query('CALL get_user_account_balances(?)', [user.user_id]);
        const accounts = updatedAccounts[0].map(account => ({
            ...account,
            balance: parseFloat(account.balance),
        })).filter(account => account && account.account_type);

        res.redirect('/customer/account?success=Your withdrawal was successful!');
    } catch (error) {
        console.error('Error processing withdrawal:', error.message);
        res.redirect('/customer/account?error=Insufficient funds or invalid withdrawal request.');
    }
});


// **Change Password**
router.post('/change-password', roleCheck.checkCustomer, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            throw new Error('Both current and new passwords are required.');
        }

        const userId = req.session.user.user_id; // Get user ID from session
        console.log(`DEBUG: Attempting to change password for user_id: ${userId}`);

        // Fetch user details via fetch_user_by_id
        const [userResults] = await db.con.promise().query('CALL fetch_user_by_id(?)', [userId]);
        console.log('DEBUG: Raw User Results:', userResults);

        // Extract user details
        const user = userResults[0][0]; // Adjusted to correctly extract the first row
        if (!user || !user.hashed_password || !user.salt) {
            console.error('DEBUG: Missing user details:', user);
            throw new Error('Unable to fetch user details for password validation.');
        }

        // Debug fetched user details
        const { salt, hashed_password: storedHashedPassword } = user;
        console.log(`DEBUG: Salt: ${salt}, Stored Hash: ${storedHashedPassword}`);

        // Validate current password
        const hashedInputPassword = crypto.createHash('sha256').update(salt + currentPassword).digest('hex');
        console.log(`DEBUG: Hashed Input Password: ${hashedInputPassword}`);

        if (hashedInputPassword !== storedHashedPassword) {
            throw new Error('Incorrect current password.');
        }

        // Generate new salt and hash the new password
        const newSalt = crypto.randomBytes(16).toString('hex');
        const hashedNewPassword = crypto.createHash('sha256').update(newSalt + newPassword).digest('hex');
        console.log(`DEBUG: New Salt: ${newSalt}, Hashed New Password: ${hashedNewPassword}`);

        // Update the database with the new password and salt
        await db.con.promise().query(
            'UPDATE users SET hashed_password = ?, salt = ? WHERE user_id = ?',
            [hashedNewPassword, newSalt, userId]
        );

        console.log(`DEBUG: Password updated successfully for user_id: ${userId}`);
        res.redirect('/customer/account?success=Password changed successfully!');
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.redirect('/customer/account?error=Unable to change password. Please try again.');
    }
});

// **Full Transaction History**
router.get('/transactions', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // Fetch all transactions for the user's accounts
        const [transactions] = await db.con.promise().query(`
            SELECT 
                t.transaction_id, 
                t.from_account, 
                t.to_account, 
                t.amount, 
                t.memo, 
                t.timestamp
            FROM transactions t
            JOIN bank_accounts ba ON (t.from_account = ba.account_id OR t.to_account = ba.account_id)
            WHERE ba.user_id = ?
            ORDER BY t.timestamp DESC
        `, [userId]);

        res.render('allTransactions', {
            transactions,
            backLink: '/customer/account',
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error.message);
        res.status(500).render('error', {
            message: 'Unable to load transaction history.',
            errorCode: 500,
        });
    }
});

module.exports = router;