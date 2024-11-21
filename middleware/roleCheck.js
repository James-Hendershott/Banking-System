const db = require('../lib/database'); // Import the database connection

module.exports = {
  checkCustomer: async (req, res, next) => {
    try {
      if (req.session.user && req.session.user.user_id) {
        // Query the database to get the user's role
        const [result] = await db.promise().query(
          'SELECT type FROM user_roles INNER JOIN users ON users.user_role_id = user_roles.id WHERE users.user_id = ?',
          [req.session.user.user_id]
        );

        if (result.length > 0 && result[0].type === 'customer') {
          next(); // User is a customer; proceed
        } else {
          res.redirect('/login'); // Redirect if not authorized
        }
      } else {
        res.redirect('/login'); // Redirect if no session or user ID
      }
    } catch (err) {
      console.error('Error checking customer role:', err);
      res.redirect('/login'); // Redirect on error
    }
  },

  checkEmployee: async (req, res, next) => {
    try {
      if (req.session.user && req.session.user.user_id) {
        // Query the database to get the user's role
        const [result] = await db.promise().query(
          'SELECT type FROM user_roles INNER JOIN users ON users.user_role_id = user_roles.id WHERE users.user_id = ?',
          [req.session.user.user_id]
        );

        if (result.length > 0 && result[0].type === 'employee') {
          next(); // User is an employee; proceed
        } else {
          res.redirect('/login'); // Redirect if not authorized
        }
      } else {
        res.redirect('/login'); // Redirect if no session or user ID
      }
    } catch (err) {
      console.error('Error checking employee role:', err);
      res.redirect('/login'); // Redirect on error
    }
  },

  checkAdmin: async (req, res, next) => {
    try {
      if (req.session.user && req.session.user.user_id) {
        // Query the database to get the user's role
        const [result] = await db.promise().query(
          'SELECT type FROM user_roles INNER JOIN users ON users.user_role_id = user_roles.id WHERE users.user_id = ?',
          [req.session.user.user_id]
        );

        if (result.length > 0 && result[0].type === 'admin') {
          next(); // User is an admin; proceed
        } else {
          res.redirect('/login'); // Redirect if not authorized
        }
      } else {
        res.redirect('/login'); // Redirect if no session or user ID
      }
    } catch (err) {
      console.error('Error checking admin role:', err);
      res.redirect('/login'); // Redirect on error
    }
  }
};

