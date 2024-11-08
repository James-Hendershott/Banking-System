var express = require('express');
var router = express.Router();

/* GET login page */
router.get('/', function(req, res, next) {
  res.render('login');
});

/* POST login credentials */
router.post('/', function(req, res, next) {
  const { username, password } = req.body;

  // Placeholder authentication
  if (username === 'admin' && password === 'password') {
    req.session.user = { role: 'admin' }; // Admin session
    res.redirect('/admin/account');
  } else if (username === 'employee' && password === 'password') {
    req.session.user = { role: 'employee' }; // Employee session
    res.redirect('/employee/account');
  } else if (username === 'customer' && password === 'password') {
    req.session.user = { role: 'customer' }; // Customer session
    res.redirect('/customer/account');
  } else {
    res.render('login', { error: 'Invalid credentials' });
  }
});

module.exports = router;