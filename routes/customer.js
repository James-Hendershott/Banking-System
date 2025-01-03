const express = require('express');
const router = express.Router();
const db = require('../lib/database'); // Database connection
const roleCheck = require('../middleware/roleCheck'); // Middleware for role checking

// **Customer Account Landing Page**
router.get('/account', roleCheck.checkCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // Fetch account balances
        const [accounts] = await db.con.promise().query('CALL get_user_account_balances(?)', [userId]);
        if (!accounts || accounts.length === 0) {
            return res.render('customerAccount', {
                accounts: [],
                transactions: [],
                message: 'No accounts found.',
            });
        }

        // Fetch recent transactions
        const transactions = [];
        for (const account of accounts) {
            const [recentTransactions] = await db.con.promise().query(
                'CALL fetch_recent_transactions(?)',
                [account.account_id]
            );
            transactions.push({
                accountType: account.account_type,
                transactions: recentTransactions,
            });
        }

        res.render('customerAccount', {
            accounts,
            transactions,
            message: '',
        });
    } catch (error) {
        console.error('Error fetching customer account details:', error.message);
        res.status(500).render('error', { message: 'Unable to load account details.', error });
    }
});


// **Deposit Funds**
router.post('/deposit', roleCheck.checkCustomer, async (req, res) => {
    const { account_id, amount, deposit_type, validation } = req.body;

    try {
        // Validate inputs
        if (!account_id || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new Error('Invalid deposit input. Please select an account and enter a positive amount.');
        }
        if (deposit_type === 'Check' && !validation) {
            throw new Error('Please provide a check number for check deposits.');
        }
        if (deposit_type === 'Wire Transfer' && !validation) {
            throw new Error('Please provide a wire transfer reference.');
        }

        // Perform the deposit
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