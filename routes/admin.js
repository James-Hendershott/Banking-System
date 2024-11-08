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

// Mock customer data for demonstration (replace with actual database calls)
const mockCustomers = [
    { id: 'cust1', checkingBalance: 0.00, savingsBalance: 0.00 },
    { id: 'cust2', checkingBalance: 1000.00, savingsBalance: 1500.00 } // Example account with balance
];
// POST promote a user to Admin
router.post('/promote-user', function(req, res) {
    const userId = req.body.userId;
    const promote = req.body.promote ? true : false; // Check if the checkbox was checked

    // Find the customer data (this should be replaced with actual data retrieval logic)
    const customer = mockCustomers.find(c => c.id === userId);

    if (!customer) {
        return res.status(404).send('User not found');
    }

    // Check account balances before promoting
    if (promote) {
        if (customer.checkingBalance > 0 || customer.savingsBalance > 0) {
            console.log(`User ${userId} cannot be promoted as they have funds in their accounts.`);
            return res.render('promotionConfirmation', {
                error: 'Promotion failed: Customer must have $0 in both accounts to be promoted to Admin.',
                userId
            });
        } else {
            // Add logic to promote the user in your database or data store here
            console.log(`User ${userId} has been promoted to Admin.`);
            // Redirect to a confirmation page
            res.render('promotionConfirmation', { userId });
        }
    } else {
        console.log(`User ${userId} promotion canceled.`);
        // Redirect back to the admin account management page
        res.redirect('/admin/account');
    }
});
// POST change user password
router.post('/change-password', function(req, res) {
  const { userId, newPassword } = req.body;
  console.log(`Password for user ${userId} changed to ${newPassword}`);
  res.redirect('/admin/account'); // Redirect to the account page
});

module.exports = router;


