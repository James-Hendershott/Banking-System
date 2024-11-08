var express = require('express');
var router = express.Router();

/* GET transaction history page */
router.get('/', function(req, res, next) {
    console.log("transaction.js: GET");
    
    // Sample transaction data
    const transactions = [
        { date: '2024-11-01', amount: 200.00, memo: 'Grocery Shopping' },
        { date: '2024-11-02', amount: 150.00, memo: 'Electric Bill' },
        { date: '2024-11-03', amount: 500.00, memo: 'Rent Payment' },
        { date: '2024-11-04', amount: 1000.00, memo: 'Paycheck' }
    ];
    
    // Determine back link based on user role
    let backLink = '/customer/account'; // Default for customers
    if (req.session.user) {
        if (req.session.user.role === 'employee') {
            backLink = '/employee/account'; // For employees
        }
    }

    const accountType = req.query.accountType || 'Account'; // Default to 'Account' if not set

    // Render transaction view with transactions and back link
    res.render('transaction', { 
        transactions, 
        backLink,
        accountType // Pass account type to the view
    });
});

/* POST transaction actions (if needed) */
router.post('/', function(req, res, next) {
    console.log("transaction.js: POST");
    // Handle form submissions or actions here
    res.redirect('/transaction'); // Redirect back to the transaction page after handling
});

module.exports = router;
