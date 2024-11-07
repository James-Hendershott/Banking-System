var express = require('express');
var router = express.Router();

/* GET transfer funds page */
router.get('/', function(req, res, next) {
    console.log("transfer.js: GET");
    res.render('transfer'); // Renders transfer.ejs
});

/* POST transfer funds action */
router.post('/', function(req, res, next) {
    console.log("transfer.js: POST");
    const { fromAccount, toAccount, amount, memo } = req.body;

    // Placeholder logic for transferring funds
    if (fromAccount && toAccount && amount > 0 && fromAccount !== toAccount) {
        console.log(`Transfer of $${amount} from ${fromAccount} to ${toAccount} completed.`);
        res.redirect('/transaction'); // Redirect to the transaction history page after successful transfer
    } else {
        console.log("Transfer failed: Invalid input");
        res.render('transfer', { error: 'Invalid transfer details' }); // Reloads the page with an error message
    }
});

module.exports = router;
