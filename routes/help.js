const express = require('express');
const router = express.Router();

// Render help page
router.get('/', (req, res) => {
    res.render('help'); // Display the help page
});

module.exports = router;