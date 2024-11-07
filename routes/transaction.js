var express = require('express');
var router = express.Router();

/* GET transaction history page */
router.get('/', function(req, res, next) {
    console.log("transaction.js: GET");
    const transactions = [
        { date: '2024-11-01', amount: 200.00, memo: 'Grocery Shopping', accountType: 'Checking' },
        { date: '2024-11-02', amount: 150.00, memo: 'Electric Bill', accountType: 'Checking' },
        { date: '2024-11-03', amount: 500.00, memo: 'Rent Payment', accountType: 'Savings' },
        { date: '2024-11-04', amount: 1000.00, memo: 'Paycheck', accountType: 'Savings' }
    ];
    res.render('transaction', { transactions });
});

/* POST transaction actions (if needed) */
router.post('/', function(req, res, next) {
    console.log("transaction.js: POST");
    // Handle form submissions or actions here
    res.redirect('/transaction'); // Redirect back to the transaction page after handling
});

module.exports = router;

