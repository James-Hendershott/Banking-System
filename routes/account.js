var express = require('express');
var router = express.Router();

// Mock function to get account data will need to replace with actual database call as needed
function getAccountData(accountType) {
  const accountData = {
    checking: {
      balance: 1000.00,
      transactions: [
        { date: '2024-11-01', type: 'Deposit', amount: 500, memo: 'Paycheck' },
        { date: '2024-10-30', type: 'Withdrawal', amount: 200, memo: 'Groceries' },
      ]
    },
    savings: {
      balance: 2000.00,
      transactions: [
        { date: '2024-11-02', type: 'Deposit', amount: 300, memo: 'Bonus' },
        { date: '2024-10-29', type: 'Withdrawal', amount: 100, memo: 'Transfer to Checking' },
      ]
    }
  };
  
  return accountData[accountType];
}

// GET account overview page based on role
router.get('/', function(req, res) {
  const userRole = req.session.user ? req.session.user.role : 'guest';

  if (userRole === 'customer') {
    res.render('customerAccount'); // Or render customer dashboard with account options
  } else if (userRole === 'employee') {
    res.render('employeeAccount');
  } else if (userRole === 'admin') {
    res.render('adminAccount');
  } else {
    res.redirect('/login');
  }
});

// GET Checking account transactions
router.get('/checking', function(req, res) {
  const accountData = getAccountData('checking');
  res.render('transaction', { accountType: 'Checking', transactions: accountData.transactions });
});

// GET Savings account transactions
router.get('/savings', function(req, res) {
  const accountData = getAccountData('savings');
  res.render('transaction', { accountType: 'Savings', transactions: accountData.transactions });
});

module.exports = router;


