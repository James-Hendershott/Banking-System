const db = require('./database');

// Fetch a user's information by their username
async function fetchUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.con.query('CALL fetch_user_by_username(?)', [username], (err, results) => {
            if (err) return reject(err);
            resolve(results[0][0]); // Resolving with the first (and only) row of results
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

// Promote a user to admin
async function promoteUserToAdmin(userId) {
    return new Promise((resolve, reject) => {
        const query = `CALL change_user_type(?, 'admin')`;
        db.con.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Error promoting user to admin:', err.message);
                return reject(err);
            }
            console.log(`User with user_id ${userId} promoted to admin.`);
            resolve(results);
        });
    });
}

module.exports = { promoteUserToAdmin, fetchUserAccounts, fetchTransactions, fetchUserByUsername };