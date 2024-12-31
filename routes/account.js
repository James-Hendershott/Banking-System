const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// Utility: Fetch transactions for a specific account ID
async function fetchTransactions(accountId) {
    return new Promise((resolve, reject) => {
        db.con.query(
            `SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY timestamp DESC`,
            [accountId, accountId],
            (err, results) => {
                if (err) reject(err);
                else resolve(results);
            }
        );
    });
}

// Redirect users to their appropriate account overview page based on their role
router.get('/', (req, res) => {
    const userRole = req.session.user?.role || 'guest';

    if (userRole === 'customer') {
        res.redirect('/customer/account'); // Redirect customers to their account page
    } else if (userRole === 'employee') {
        res.redirect('/employee/account'); // Redirect employees to their account page
    } else if (userRole === 'admin') {
        res.redirect('/admin/account'); // Redirect admins to their account management page
    } else {
        res.redirect('/login'); // Redirect unauthenticated users to the login page
    }
});

// Render transaction history for a specific account
router.get('/transactions/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId);
        res.render('transaction', { transactions, accountId }); // Pass transactions to the view
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.render('transaction', { error: 'Unable to fetch transactions.' });
    }
});

module.exports = router;