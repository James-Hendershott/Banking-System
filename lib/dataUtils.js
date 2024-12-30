const db = require('./database');

async function fetchUserById(userId) {
    return new Promise((resolve, reject) => {
        db.con.query('CALL fetch_user_by_id(?)', [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0][0]);
        });
    });
}

async function fetchUserAccounts(userId) {
    return new Promise((resolve, reject) => {
        db.con.query('CALL get_user_account_balances(?)', [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
}

async function fetchTransactions(accountId) {
    return new Promise((resolve, reject) => {
        db.con.query(
            'SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY timestamp DESC',
            [accountId, accountId],
            (err, results) => {
                if (err) return reject(err);
                resolve(results);
            }
        );
    });
}

module.exports = { fetchUserById, fetchUserAccounts, fetchTransactions };
