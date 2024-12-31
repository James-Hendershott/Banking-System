const mysql = require('mysql2');
const dbConfig = require('./connectionInfo');
const crypto = require('crypto');

// Create MySQL connection
const con = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
    multipleStatements: true,
});

// Initialize the database
function initializeDatabase() {
    con.connect((err) => {
        if (err) throw err;
        console.log('Connected to MySQL');
        setupDatabase();
    });
}

// Set up database, tables, and stored procedures
function setupDatabase() {
    con.query('CREATE DATABASE IF NOT EXISTS banking_system', (err) => {
        if (err) throw err;
        console.log('Database created or exists.');
        con.query('USE banking_system', (err) => {
            if (err) throw err;
            console.log('Using banking_system database.');
            dropExistingProcedures();
            createTables();
            createStoredProcedures();

            // Add default data to the database
            addTableData();
        });
    });
}

// Drop existing stored procedures
function dropExistingProcedures() {
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
        'fetch_transactions',
    ];
    procedures.forEach((procedure) => {
        con.query(`DROP PROCEDURE IF EXISTS ${procedure}`, (err) => {
            if (err) {
                console.error(`Error dropping procedure "${procedure}":`, err);
                throw err;
            } else {
                console.log(`Stored procedure "${procedure}" dropped.`);
            }
        });
    });
}

