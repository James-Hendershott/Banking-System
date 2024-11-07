var express = require('express');
var router = express.Router();
const crypto = require('crypto'); // For generating unique IDs

// Function to generate a unique ID
function generateUniqueID() {
  return crypto.randomInt(100000, 999999); // Generates a 6-digit number
}
// GET registration page
router.get('/', function(req, res) {
   res.render('register');
});

// POST registration form submission
router.post('/', async function(req, res) {
   const { firstName, lastName, email, password } = req.body;

   // Generate a random unique ID for username
   const uniqueID = generateUniqueID();

   // Here, add logic to check if the ID is already in use, when needed.
   // For example, query the database to ensure the ID is unique.
   
   // Save user data with the generated ID as their username
   // (Database save operation here, assuming async operations)

   // Redirect to login page after successful registration
   //res.redirect('/login');
   
   // Temporarily show the ID on a success page for confirmation
   res.render('registerSuccess', { uniqueID, firstName });
});

module.exports = router;