const express = require('express');
const router = express.Router();

// Logout route
router.get('/', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('An error occurred while logging out.');
        }

        // Redirect to login page after logout
        res.redirect('/login');
    });
});

module.exports = router;
