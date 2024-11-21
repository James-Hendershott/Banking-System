var express = require('express');
var router = express.Router();
const db = require('../lib/database');

// Helper function to get transaction data by account type
function getTransactions(userId, accountType, callback) {
  const accountCondition = accountType === 'checking' ? 'Checking Account' : 'Savings Account';

  db.con.query(
    `SELECT * FROM transactions WHERE (from_account = ? OR to_account = ?) AND account_type = ?`, 
    [userId, userId, accountCondition], 
    callback
  );
}

// GET account overview page based on role
router.get('/', function (req, res) {
  const userRole = req.session.user ? req.session.user.role : 'guest';

  if (userRole === 'customer') {
    res.render('customerAccount'); // Render customer dashboard with account options
  } else if (userRole === 'employee') {
    res.render('employeeAccount');
  } else if (userRole === 'admin') {
    res.render('adminAccount');
  } else {
    res.redirect('/login');
  }
});

// GET Checking account transactions
router.get('/checking', function (req, res) {
  const userId = req.session.user.user_id;

  getTransactions(userId, 'checking', (err, results) => {
    if (err) {
      console.error(err);
      return res.redirect('/account');
    }

    res.render('transaction', { accountType: 'Checking', transactions: results });
  });
});

// GET Savings account transactions
router.get('/savings', function (req, res) {
  const userId = req.session.user.user_id;

  getTransactions(userId, 'savings', (err, results) => {
    if (err) {
      console.error(err);
      return res.redirect('/account');
    }

    res.render('transaction', { accountType: 'Savings', transactions: results });
  });
});

module.exports = router;
