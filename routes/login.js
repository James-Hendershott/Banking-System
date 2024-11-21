var express = require('express');
var router = express.Router();
const db = require('../lib/database'); // import the database module
const crypto = require('crypto'); // Import the crypto module

/* GET login page */
router.get('/', function(req, res, next) {
  res.render('login');
});

/* POST login credentials */
router.post('/', function(req, res, next) {
  const { username, password } = req.body;
// Check if username exists in the database
    db.con.query(
        `SELECT u.user_id, u.hashed_password, u.salt, r.type AS role 
         FROM users u 
         JOIN user_roles r ON u.user_role_id = r.id 
         WHERE u.username = ?`,
        [username],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.render('login', { error: 'An error occurred. Please try again.' });
            }

            if (results.length === 0) {
                // Username not found
                return res.render('login', { error: 'Invalid username or password.' });
            }

            const user = results[0];

            // Hash the provided password with the stored salt
            const hash = crypto
                .createHash('sha256')
                .update(password + user.salt)
                .digest('hex');

            if (hash === user.hashed_password) {
                // Password matches
                req.session.user = {
                    user_id: user.user_id,
                    role: user.role,
                };

                // Redirect based on the user's role
                if (user.role === 'admin') {
                    return res.redirect('/admin/account');
                } else if (user.role === 'employee') {
                    return res.redirect('/employee/account');
                } else if (user.role === 'customer') {
                    return res.redirect('/customer/account');
                }
            } else {
                // Password does not match
                return res.render('login', { error: 'Invalid username or password.' });
            }
        }
    );
});

module.exports = router;