// Create tables
function createTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL UNIQUE
        );`,
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
        );`,
        `CREATE TABLE IF NOT EXISTS bank_accounts (
            account_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance DECIMAL(15, 2) DEFAULT 0.00,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS transactions (
            transaction_id INT AUTO_INCREMENT PRIMARY KEY,
            from_account INT,
            to_account INT,
            amount DECIMAL(15, 2) NOT NULL,
            memo VARCHAR(255),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_account) REFERENCES bank_accounts(account_id) ON DELETE CASCADE,
            FOREIGN KEY (to_account) REFERENCES bank_accounts(account_id) ON DELETE CASCADE
        );`,
    ];

    tables.forEach((query) => {
        con.query(query, (err) => {
            if (err) {
                console.error('Error creating table:', err);
                throw err;
            }
        });
    });

    console.log('All tables created or exist.');
}
// Create stored procedures
function createStoredProcedures() {
    const procedures = [
        {
            name: 'register_user',
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
        
                SELECT COUNT(*) INTO userCount FROM users WHERE username = in_username;
        
                IF userCount = 0 THEN
                    INSERT INTO users (username, hashed_password, salt, first_name, last_name, email, user_role_id)
                    VALUES (
                        in_username,
                        in_hashed_password,
                        in_salt,
                        in_first_name,
                        in_last_name,
                        in_email,
                        (SELECT id FROM user_roles WHERE type = 'regular')
                    );
                ELSE
                    SET out_result = 1;
                END IF;
            END;
            `,
        },
        {
            name: 'change_user_password',
            sql: `
            CREATE PROCEDURE change_user_password(
                IN in_username VARCHAR(255),
                IN in_new_password VARCHAR(255)
            )
            BEGIN
                UPDATE users
                SET hashed_password = SHA2(in_new_password, 256)
                WHERE username = in_username;
            END;
            `,
        },

        {
            name: 'validate_login',
            sql: `
            CREATE PROCEDURE validate_login(
                IN in_username VARCHAR(255)
            )
            BEGIN
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
            name: 'get_salt',
            sql: `
            CREATE PROCEDURE get_salt(
                IN username_param VARCHAR(255)
            )
            BEGIN
                SELECT salt 
                FROM users 
                WHERE username = username_param 
                LIMIT 1;
            END;
            `,
        },
        {
            name: 'change_user_type',
            sql: `
            CREATE PROCEDURE change_user_type(
                IN in_username VARCHAR(255),
                IN in_new_role VARCHAR(50)
            )
            BEGIN
                UPDATE users
                SET user_role_id = (SELECT id FROM user_roles WHERE type = in_new_role LIMIT 1)
                WHERE username = in_username;
            END;
            `,
        },
        // Updated transfer_funds stored procedure
        {
            name: 'transfer_funds',
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
                END;
            `,
        },
        {
            name: 'add_user_role',
            sql: `
            CREATE PROCEDURE add_user_role(
                IN in_role_type VARCHAR(255)
            )
            BEGIN
                INSERT IGNORE INTO user_roles (type) 
                VALUES (in_role_type);
            END;
            `,
        },
        {
            name: 'add_bank_account',
            sql: `
            CREATE PROCEDURE add_bank_account(
                IN in_user_id INT,
                IN in_account_type VARCHAR(255),
                IN in_balance DECIMAL(15, 2)
            )
            BEGIN
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
                INSERT INTO transactions (from_account, to_account, amount, memo)
                VALUES (in_from_account, in_to_account, in_amount, in_memo);
            END;
            `,
        },
        {
            name: 'fetch_user_by_id',
            sql: `
            CREATE PROCEDURE fetch_user_by_id(
                IN in_user_id INT
            )
            BEGIN
                SELECT 
                u.username,
                r.type AS role
                FROM users u
                JOIN user_roles r ON u.user_role_id = r.id
                WHERE u.user_id = in_user_id
                LIMIT 1;
            END;
            `,
        },
        {
            name: 'fetch_user_by_username',
            sql: `
            CREATE PROCEDURE fetch_user_by_username(
                IN in_username VARCHAR(255)
            )
            BEGIN
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
            name: 'get_user_account_balances',
            sql: `
            CREATE PROCEDURE get_user_account_balances(
                IN in_user_id INT
            )
            BEGIN
                SELECT account_type, balance
                FROM bank_accounts
                WHERE user_id = in_user_id;
            END;
            `,
        },
        {
            name: 'fetch_transactions',
            sql: `
            CREATE PROCEDURE fetch_transactions(
                IN in_user_id INT
            )
            BEGIN
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

    procedures.forEach(({ name, sql }) => {
        con.query(sql, (err) => {
            if (err) throw err;
            console.log(`Stored procedure "${name}" created or exists.`);
        });
    });
}

// Function to get user account balances
function getUserAccountBalances(userId, callback) {
    const getUserAccountBalancesQuery = `
        SELECT ba.account_type, ba.balance
        FROM users u
        LEFT JOIN bank_accounts ba ON u.user_id = ba.user_id
        WHERE u.user_id = ?
    `;
    con.query(getUserAccountBalancesQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user account balances:', err);
            callback(err, null);
        } else {
            console.log(`User balances for user_id ${userId}:`, results);
            callback(null, results);
        }
    });
}

// Function to promote user to Admin
function promoteUserToAdmin(userId, callback) {
    const promoteUserToAdminQuery = `
        CALL change_user_type(?, 'admin')
    `;
    con.query(promoteUserToAdminQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error promoting user to admin:', err);
            callback(err, null);
        } else {
            console.log(`User with user_id ${userId} promoted to admin.`);
            callback(null, results);
        }
    });
}

// Add Dummy Data
function addTableData() {
    console.log('Adding default data to the database...');

    // Add default roles
    const roles = ['regular', 'admin', 'employee'];
    roles.forEach((role) => {
        const sql = `CALL add_user_role(?)`;
        con.query(sql, [role], (err) => {
            if (err) {
                console.log(`Error adding '${role}' role:`, err.message);
                throw err;
            }
            console.log(`Role '${role}' ensured in user_roles table.`);
        });
    });

    // Precomputed hashed passwords and salts
    const users = [
        {
            username: 'admin',
            hashed_password: 'da9e7000e36cec1f0c99276f00870d86e1da110ce853af61518f5547f9da7e4e',
            salt: '0b432e7d-c744-11ef-ac5e-103d1c624025',
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'admin',
        },
        {
            username: 'customer',
            hashed_password: '004f8694d3656bd150f8dd23e2441039e41bf1f1546a4c047e4875c98af2f31f',
            salt: '0b439633-c744-11ef-ac5e-103d1c624025',
            first_name: 'Customer',
            last_name: 'User',
            email: 'customer@example.com',
            role: 'regular',
        },
        {
            username: 'employee',
            hashed_password: '7382c15e4e7d12b48bd1ba8085d5db19042a0cf2829b5352525ab9b152b23c29',
            salt: '0b43e378-c744-11ef-ac5e-103d1c624025',
            first_name: 'Employee',
            last_name: 'User',
            email: 'employee@example.com',
            role: 'employee',
        },
    ];

    // Insert users and assign roles
    users.forEach((user) => {
        const userExistsSql = `SELECT COUNT(*) AS count FROM users WHERE username = ?`;
        con.query(userExistsSql, [user.username], (err, results) => {
            if (err) {
                console.log(`Error checking existence of user '${user.username}':`, err.message);
                throw err;
            }

            if (results[0].count === 0) {
                const userSql = `
                    INSERT INTO users (username, hashed_password, salt, first_name, last_name, email, user_role_id)
                    VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM user_roles WHERE type = ?));
                `;
                con.query(
                    userSql,
                    [
                        user.username,
                        user.hashed_password,
                        user.salt,
                        user.first_name,
                        user.last_name,
                        user.email,
                        user.role,
                    ],
                    (err) => {
                        if (err) {
                            console.log(`Error adding user '${user.username}':`, err.message);
                            throw err;
                        }
                        console.log(`User '${user.username}' created.`);
                    }
                );
            } else {
                console.log(`User '${user.username}' already exists. Skipping.`);
            }
        });
    });

    // Add accounts for the customer
    const checkingAccountSql = `
        INSERT INTO bank_accounts (user_id, account_type, balance)
        SELECT user_id, 'Checking', 1000
        FROM users
        WHERE username = 'customer'
        AND NOT EXISTS (
            SELECT 1 FROM bank_accounts
            WHERE user_id = (SELECT user_id FROM users WHERE username = 'customer')
            AND account_type = 'Checking'
        );
    `;
    con.query(checkingAccountSql, (err) => {
        if (err) {
            console.log("Error adding customer checking account:", err.message);
            throw err;
        }
        console.log("Customer checking account added.");
    });

    const savingsAccountSql = `
        INSERT INTO bank_accounts (user_id, account_type, balance)
        SELECT user_id, 'Savings', 5000
        FROM users
        WHERE username = 'customer'
        AND NOT EXISTS (
            SELECT 1 FROM bank_accounts
            WHERE user_id = (SELECT user_id FROM users WHERE username = 'customer')
            AND account_type = 'Savings'
        );
    `;
    con.query(savingsAccountSql, (err) => {
        if (err) {
            console.log("Error adding customer savings account:", err.message);
            throw err;
        }
        console.log("Customer savings account added.");
    });
}

module.exports = {
    initializeDatabase,
    con,
    addTableData,
    getUserAccountBalances,
    promoteUserToAdmin,
};
