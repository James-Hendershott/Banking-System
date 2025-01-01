const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Ensure this is included
const { fetchUserAccounts, fetchTransactions, fetchUserById } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// Render Customer Account Overview
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const accounts = await fetchUserAccounts(userId);

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found for this user.');
        }

        accounts.forEach(account => {
            account.balance = Number(account.balance || 0).toFixed(2);
        });

        const customerData = { accounts };

        // Add the debug log here
        console.log('Customer Data Accounts:', customerData.accounts); // Debugging log

        res.render('customerAccount', { customerData });
    } catch (error) {
        console.error('Error fetching customer account details:', error.message);
        res.status(500).render('error', {
            message: 'Unable to load account details.',
            error,
        });
    }
});


// Handle Deposit
router.post('/deposit', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount, deposit_type, validation } = req.body;

    try {
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid deposit input. Please select an account and enter a positive amount.');
        }

        // Validate deposit type
        if (deposit_type === 'Check' && !validation) {
            throw new Error('Please provide a check number for check deposits.');
        }
        if (deposit_type === 'Credit Card' && !/^\d{16}$/.test(validation)) {
            throw new Error('Please provide a valid 16-digit credit card number.');
        }

        // Process deposit
        const memo = `Deposit (${deposit_type}${validation ? `: ${validation}` : ''})`;
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            account_id, null, amount, memo,
        ]);

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.render('error', { message: 'Unable to process deposit.', error });
    }
});


// Withdraw Route
router.post('/withdraw', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount } = req.body;

    try {
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid withdrawal input. Please select an account and enter a positive amount.');
        }

        // Check sufficient funds
        const [rows] = await db.con.promise().query('SELECT balance FROM bank_accounts WHERE account_id = ?', [account_id]);
        if (!rows.length || rows[0].balance < amount) {
            throw new Error('Insufficient funds for withdrawal.');
        }

        // Process withdrawal
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            null, account_id, -amount, 'Withdrawal',
        ]);

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error processing withdrawal:', error.message);
        res.render('error', { message: 'Unable to process withdrawal.', error });
    }
});


// Handle Password Change
router.post('/change-password', roleCheck.checkCustomer, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            throw new Error('Both current and new passwords are required.');
        }

        const userId = req.session.user.user_id;

        // Fetch the current user's salt and hashed password from the database
        const [userResults] = await db.con.promise().query('CALL fetch_user_by_id(?)', [userId]);
        const user = userResults[0];
        if (!user) throw new Error('User not found.');

        const currentSalt = user.salt; // Extract the salt
        const storedHashedPassword = user.hashed_password; // Extract the stored hashed password

        // Debugging Logs
        console.log('Stored Hashed Password:', storedHashedPassword);
        console.log('Current Salt:', currentSalt);
        console.log('Input Current Password:', currentPassword);

        // Hash the input current password with the current salt
        const crypto = require('crypto');
        const hashedInputPassword = crypto
            .createHash('sha256')
            .update(currentSalt + currentPassword) // Concatenate salt and input password
            .digest('hex');

        // Debugging Logs
        console.log('Hashed Input Password:', hashedInputPassword);

        // Compare the hashed input password with the stored hashed password
        if (hashedInputPassword !== storedHashedPassword) {
            throw new Error('Incorrect current password.');
        }

        // Generate a new salt and hash the new password
        const newSalt = crypto.randomBytes(16).toString('hex'); // Generate a 16-byte random salt
        const hashedNewPassword = crypto
            .createHash('sha256')
            .update(newSalt + newPassword) // Concatenate salt and new password
            .digest('hex');

        // Update the user's password and salt in the database
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

// Transfer Route
router.post('/transfer', roleCheck.checkCustomer, async (req, res) => {
    const { from_account_id, to_account_id, amount, memo } = req.body;

    console.log('Transfer Input:', { from_account_id, to_account_id, amount, memo });

    try {
        if (!from_account_id || !to_account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            console.error('Invalid input detected:', { from_account_id, to_account_id, amount });
            throw new Error('Invalid transfer input. Please select valid accounts and enter a positive amount.');
        }

        if (from_account_id === to_account_id) {
            console.error('Same account selected for transfer:', from_account_id);
            throw new Error('Cannot transfer funds between the same account.');
        }

        // Perform the transfer...
        await db.con.promise().query('CALL add_transaction(?, ?, ?, ?)', [
            from_account_id, to_account_id, -amount, memo || 'Transfer',
        ]);

        res.redirect('/customer/account');
    } catch (error) {
        console.error('Error during transfer:', error.message);
        res.status(500).render('error', { message: 'Unable to process transfer.', error });
    }
});



module.exports = router;