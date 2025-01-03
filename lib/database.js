// Import the required modules
const mysql = require('mysql2'); // MySQL module for database interaction
const dbConfig = require('./connectionInfo'); // Database connection information

// **Create MySQL connection**
// Configure the MySQL connection using parameters from connectionInfo.js
const con = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
    multipleStatements: true, // Allow multiple SQL statements in one query
});

// **Initialize the Database**
// Sets up the database, tables, stored procedures, and dummy data
async function initializeDatabase() {
    try {
        await connectToDatabase(); // Establish a connection to the database
        console.log('Connected to MySQL');
        await setupDatabase(); // Set up the schema, procedures, and dummy data
        console.log('Database setup complete.');
    } catch (err) {
        console.error('Error initializing database:', err.message);
    }
}

// **Connect to the Database**
// Wrap the connection logic in a Promise for async/await support
function connectToDatabase() {
    return new Promise((resolve, reject) => {
        con.connect((err) => (err ? reject(err) : resolve()));
    });
}

// **Set up the Database**
// This function ensures the database schema and stored procedures are correctly created
async function setupDatabase() {
    await query('CREATE DATABASE IF NOT EXISTS banking_system'); // Create database if it doesn't exist
    await query('USE banking_system'); // Switch to the created/target database
    console.log('Using banking_system database.');

    await dropExistingProcedures(); // Drop existing procedures to avoid conflicts
    await createTables(); // Create necessary tables
    await createStoredProcedures(); // Define stored procedures
    await addTableData(); // Populate the database with default data
}

// **Drop Existing Stored Procedures**
// Clean up existing stored procedures before recreating them
async function dropExistingProcedures() {
    const procedures = [
        'register_user',
        'change_user_password',
        'validate_login',
        'get_salt',
        'change_user_type',
        'transfer_funds',
        'add_user_role',
        'add_bank_account',
        'add_transaction',
        'fetch_user_by_id',
        'fetch_user_by_username',
        'get_user_account_balances',
        'fetch_recent_transactions',
        'fetch_transactions',
    ];

    for (const procedure of procedures) {
        try {
            await query(`DROP PROCEDURE IF EXISTS ${procedure}`);
            console.log(`Stored procedure "${procedure}" dropped.`);
        } catch (err) {
            console.error(`Error dropping procedure "${procedure}":`, err.message);
        }
    }
}

// **Create Tables**
// Define all necessary tables with proper constraints and relationships
async function createTables() {
    const tableDefinitions = [
        `CREATE TABLE IF NOT EXISTS user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL UNIQUE
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            hashed_password VARCHAR(255) NOT NULL,
            salt VARCHAR(255) NOT NULL,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            user_role_id INT NOT NULL,
            FOREIGN KEY (user_role_id) REFERENCES user_roles(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS bank_accounts (
            account_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance DECIMAL(15, 2) DEFAULT 0.00,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS transactions (
            transaction_id INT AUTO_INCREMENT PRIMARY KEY,
            from_account INT,
            to_account INT,
            amount DECIMAL(15, 2) NOT NULL,
            memo VARCHAR(255),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_account) REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
            FOREIGN KEY (to_account) REFERENCES bank_accounts(account_id) ON DELETE CASCADE
        )`,
    ];

    for (const definition of tableDefinitions) {
        try {
            await query(definition);
            console.log('Table created or verified.');
        } catch (err) {
            console.error('Error creating table:', err.message);
        }
    }
}

// **Wrapper for Executing SQL Queries**
// Allows using async/await for SQL queries
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        con.query(sql, params, (err, results) => {
            if (err) {
                console.error(`Error executing query: ${sql} with params: ${params}`, err.message);
                return reject(err);
            }
            resolve(results);
        });
    });
}

