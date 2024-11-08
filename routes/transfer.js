var express = require('express');
var router = express.Router();

/* GET transfer funds page */
router.get('/', function(req, res, next) {
    console.log("transfer.js: GET");

    // Determine the user's role to set the back link
    const backLink = req.session.user ? `/${req.session.user.role}/account` : '/login';

    res.render('transfer', { backLink }); // Pass backLink to the view
});
/* POST transfer funds action */
router.post('/', function(req, res, next) {
    console.log("transfer.js: POST");
    const { fromAccount, toAccount, amount, memo } = req.body;

    // Placeholder logic for transferring funds
    if (fromAccount && toAccount && amount > 0 && fromAccount !== toAccount) {
        console.log(`Transfer of $${amount} from ${fromAccount} to ${toAccount} completed.`);
        // Set account type based on the fromAccount
        //const accountType = fromAccount.charAt(0).toUpperCase() + fromAccount.slice(1); // Capitalize
        res.redirect(`/transaction`) // Redirect with query parameter
    } else {
        console.log("Transfer failed: Invalid input");
        res.render('transfer', { error: 'Invalid transfer details', backLink: `/${req.session.user.role}/account` }); // Reloads the page with an error message
    }
});

module.exports = router;
