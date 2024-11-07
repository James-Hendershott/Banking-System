var express = require('express');
var router = express.Router();

// GET forgot password page
router.get('/', function(req, res) {
  res.render('forgotPassword'); // Render the forgot password form
});

// POST handle forgot password form submission
router.post('/', function(req, res) {
  const { email } = req.body;

  // Placeholder for sending password reset instructions (e.g., email with reset link)
  console.log(`Password reset requested for email: ${email}`);

  // Render a confirmation page or message
  res.render('forgotPasswordConfirmation', { email });
});

module.exports = router;
