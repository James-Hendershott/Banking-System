var express = require('express');
var router = express.Router();

/* GET login page */
router.get('/', function(req, res, next) {
    console.log("login.js: GET");
    res.render('login'); // Renders login.ejs
});

/* POST login credentials */
router.post('/', function(req, res, next) {
    console.log("login.js: POST");
    const { username, password } = req.body;

    // Placeholder for authentication logic
    if (username === 'admin' && password === 'password') {
        console.log("Login successful");
        res.redirect('/account'); // Redirect to the account page on successful login
    } else {
        console.log("Login failed");
        res.render('login', { error: 'Invalid credentials' }); // Reloads the page with an error message
    }
});

module.exports = router;
