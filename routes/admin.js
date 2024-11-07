var express = require('express');
var router = express.Router();

// GET admin account management page
router.get('/account', function(req, res) {
  // Render adminAccount with userAccount initialized as null for initial load
  res.render('adminAccount', { userAccount: null });
});

// POST search for a user by ID
router.post('/account-search', function(req, res) {
  const userId = req.body.userId;

  // Mock user account data
  const userAccount = {
    userId,
    accountType: "Checking and Savings",
    email: "user@example.com"
  };

  // Render with the userAccount data
  res.render('adminAccount', { userAccount });
});

// POST change user password
router.post('/change-password', function(req, res) {
  const { userId, newPassword } = req.body;
  console.log(`Password for user ${userId} changed to ${newPassword}`);
  res.redirect('/admin/account'); // Redirect to the account page
});

module.exports = router;


