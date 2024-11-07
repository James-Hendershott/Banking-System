var express = require('express');
var router = express.Router();

// GET help page
router.get('/', function(req, res) {
   res.render('help');
});

module.exports = router;
