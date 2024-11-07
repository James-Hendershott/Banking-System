module.exports = {
  checkCustomer: (req, res, next) => {
    if (req.session.user && req.session.user.role === 'customer') {
      next();
    } else {
      res.redirect('/login'); // Redirect if not authorized
    }
  },
  
  checkEmployee: (req, res, next) => {
    if (req.session.user && req.session.user.role === 'employee') {
      next();
    } else {
      res.redirect('/login');
    }
  },
  
  checkAdmin: (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
      next();
    } else {
      res.redirect('/login');
    }
  }
};