// **Create Stored Procedures** 
// Define and create stored procedures in the database
async function createStoredProcedures() {
    const procedures = [
        {
            name: 'register_user', // Register a new user with details
            sql: `
            CREATE PROCEDURE register_user(
                IN in_username VARCHAR(255),
                IN in_hashed_password VARCHAR(255),
                IN in_salt VARCHAR(255),
                IN in_first_name VARCHAR(255),
                IN in_last_name VARCHAR(255),
                IN in_email VARCHAR(255),
                OUT out_result INT
            )
            BEGIN
                DECLARE userCount INT DEFAULT 0;
                SET out_result = 0;

                -- Check if the username already exists
                SELECT COUNT(*) INTO userCount FROM users WHERE username = in_username;

                -- If the username does not exist, insert the new user
                IF userCount = 0 THEN
                    INSERT INTO users (username, hashed_password, salt, first_name, last_name, email, user_role_id)
                    VALUES (
                        in_username,
                        in_hashed_password,
                        in_salt,
                        in_first_name,
                        in_last_name,
                        in_email,
                        (SELECT id FROM user_roles WHERE type = 'customer')
                    );
                ELSE
                    SET out_result = 1; -- Indicate that the username is already taken
                END IF;
            END;
            `,
        },
        {
            name: 'change_user_password', // Update user password securely
            sql: `
            CREATE PROCEDURE change_user_password(
                IN in_username VARCHAR(255),
                IN in_new_password VARCHAR(255)
            )
            BEGIN
                -- Update the hashed password for the specified username
                UPDATE users
                SET hashed_password = SHA2(in_new_password, 256)
                WHERE username = in_username;
            END;
            `,
        },
        {
            name: 'validate_login', // Validate user credentials during login
            sql: `
            CREATE PROCEDURE validate_login(
                IN in_username VARCHAR(255)
            )
            BEGIN
                -- Fetch user details for login validation
                SELECT 
                u.user_id,
                u.username,
                u.hashed_password,
                r.type AS role
                FROM users u
                JOIN user_roles r ON u.user_role_id = r.id
                WHERE u.username = in_username
                LIMIT 1;
            END;
            `,
        },
        {
            name: 'get_salt', // Retrieve the salt for hashing password during login
            sql: `
            CREATE PROCEDURE get_salt(
                IN username_param VARCHAR(255)
            )
            BEGIN
                -- Retrieve the salt for the specified username
                SELECT salt 
                FROM users 
                WHERE username = username_param 
                LIMIT 1;
            END;
            `,
        },
        {
            name: 'change_user_type', // Change the role of a user
            sql: `
            CREATE PROCEDURE change_user_type(
                IN in_username VARCHAR(255),
                IN in_new_role VARCHAR(50)
            )
            BEGIN
                -- Update the user's role based on the role type
                UPDATE users
                SET user_role_id = (SELECT id FROM user_roles WHERE type = in_new_role LIMIT 1)
                WHERE username = in_username;
            END;
            `,
        },
        {
            name: 'transfer_funds', // Handle fund transfers between accounts
            sql: `
            CREATE PROCEDURE transfer_funds(
                IN in_from_account INT,
                IN in_to_account INT,
                IN in_amount DECIMAL(15, 2),
                IN in_memo VARCHAR(255),
                OUT out_result INT
            )
            proc_block: BEGIN
                DECLARE from_balance DECIMAL(15, 2);
                DECLARE to_account_exists INT;

                SET out_result = 0;

                -- Check for self-transfer
                IF in_from_account = in_to_account THEN
                    SET out_result = 2; -- Error: Cannot transfer to the same account
                    LEAVE proc_block;
                END IF;

                -- Check if the to_account exists
                SELECT COUNT(*) INTO to_account_exists FROM bank_accounts WHERE account_id = in_to_account;
                IF to_account_exists = 0 THEN
                    SET out_result = 3; -- Error: To account does not exist
                    LEAVE proc_block;
                END IF;

                -- Check from_account balance
                SELECT balance INTO from_balance FROM bank_accounts WHERE account_id = in_from_account;
                IF from_balance < in_amount THEN
                    SET out_result = 1; -- Error: Insufficient funds
                    LEAVE proc_block;
                END IF;

                -- Perform transfer
                UPDATE bank_accounts SET balance = balance - in_amount WHERE account_id = in_from_account;
                UPDATE bank_accounts SET balance = balance + in_amount WHERE account_id = in_to_account;

                -- Log the transaction
                INSERT INTO transactions (from_account, to_account, amount, memo) 
                VALUES (in_from_account, in_to_account, in_amount, in_memo);

                -- Indicate success
                SET out_result = 0;
            END;`,
        },
        {
            name: 'add_user_role', // Add a new user role (e.g., admin, customer, employee)
            sql: `
            CREATE PROCEDURE add_user_role(
                IN in_role_type VARCHAR(255)
            )
            BEGIN
                -- Insert the role into user_roles if it does not already exist
                INSERT IGNORE INTO user_roles (type) 
                VALUES (in_role_type);
            END;
            `,
        },
        {
            name: 'add_bank_account', // Create a bank account for a user
            sql: `
            CREATE PROCEDURE add_bank_account(
                IN in_user_id INT,
                IN in_account_type VARCHAR(255),
                IN in_balance DECIMAL(15, 2)
            )
            BEGIN
                -- Insert a new bank account for the specified user
                INSERT INTO bank_accounts (user_id, account_type, balance)
                VALUES (in_user_id, in_account_type, in_balance);
            END;
            `,
        },
        {
            name: 'add_transaction',
            sql: `
            CREATE PROCEDURE add_transaction(
                IN in_from_account INT,
                IN in_to_account INT,
                IN in_amount DECIMAL(15, 2),
                IN in_memo VARCHAR(255)
            )
            BEGIN
                -- Record the transaction details in the transactions table
                INSERT INTO transactions (from_account, to_account, amount, memo)
                VALUES (in_from_account, in_to_account, in_amount, in_memo);
        
                -- Update the balance for deposits
                IF in_to_account IS NOT NULL THEN
                    UPDATE bank_accounts
                    SET balance = balance + in_amount
                    WHERE account_id = in_to_account;
                END IF;
        
                -- Update the balance for withdrawals
                IF in_from_account IS NOT NULL THEN
                    UPDATE bank_accounts
                    SET balance = balance - ABS(in_amount)
                    WHERE account_id = in_from_account;
                END IF;
            END;
            `,
        },
        
        {
            name: 'fetch_user_by_id', // Retrieve a user by their user_id
            sql: `
            CREATE PROCEDURE fetch_user_by_id(
                IN in_user_id INT
            )
            BEGIN
                -- Select user details by user_id, including their role
                SELECT 
                u.username,
                u.salt,
                r.type AS role
                FROM users u
                JOIN user_roles r ON u.user_role_id = r.id
                WHERE u.user_id = in_user_id
                LIMIT 1;
            END;
            `,
        },
        {
            name: 'fetch_user_by_username', // Retrieve a user by their username
            sql: `
            CREATE PROCEDURE fetch_user_by_username(
                IN in_username VARCHAR(255)
            )
            BEGIN
                -- Select user details by username, including their role
                SELECT 
                u.user_id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                r.type AS role
                FROM users u
                JOIN user_roles r ON u.user_role_id = r.id
                WHERE u.username = in_username
                LIMIT 1;
            END;
            `,
        },
        {
            name: 'get_user_account_balances', // Retrieve all account balances for a user
            sql: `
            CREATE PROCEDURE get_user_account_balances(
                IN in_user_id INT
            )
            BEGIN
                SELECT account_id, account_type, balance
                FROM bank_accounts
                WHERE user_id = in_user_id;
                END;
            `,
        },
        {
            name: 'fetch_recent_transactions', // Fetch the 5 most recent transactions where the user is involved
            sql: `
            CREATE PROCEDURE fetch_recent_transactions(
                IN user_id INT
            )
            BEGIN
                -- Fetch the 5 most recent transactions where the user is involved
                SELECT 
                    t.transaction_id,
                    t.from_account,
                    t.to_account,
                    t.amount,
                    t.memo,
                    t.timestamp
                FROM transactions t
                JOIN bank_accounts b ON t.from_account = b.account_id OR t.to_account = b.account_id
                WHERE b.user_id = user_id
                ORDER BY t.timestamp DESC
                LIMIT 5;
            END;
            `,
        },
        {
            name: 'fetch_transactions', // Retrieve transaction history for a user
            sql: `
            CREATE PROCEDURE fetch_transactions(
                IN in_user_id INT
            )
            BEGIN
                -- Fetch transactions where the user is either the sender or recipient
                SELECT 
                t.transaction_id,
                t.from_account,
                t.to_account,
                t.amount,
                t.memo,
                t.timestamp
                FROM transactions t
                JOIN bank_accounts b ON t.from_account = b.account_id OR t.to_account = b.account_id
                WHERE b.user_id = in_user_id
                ORDER BY t.timestamp DESC;
            END;
            `,
        },
    ];

    for (const { name, sql } of procedures) {
        try {
            await query(sql);
            console.log(`Stored procedure "${name}" created or verified.`);
        } catch (err) {
            console.error(`Error creating procedure "${name}":`, err.message);
        }
    }
}

