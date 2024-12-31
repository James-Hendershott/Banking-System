const express = require('express');
const router = express.Router();

// Render forgot password page
router.get('/', (req, res) => {
    res.render('forgotPassword'); // Display the forgot password form
});

// Handle forgot password form submission
router.post('/', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.render('forgotPassword', { error: 'Email is required.' });
    }

    // Placeholder for sending password reset instructions (e.g., via email)
    console.log(`Password reset requested for email: ${email}`);

    // Render a confirmation page
    res.render('forgotPasswordConfirmation', { email });
});

module.exports = router;

