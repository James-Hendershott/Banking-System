var express = require('express');
var router = express.Router();

/* GET account summary page */
router.get('/', function(req, res, next) {
    console.log("account.js: GET");
    const checkingBalance = 1500.50;
    const savingsBalance = 3000.75;
    res.render('account', { checkingBalance, savingsBalance });
});

/* POST account actions (if needed) */
router.post('/', function(req, res, next) {
    console.log("account.js: POST");
    // Handle any form submissions or actions here
    res.redirect('/account'); // Redirect back to the account page after handling
});

module.exports = router;

