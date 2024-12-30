const express = require('express');
const router = express.Router();
const { fetchUserById, fetchUserAccounts, fetchTransactions } = require('../lib/dataUtils');
const roleCheck = require('../middleware/roleCheck');

// GET Employee Account Page
router.get('/account', roleCheck.checkEmployee, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const accounts = await fetchUserAccounts(userId);
        res.render('employeeAccount', { accounts });
    } catch (error) {
        res.render('employeeAccount', { error: 'Error loading account details.' });
    }
});

// POST Search Customer Account
router.post('/manage-customer', roleCheck.checkEmployee, async (req, res) => {
    try {
        const customerId = req.body.customerId;
        const customer = await fetchUserById(customerId);
        if (!customer) throw new Error('Customer not found.');

        const accounts = await fetchUserAccounts(customer.user_id);
        res.render('employeeCustomerView', { customer, accounts });
    } catch (error) {
        res.render('employeeAccount', { error: error.message });
    }
});

// GET Transaction History
router.get('/transactions/:accountId', roleCheck.checkEmployee, async (req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await fetchTransactions(accountId);
        res.render('transaction', { transactions });
    } catch (error) {
        res.render('transaction', { error: 'Error fetching transactions.' });
    }
});

module.exports = router;
