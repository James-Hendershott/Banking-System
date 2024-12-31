const db = require('./database');

// Fetch a user's information by their user ID
async function fetchUserById(userId) {
    return new Promise((resolve, reject) => {
        db.con.query('CALL fetch_user_by_id(?)', [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0][0]); // Resolving with the user's information
        });
    });
}

// Fetch all accounts associated with a specific user
async function fetchUserAccounts(userId) {
    return new Promise((resolve, reject) => {
        db.con.query('CALL get_user_account_balances(?)', [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]); // Resolving with an array of account details
        });
    });
}

// Fetch transactions for a specific account
async function fetchTransactions(accountId) {
    return new Promise((resolve, reject) => {
        db.con.query(
            'SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY timestamp DESC',
            [accountId, accountId],
            (err, results) => {
                if (err) return reject(err);
                resolve(results); // Resolving with a list of transactions
            }
        );
    });
}

module.exports = { fetchUserById, fetchUserAccounts, fetchTransactions };