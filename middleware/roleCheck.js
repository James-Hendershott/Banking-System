const db = require('../lib/database');

module.exports = {
    checkCustomer: (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user.user_id;
        db.con.query(
            `SELECT r.type FROM users u 
             JOIN user_roles r ON u.user_role_id = r.id 
             WHERE u.user_id = ?`,
            [userId],
            (err, results) => {
                if (err || results.length === 0 || results[0].type !== 'customer') {
                    return res.redirect('/login');
                }
                next();
            }
        );
    },
    checkEmployee: (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user.user_id;
        db.con.query(
            `SELECT r.type FROM users u 
             JOIN user_roles r ON u.user_role_id = r.id 
             WHERE u.user_id = ?`,
            [userId],
            (err, results) => {
                if (err || results.length === 0 || results[0].type !== 'employee') {
                    return res.redirect('/login');
                }
                next();
            }
        );
    },
    checkAdmin: (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user.user_id;
        db.con.query(
            `SELECT r.type FROM users u 
             JOIN user_roles r ON u.user_role_id = r.id 
             WHERE u.user_id = ?`,
            [userId],
            (err, results) => {
                if (err || results.length === 0 || results[0].type !== 'admin') {
                    return res.redirect('/login');
                }
                next();
            }
        );
    },
};
