const express = require('express');
const router = express.Router();
const { fetchUserByUsername, fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');
const db = require('../lib/database');

// Admin Landing Page
router.get('/account', roleCheck.checkAdmin, (req, res) => {
    res.render('adminAccount', { userAccount: null, message: null }); // Initial state
});

// Handle Search for a Customer by Username
router.post('/account-search', roleCheck.checkAdmin, async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) throw new Error('Username is required.');

        // Fetch user details
        const user = await fetchUserByUsername(username);
        if (!user) throw new Error('User not found.');

        // Fetch account types without balances
        const accounts = await fetchUserAccounts(user.user_id);
        const accountTypes = accounts.map(account => account.account_type);

        res.render('adminAccount', { userAccount: { ...user, accountTypes }, message: null });
    } catch (error) {
        res.render('adminAccount', { userAccount: null, message: error.message });
    }
});

// Handle Password Reset
router.post('/change-password', roleCheck.checkAdmin, async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) throw new Error('Username and new password are required.');

        // Generate a new salt and hash the new password
        const crypto = require('crypto');
        const salt = crypto.randomBytes(16).toString('hex'); // Generate a 16-byte random salt
        const hashedPassword = crypto.createHash('sha256').update(salt + newPassword).digest('hex'); // Hash password with salt

        console.log('Generated Salt:', salt);
        console.log('Generated Hashed Password:', hashedPassword);

        // Update the hashed_password and salt in the database
        await db.con.promise().query('UPDATE users SET hashed_password = ?, salt = ? WHERE username = ?', [hashedPassword, salt, username]);

        res.render('adminAccount', { userAccount: null, message: 'Password reset successfully.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.render('adminAccount', { userAccount: null, message: 'An error occurred while resetting the password. Please try again.' });
    }
});


// Handle Promotion to Employee
router.post('/promote-user', roleCheck.checkAdmin, async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) throw new Error('Username is required.');

        const user = await fetchUserByUsername(username);
        if (!user) throw new Error('User not found.');

        const accounts = await fetchUserAccounts(user.user_id);

        // Ensure all account balances are zero
        const hasNonZeroBalance = accounts.some(account => Number(account.balance) > 0);
        if (hasNonZeroBalance) throw new Error('Cannot promote user with non-zero account balances.');

        // Call stored procedure to promote user
        await db.con.promise().query('CALL change_user_type(?, "employee")', [username]);
        res.render('adminAccount', { userAccount: null, message: 'User promoted to employee successfully.' });
    } catch (error) {
        res.render('adminAccount', { userAccount: null, message: error.message });
    }
});

// Handle Demotion to Customer
router.post('/demote-user', roleCheck.checkAdmin, async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) throw new Error('Username is required.');

        const user = await fetchUserByUsername(username);
        if (!user) throw new Error('User not found.');

        // Update user role to "customer"
        await db.con.promise().query('UPDATE users SET role = "customer" WHERE username = ?', [username]);

        res.render('adminAccount', { userAccount: null, message: 'User demoted to customer successfully.' });
    } catch (error) {
        res.render('adminAccount', { userAccount: null, message: error.message });
    }
});


module.exports = router;
