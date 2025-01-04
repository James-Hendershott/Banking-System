const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const roleCheck = require('../middleware/roleCheck');
const crypto = require('crypto');
const dataUtils = require('../lib/dataUtils');

// **Employee Account Landing Page**
router.get('/account', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // Fetch employee's account balances
        const [rawAccounts] = await db.con.promise().query('CALL get_user_account_balances(?)', [userId]);
        const accounts = rawAccounts[0].map(account => ({
            ...account,
            balance: parseFloat(account.balance),
        })).filter(account => account && account.account_type);

        // Render the employee dashboard
        res.render('employeeAccount', {
            accounts,
            message: accounts.length === 0 ? 'No accounts found.' : '',
        });
    } catch (error) {
        console.error('Error fetching employee account details:', error.message);
        res.status(500).render('error', { message: 'Unable to load account details.', error });
    }
});

// **Transfer Funds**
router.post('/transfer', roleCheck.checkEmployee, async (req, res) => {
    const { from_account_id, to_account_id, amount, memo } = req.body;
    try {
        // Validate input
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

        res.redirect('/employee/account?success=Your transfer was successful!');
    } catch (error) {
        console.error('Error during transfer:', error.message);
        res.redirect('/employee/account?error=Unable to perform transfer. Please try again.');
    }
});

// **Deposit Funds**
router.post('/deposit', roleCheck.checkEmployee, async (req, res) => {
    const { account_id, amount, memo } = req.body;
    try {
        // Validate input
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

        res.redirect('/employee/account?success=Your deposit was successful!');
    } catch (error) {
        console.error('Error processing deposit:', error.message);
        res.redirect('/employee/account?error=Unable to perform deposit. Please try again.');
    }
});

// **Withdraw Funds**
router.post('/withdraw', roleCheck.checkEmployee, async (req, res) => {
    const { account_id, amount, memo } = req.body;
    try {
        // Validate input
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid withdrawal input. Please select an account and enter a positive amount.');
        }

        // Check if sufficient balance exists
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

        res.redirect('/employee/account?success=Your withdrawal was successful!');
    } catch (error) {
        console.error('Error processing withdrawal:', error.message);
        res.redirect('/employee/account?error=Unable to perform withdrawal. Please try again.');
    }
});

// **Change Password**
router.post('/change-password', roleCheck.checkEmployee, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        if (!currentPassword || !newPassword) {
            throw new Error('Both current and new passwords are required.');
        }

        const userId = req.session.user.user_id;
        const [userResults] = await db.con.promise().query('CALL fetch_user_by_id(?)', [userId]);
        const user = userResults[0][0];
        if (!user || !user.hashed_password || !user.salt) {
            throw new Error('Unable to fetch user details for password validation.');
        }

        const { salt, hashed_password: storedHashedPassword } = user;
        const hashedInputPassword = crypto.createHash('sha256').update(salt + currentPassword).digest('hex');
        if (hashedInputPassword !== storedHashedPassword) {
            throw new Error('Incorrect current password.');
        }

        const newSalt = crypto.randomBytes(16).toString('hex');
        const hashedNewPassword = crypto.createHash('sha256').update(newSalt + newPassword).digest('hex');

        await db.con.promise().query('UPDATE users SET hashed_password = ?, salt = ? WHERE user_id = ?', [
            hashedNewPassword, newSalt, userId,
        ]);

        res.redirect('/employee/account?success=Password changed successfully!');
    } catch (error) {
        console.error('Error changing password:', error.message);
        res.redirect('/employee/account?error=Unable to change password. Please try again.');
    }
});

// **Manage Customer Accounts**
router.get('/manage-customers', roleCheck.checkEmployee, (req, res) => {
    res.render('searchCustomer', { message: '' });
});

// Update the "/search-customer" route
router.post('/search-customer', roleCheck.checkEmployee, async (req, res) => {
    const { search_type, search_value } = req.body;
    try {
        let customer;
        if (search_type === 'username') {
            customer = await dataUtils.fetchUserByUsername(search_value);
        } else {
            customer = await dataUtils.fetchUserById(search_value);
        }

        if (!customer || customer.role !== 'customer') {
            throw new Error('Customer not found or is not a customer.');
        }

        const accounts = await dataUtils.fetchUserAccounts(customer.user_id);

        // Ensure valid numeric balances
        const formattedAccounts = accounts.map(account => ({
            ...account,
            balance: parseFloat(account.balance) || 0, // Convert to number, default to 0
        }));

        res.render('employeeCustomerView', { customer, accounts: formattedAccounts });
    } catch (error) {
        console.error('Error fetching customer details:', error.message);
        res.render('searchCustomer', { message: 'Error fetching customer details. Please try again.' });
    }
});


module.exports = router;