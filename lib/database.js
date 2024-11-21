const mysql = require('mysql2');
const dbConfig = require('./connectionInfo');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const con = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
    multipleStatements: true
});

function initializeDatabase() {
    con.connect((err) => {
        if (err) throw err;
        console.log('Connected to MySQL');
        setupDatabase();
    });
}

function setupDatabase() {
    con.query("CREATE DATABASE IF NOT EXISTS banking_system", (err) => {
        if (err) throw err;
        console.log('Database created or exists.');
        con.query("USE banking_system", (err) => {
            if (err) throw err;
            console.log('Using banking_system database.');
            createTables();
            createStoredProcedures();
            AddDummyDataToDatabase();
        });
    });
}

function createTables() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            hashed_password VARCHAR(255) NOT NULL,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            user_role_id INT NOT NULL,
            FOREIGN KEY (user_role_id) REFERENCES user_roles(id)
        );
    `;

    const createUserRolesTable = `
        CREATE TABLE IF NOT EXISTS user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL UNIQUE
        );
    `;

    const createBankAccountsTable = `
        CREATE TABLE IF NOT EXISTS bank_accounts (
            account_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance DECIMAL(15, 2) DEFAULT 0.00,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );
    `;

    const createTransactionsTable = `
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id INT AUTO_INCREMENT PRIMARY KEY,
            from_account INT,
            to_account INT,
            amount DECIMAL(15, 2) NOT NULL,
            memo VARCHAR(255),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_account) REFERENCES bank_accounts(account_id),
            FOREIGN KEY (to_account) REFERENCES bank_accounts(account_id)
        );
    `;

    con.query(createUserRolesTable, handleTableCreation('user_roles'));
    con.query(createUsersTable, handleTableCreation('users'));
    con.query(createBankAccountsTable, handleTableCreation('bank_accounts'));
    con.query(createTransactionsTable, handleTableCreation('transactions'));
}

function handleTableCreation(tableName) {
    return (err) => {
        if (err) throw err;
        console.log(`Table "${tableName}" created or already exists.`);
    };
}

function createStoredProcedures() {
    const registerUser = `
        CREATE PROCEDURE IF NOT EXISTS register_user(
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

            -- Check if username already exists
            SELECT COUNT(*) INTO userCount FROM users WHERE username = in_username;
            IF userCount = 0 THEN
                -- Insert the new user with default 'regular' role
                INSERT INTO users (username, hashed_password, first_name, last_name, email, user_role_id)
                VALUES (in_username, in_password, in_first_name, in_last_name, in_email, 
                (SELECT id FROM user_roles WHERE type = 'regular' LIMIT 1));
            ELSE
                -- Indicate failure due to duplicate username
                SET out_result = 1;
            END IF;
        END;
    `;

    const validateLogin = `
        CREATE PROCEDURE IF NOT EXISTS validate_login(
            IN in_username VARCHAR(255)
        )
        BEGIN
            SELECT 
                u.user_id,
                u.username,
                u.hashed_password, -- Note: Keeping the column name as 'hashed_password' to avoid additional changes
                r.type AS role
            FROM users u
            JOIN user_roles r ON u.user_role_id = r.id
            WHERE u.username = in_username
            LIMIT 1;
        END;
    `;

    const changeUserType = `
        CREATE PROCEDURE IF NOT EXISTS change_user_type(
            IN in_username VARCHAR(255),
            IN in_new_role VARCHAR(50)
        )
        BEGIN
            -- Update the user's role based on the provided username and role type
            UPDATE users
            SET user_role_id = (SELECT id FROM user_roles WHERE type = in_new_role LIMIT 1)
            WHERE username = in_username;
        END;
    `;

    const transferFunds = `
        CREATE PROCEDURE IF NOT EXISTS transfer_funds(
            IN in_from_account INT,
            IN in_to_account INT,
            IN in_amount DECIMAL(15, 2),
            IN in_memo VARCHAR(255),
            OUT out_result INT
        )
        BEGIN
            DECLARE from_balance DECIMAL(15, 2);
            DECLARE to_balance DECIMAL(15, 2);
            SET out_result = 0;

            -- Fetch balances
            SELECT balance INTO from_balance FROM bank_accounts WHERE account_id = in_from_account;
            SELECT balance INTO to_balance FROM bank_accounts WHERE account_id = in_to_account;

            -- Ensure sufficient funds and perform the transfer
            IF from_balance >= in_amount THEN
                UPDATE bank_accounts SET balance = balance - in_amount WHERE account_id = in_from_account;
                UPDATE bank_accounts SET balance = balance + in_amount WHERE account_id = in_to_account;
                INSERT INTO transactions (from_account, to_account, amount, memo) 
                VALUES (in_from_account, in_to_account, in_amount, in_memo);
            ELSE
                -- Indicate insufficient funds
                SET out_result = 1;
            END IF;
        END;
    `;

    const fetchUserById = `
    CREATE PROCEDURE IF NOT EXISTS fetch_user_by_id(
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
`;

    const fetchTransactions = `
    CREATE PROCEDURE IF NOT EXISTS fetch_transactions(
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
`;

    // Execute each query to create procedures
    con.query(registerUser, handleProcedureCreation('register_user'));
    con.query(validateLogin, handleProcedureCreation('validate_login'));
    con.query(changeUserType, handleProcedureCreation('change_user_type'));
    con.query(transferFunds, handleProcedureCreation('transfer_funds'));
    con.query(fetchUserById, handleProcedureCreation('fetch_user_by_id'));
    con.query(fetchTransactions, handleProcedureCreation('fetch_transactions'));
}

function handleProcedureCreation(procedureName) {
    return (err) => {
        if (err) throw err;
        console.log(`Stored procedure "${procedureName}" created or exists.`);
    };
}

async function AddDummyDataToDatabase() {
    try {
        // Insert the user roles into the `user_roles` table
        const insertRoles = `
            INSERT IGNORE INTO user_roles (type) 
            VALUES 
                ('regular'), 
                ('admin'), 
                ('employee');
        `;

        con.query(insertRoles, handleDummyData('User roles'));

        const insertUsers = `
            CALL register_user('admin1', 'password', 'Admin', 'User', 'admin@example.com', @result);
            CALL change_user_type('admin1', 'admin');
            CALL register_user('employee1', 'password', 'Employee', 'User', 'employee@example.com', @result);
            CALL change_user_type('employee1', 'employee');
            CALL register_user('customer1', 'password', 'Customer', 'User', 'customer@example.com', @result);
        `;

        con.query(insertUsers, handleDummyData('Dummy users with roles'));
    } catch (error) {
        console.error('Error adding dummy data:', error);
    }
}


function handleDummyData(dataType) {
    return (err) => {
        if (err) throw err;
        console.log(`${dataType} dummy data inserted.`);
    };
}

module.exports = {
    initializeDatabase,
    con // store user data after successful login.
};
