const express = require('express');
const router = express.Router();
const { fetchUserById, fetchUserAccounts } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');
const db = require('../lib/database');

// GET Admin Account Management Page
router.get('/account', roleCheck.checkAdmin, (req, res) => {
    res.render('adminAccount', { userAccount: null });
});

// POST Search for User by Username
router.post('/account-search', roleCheck.checkAdmin, async (req, res) => {
    try {
        const username = req.body.username;
        if (!username) throw new Error('Username is required.');

        const user = await fetchUserById(username);
        if (!user) throw new Error('User not found.');

        res.render('adminAccount', { userAccount: user });
    } catch (error) {
        res.render('adminAccount', { error: error.message, userAccount: null });
    }
});

// POST Promote User to Admin
router.post('/promote-user', roleCheck.checkAdmin, async (req, res) => {
    try {
        const username = req.body.username;
        if (!username) throw new Error('Username is required.');

        const user = await fetchUserById(username);
        if (!user) throw new Error('User not found.');

        const accounts = await fetchUserAccounts(user.user_id);
        const hasFunds = accounts.some((account) => account.balance > 0);

        if (hasFunds) {
            throw new Error('Cannot promote user with funds in their accounts.');
        }

        await db.con.query('CALL change_user_type(?, "admin")', [username]);
        res.render('promotionConfirmation', { success: true, username });
    } catch (error) {
        res.render('promotionConfirmation', { error: error.message });
    }
});

// POST Change User Password
router.post('/change-password', roleCheck.checkAdmin, async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) throw new Error('Username and password are required.');

        await db.con.query('CALL change_user_password(?, ?)', [username, newPassword]);
        res.redirect('/admin/account');
    } catch (error) {
        res.render('adminAccount', { error: error.message });
    }
});

module.exports = router;
