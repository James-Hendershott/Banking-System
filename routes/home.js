const express = require('express');
const router = express.Router();
const roleCheck = require('../middleware/roleCheck');

// Render home page or redirect based on role
router.get('/', (req, res) => {
    const userRole = req.session.user?.role || 'guest';

    switch (userRole) {
        case 'customer':
            return res.redirect('/customer/account');
        case 'employee':
            return res.redirect('/employee/account');
        case 'admin':
            return res.redirect('/admin/account');
        default:
            return res.render('home'); // Display the generic home page
    }
});

module.exports = router;
