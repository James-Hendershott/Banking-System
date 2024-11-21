var express = require('express');
var router = express.Router();
const db = require('../lib/database');

// GET admin account management page
router.get('/account', function(req, res) {
  // Render adminAccount with userAccount initialized as null for initial load
  res.render('adminAccount', { userAccount: null });
});

// GET User Search page
router.get('/account-search', function (req, res) {
  res.render('adminAccount', { userAccount: null });
});

// POST search for a user by Username
router.post('/account-search', (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.render('adminAccount', { error: 'Username is missing.' });
  }

  db.con.query(`CALL fetch_user_by_username(?)`, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.render('adminAccount', { error: 'An error occurred. Please try again.' });
    }

    // Check if the user was found
    if (results[0].length === 0) {
      return res.render('adminAccount', { error: 'User not found.' });
    }

    // Extract user details from the SQL result
    const userAccount = results[0][0];
    res.render('adminAccount', { userAccount });
  });
});


// POST promote a user to Admin
router.post('/promote-user', function(req, res) {
  const username = req.body.username;
  const promote = req.body.promote ? true : false; // Check if the checkbox was checked

  if (!username) {
    return res.render('promotionConfirmation', {
      error: 'Username is missing. Please try again.',
      username: null
    });
  }

  db.con.query(`CALL get_user_account_balances(?)`, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.render('promotionConfirmation', {
        error: 'An error occurred while retrieving user account balances.',
        username
      });
    }

    const customer = results[0][0];
    if (!customer) {
      return res.render('promotionConfirmation', {
        error: 'User not found.',
        username
      });
    }

    // Check account balances before promoting
    if (promote) {
      if (customer.checkingBalance > 0 || customer.savingsBalance > 0) {
        console.log(`User ${username} cannot be promoted as they have funds in their accounts.`);
        return res.render('promotionConfirmation', {
          error: 'Promotion failed: Customer must have $0 in both accounts to be promoted to Admin.',
          username
        });
      } else {
        // Update the user's role in the database
        db.con.query(`CALL change_user_type(?, 'admin')`, [username], (err, result) => {
          if (err) {
            console.error(err);
            return res.render('promotionConfirmation', {
              error: 'An error occurred while promoting the user.',
              username
            });
          }

          console.log(`User ${username} has been promoted to Admin.`);
          res.render('promotionConfirmation', { error: null, username });
        });
      }
    } else {
      console.log(`User ${username} promotion canceled.`);
      res.redirect('/admin/account');
    }
  });
});

// POST change user password
router.post('/change-password', function(req, res) {
  const { username, newPassword } = req.body;
  console.log(`Password for user ${username} changed to ${newPassword}`);
  res.redirect('/admin/account'); // Redirect to the account page
});


module.exports = router;
