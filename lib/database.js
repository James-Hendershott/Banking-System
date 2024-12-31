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
            if (process.env.ADD_DUMMY_DATA === 'true') {
                addDummyDataToDatabase();
            }
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
                IN in_password VARCHAR(255),
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
                    SHA2(in_password, 256),
                    UUID(),
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

// Clear dummy data
function clearDummyData(callback) {
    const truncateTables = [
        'SET FOREIGN_KEY_CHECKS = 0;',
        'TRUNCATE TABLE transactions;',
        'TRUNCATE TABLE bank_accounts;',
        'TRUNCATE TABLE users;',
        'TRUNCATE TABLE user_roles;',
        'SET FOREIGN_KEY_CHECKS = 1;',
    ];

    con.query(truncateTables.join(' '), (err) => {
        if (err) {
            console.error('Error clearing dummy data:', err);
            throw err;
        }
        console.log('Dummy data cleared.');
        callback();
    });
}

// Add dummy data to the database
function addDummyDataToDatabase() {
    clearDummyData(() => {
        console.log('Starting dummy data insertion...');
        
        // Insert default roles
        const insertRoles = `
            CALL add_user_role('regular');
            CALL add_user_role('admin');
            CALL add_user_role('employee');
        `;
        con.query(insertRoles, (err, results) => {
            if (err) {
                console.error('Error inserting default roles:', err);
            } else {
                console.log('Default roles inserted successfully:', results);
            }
        });

        // Insert an admin user
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
        const insertAdmin = `
            CALL register_user('admin', '${adminPassword}', 'Admin', 'User', 'admin@example.com', @result);
            CALL change_user_type('admin', 'admin');
        `;
        con.query(insertAdmin, (err, results) => {
            if (err) {
                console.error('Error inserting admin user:', err);
            } else {
                console.log('Admin user inserted successfully:', results);
            }

            // Check the result of the stored procedure
            con.query('SELECT @result AS result', (err, resultCheck) => {
                if (err) {
                    console.error('Error checking result for admin user insertion:', err);
                } else {
                    console.log('Admin user insertion result:', resultCheck[0]?.result);
                }
            });
        });
    });
}


module.exports = {
    initializeDatabase,
    con,
    getUserAccountBalances,
    promoteUserToAdmin
};