// Wrapper for executing queries
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        con.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// Function to get user account balances
function getUserAccountBalances(userId, callback) {
    const sql = `
        SELECT ba.account_type, ba.balance
        FROM users u
        LEFT JOIN bank_accounts ba ON u.user_id = ba.user_id
        WHERE u.user_id = ?
    `;
    con.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user account balances:', err);
            return callback(err, null);
        }
        console.log(`User balances for user_id ${userId}:`, results);
        callback(null, results);
    });
}

// Function to promote user to Admin
function promoteUserToAdmin(userId, callback) {
    const sql = `CALL change_user_type(?, 'admin')`;
    con.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error promoting user to admin:', err);
            return callback(err, null);
        }
        console.log(`User with user_id ${userId} promoted to admin.`);
        callback(null, results);
    });
}

// **Function to Add Dummy Data**
// Populates the database with default roles, users, and accounts
async function addTableData() {
    console.log('Adding default data to the database...');

    // Step 1: Add default roles
    const roles = ['customer', 'admin', 'employee'];
    for (const role of roles) {
        await new Promise((resolve, reject) => {
            const sql = `CALL add_user_role(?)`;
            con.query(sql, [role], (err) => {
                if (err) {
                    console.log(`Error adding '${role}' role:`, err.message);
                    return reject(err);
                }
                console.log(`Role '${role}' ensured in user_roles table.`);
                resolve();
            });
        });
    }
    // Step 2: Add dummy users
    const users = [
        // Admin
        {
            username: 'admin',
            hashed_password: 'da9e7000e36cec1f0c99276f00870d86e1da110ce853af61518f5547f9da7e4e',
            salt: '0b432e7d-c744-11ef-ac5e-103d1c624025',
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'admin',
        },
        // Employee
        {
            username: 'employee',
            hashed_password: '7382c15e4e7d12b48bd1ba8085d5db19042a0cf2829b5352525ab9b152b23c29',
            salt: '0b43e378-c744-11ef-ac5e-103d1c624025',
            first_name: 'Employee',
            last_name: 'User',
            email: 'employee@example.com',
            role: 'employee',
        },
        // Customers
        {
            username: 'customer1',
            hashed_password: '004f8694d3656bd150f8dd23e2441039e41bf1f1546a4c047e4875c98af2f31f',
            salt: '0b439633-c744-11ef-ac5e-103d1c624025',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            role: 'customer',
        },
        {
            username: 'customer2',
            hashed_password: '004f8694d3656bd150f8dd23e2441039e41bf1f1546a4c047e4875c98af2f31f',
            salt: '0b439633-c744-11ef-ac5e-103d1c624025',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com',
            role: 'customer',
        },
        {
            username: 'customer3',
            hashed_password: '004f8694d3656bd150f8dd23e2441039e41bf1f1546a4c047e4875c98af2f31f',
            salt: '0b439633-c744-11ef-ac5e-103d1c624025',
            first_name: 'Mike',
            last_name: 'Brown',
            email: 'mike.brown@example.com',
            role: 'customer',
        },
        {
            username: 'customer4',
            hashed_password: '004f8694d3656bd150f8dd23e2441039e41bf1f1546a4c047e4875c98af2f31f',
            salt: '0b439633-c744-11ef-ac5e-103d1c624025',
            first_name: 'Alice',
            last_name: 'Johnson',
            email: 'alice.johnson@example.com',
            role: 'customer',
        },
        {
            username: 'customer5',
            hashed_password: '004f8694d3656bd150f8dd23e2441039e41bf1f1546a4c047e4875c98af2f31f',
            salt: '0b439633-c744-11ef-ac5e-103d1c624025',
            first_name: 'Zero',
            last_name: 'Balance',
            email: 'zero.balance@example.com',
            role: 'customer',
        },
    ];

    // Add users and map their IDs
    const userIdMap = {};
    for (const user of users) {
        const userExistsSql = `SELECT COUNT(*) AS count FROM users WHERE username = ?`;
        const userExists = await new Promise((resolve, reject) => {
            con.query(userExistsSql, [user.username], (err, results) => {
                if (err) return reject(err);
                resolve(results[0].count > 0);
            });
        });

        if (!userExists) {
            const userSql = `
                INSERT INTO users (username, hashed_password, salt, first_name, last_name, email, user_role_id)
                VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM user_roles WHERE type = ?));
            `;
            await new Promise((resolve, reject) => {
                con.query(userSql, [user.username, user.hashed_password, user.salt, user.first_name, user.last_name, user.email, user.role], (err) => {
                    if (err) return reject(err);
                    console.log(`User '${user.username}' added.`);
                    resolve();
                });
            });
        }

        // Map user ID
        const userIdQuery = `SELECT user_id FROM users WHERE username = ?`;
        const userId = await new Promise((resolve, reject) => {
            con.query(userIdQuery, [user.username], (err, results) => {
                if (err) return reject(err);
                if (results.length > 0) resolve(results[0].user_id);
                else resolve(null);
            });
        });
        userIdMap[user.username] = userId;
    }

    // Step 3: Add accounts
    const accountData = [
        { username: 'customer1', checking: 1500.50, savings: 3000.75 },
        { username: 'customer2', checking: 500.00, savings: 1000.00 },
        { username: 'customer3', checking: 2000.00, savings: 5000.00 },
        { username: 'customer4', checking: 100.00, savings: 200.00 },
        { username: 'customer5', checking: 0.00, savings: 0.00 },
        { username: 'employee', checking: 1000.00, savings: 2500.00 },
    ];

   for (const { username, checking, savings } of accountData) {
        const userId = userIdMap[username];
        if (!userId) {
            console.error(`No user_id found for username '${username}'.`);
            continue;
        }

        const accountsExistQuery = `SELECT COUNT(*) AS count FROM bank_accounts WHERE user_id = ?`;
        const accountsExist = await new Promise((resolve, reject) => {
            con.query(accountsExistQuery, [userId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0].count > 0);
            });
        });

        if (!accountsExist) {
            const accountSql = `
                INSERT INTO bank_accounts (user_id, account_type, balance)
                VALUES (?, ?, ?)
            `;
            await new Promise((resolve, reject) => {
                con.query(accountSql, [userId, 'Checking', checking], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            await new Promise((resolve, reject) => {
                con.query(accountSql, [userId, 'Savings', savings], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            console.log(`Accounts added for '${username}' (user_id: ${userId}): Checking $${checking}, Savings $${savings}.`);
        }
    }
}


module.exports = {
    initializeDatabase,
    con,
    addTableData,
    getUserAccountBalances,
    promoteUserToAdmin,
};
