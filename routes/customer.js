var express = require('express');
var router = express.Router();

// Mock data function for account transactions (replace with actual database calls as needed)
function getTransactionData(accountType) {
  return [
    { date: '2024-11-01', type: 'Deposit', amount: 500, memo: 'Paycheck' },
    { date: '2024-10-30', type: 'Withdrawal', amount: 200, memo: 'Grocery' }
  ];
}

// GET customer account page
router.get('/account', function(req, res) {
  const customerData = {
    checkingBalance: 1000.00,
    savingsBalance: 2000.00,
    recentTransactions: getTransactionData("Overview") // Provide recent transactions overview
  };
  
  res.render('customerAccount', { customerData });
});

// GET transaction history for Checking account
router.get('/account/checking', function(req, res) {
  const transactionData = getTransactionData("Checking");
  res.render('transaction', { accountType: "Checking", transactionHistory: transactionData });
});

// GET transaction history for Savings account
router.get('/account/savings', function(req, res) {
  const transactionData = getTransactionData("Savings");
  res.render('transaction', { accountType: "Savings", transactionHistory: transactionData });
});

// POST transfer funds between accounts
router.post('/transfer', function(req, res) {
  const { fromAccount, toAccount, amount, memo } = req.body;
  console.log(`Transfer ${amount} from ${fromAccount} to ${toAccount} with memo: ${memo}`);
  res.redirect('/customer/account');
});

module.exports = router;