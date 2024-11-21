const db = require('../lib/database');

module.exports = {
    checkCustomer: (req, res, next) => {
        console.log('Session User:', req.session.user);  // Log session user information
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user.user_id;

        db.con.query(
            `CALL fetch_user_by_id(?)`,
            [userId],
            (err, results) => {
                if (err || results[0].length === 0 || results[0][0].role !== 'customer') {
                    console.log('Role Check Failed: User not found or role mismatch');
                    return res.redirect('/login');
                }
                console.log('Role Check Passed: User is customer');
                next();
            }
        );
    },
    checkEmployee: (req, res, next) => {
        console.log('Session User:', req.session.user);
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user.user_id;

        db.con.query(
            `CALL fetch_user_by_id(?)`,
            [userId],
            (err, results) => {
                if (err || results[0].length === 0 || results[0][0].role !== 'employee') {
                    console.error('Role Check Failed: User not found or role mismatch');
                    return res.redirect('/login');
                }
                next();
            }
        );
    },
    checkAdmin: (req, res, next) => {
        console.log('Session User:', req.session.user);
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user.user_id;

        db.con.query(
            `CALL fetch_user_by_id(?)`,
            [userId],
            (err, results) => {
                if (err || results[0].length === 0 || results[0][0].role !== 'admin') {
                    console.error('Role Check Failed: User not found or role mismatch');
                    return res.redirect('/login');
                }
                next();
            }
        );
    },
};
