const db = require('./database');

// Fetch a user's information by their user ID
async function fetchUserById(userId) {
    return new Promise((resolve, reject) => {
        db.con.query('CALL fetch_user_by_id(?)', [userId], (err, results) => {
            if (err) {
                console.error('Error in fetchUserById query:', err.message);
                return reject(err);
            }
            console.log('DEBUG: fetchUserById results:', results);
            if (!results || results.length === 0 || !results[0][0]) {
                return reject(new Error('No user details found for the given ID.'));
            }
            resolve(results[0][0]); // Resolving with the user's information
        });
    });
}


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
        const query = 'SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY timestamp DESC';
        console.log('DEBUG: Executing query:', query, 'with params:', accountId);
        
        db.con.query(query, [accountId, accountId], (err, results) => {
            if (err) {
                console.error('Error fetching transactions:', err.message);
                return reject(err);
            }
            console.log('DEBUG: Query results:', results);
            resolve(results); // Resolving with a list of transactions
        });
    });
}

// Fetch transactions for a specific account using the stored procedure
async function fetchTransactionsByAccount(accountId) {
    return new Promise((resolve, reject) => {
        console.log('DEBUG: Calling fetch_transactions_by_account procedure with accountId:', accountId);

        db.con.query('CALL fetch_transactions_by_account(?)', [accountId], (err, results) => {
            if (err) {
                console.error('Error in fetchTransactionsByAccount:', err.message);
                return reject(err);
            }

            // Stored procedures often return results as a nested array
            const transactions = results[0];
            console.log('DEBUG: Query results from fetch_transactions_by_account:', transactions);
            resolve(transactions);
        });
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

module.exports = { fetchUserById, promoteUserToAdmin, fetchTransactionsByAccount, fetchUserAccounts, fetchTransactions, fetchUserByUsername };