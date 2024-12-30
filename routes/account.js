const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// Utility: Fetch transactions for an account ID
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

// GET account overview page based on user role
router.get('/', (req, res) => {
    const userRole = req.session.user?.role || 'guest';

    if (userRole === 'customer') {
        res.redirect('/customer/account'); // Delegate to customer.js
    } else if (userRole === 'employee') {
        res.redirect('/employee/account'); // Delegate to employee.js
    } else if (userRole === 'admin') {
        res.redirect('/admin/account'); // Delegate to admin.js
    } else {
        res.redirect('/login');
    }
});

// GET transactions for a specific account ID
router.get('/transactions/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId);
        res.render('transaction', { transactions, accountId });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.render('transaction', { error: 'Unable to fetch transactions.' });
    }
});

module.exports = router;
