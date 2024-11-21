const mysql = require('mysql2');
const dbConfig = require('./connectionInfo');

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
            username VARCHAR(255) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            salt VARCHAR(255) NOT NULL,
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
            IN username VARCHAR(255),
            IN hashed_password VARCHAR(255),
            IN salt VARCHAR(255),
            IN first_name VARCHAR(255),
            IN last_name VARCHAR(255),
            IN email VARCHAR(255),
            OUT result INT
        )
        BEGIN
            DECLARE userCount INT DEFAULT 0;
            SET result = 0;
            SELECT COUNT(*) INTO userCount FROM users WHERE username = username;
            IF userCount = 0 THEN
                INSERT INTO users (username, hashed_password, salt, first_name, last_name, email, user_role_id)
                VALUES (
                    username, hashed_password, salt, first_name, last_name, email, 
                    (SELECT id FROM user_roles WHERE type = 'regular')
                );
            ELSE
                SET result = 1;
            END IF;
        END;
    `;

    const changeUserType = `
        CREATE PROCEDURE IF NOT EXISTS change_user_type(
            IN username VARCHAR(255),
            IN new_role VARCHAR(50)
        )
        BEGIN
            UPDATE users
            SET user_role_id = (SELECT id FROM user_roles WHERE type = new_role LIMIT 1)
            WHERE username = username;
        END;
    `;

    const transferFunds = `
        CREATE PROCEDURE IF NOT EXISTS transfer_funds(
            IN from_account INT,
            IN to_account INT,
            IN amount DECIMAL(15, 2),
            IN memo VARCHAR(255),
            OUT result INT
        )
        BEGIN
            DECLARE from_balance DECIMAL(15, 2);
            DECLARE to_balance DECIMAL(15, 2);
            SET result = 0;

            SELECT balance INTO from_balance FROM bank_accounts WHERE account_id = from_account;
            SELECT balance INTO to_balance FROM bank_accounts WHERE account_id = to_account;

            IF from_balance >= amount THEN
                UPDATE bank_accounts SET balance = balance - amount WHERE account_id = from_account;
                UPDATE bank_accounts SET balance = balance + amount WHERE account_id = to_account;
                INSERT INTO transactions (from_account, to_account, amount, memo) 
                VALUES (from_account, to_account, amount, memo);
            ELSE
                SET result = 1; -- Insufficient funds
            END IF;
        END;
    `;

    con.query(registerUser, handleProcedureCreation('register_user'));
    con.query(changeUserType, handleProcedureCreation('change_user_type'));
    con.query(transferFunds, handleProcedureCreation('transfer_funds'));
}

function handleProcedureCreation(procedureName) {
    return (err) => {
        if (err) throw err;
        console.log(`Stored procedure "${procedureName}" created or exists.`);
    };
}

function AddDummyDataToDatabase() {
    const insertRoles = `
        INSERT IGNORE INTO user_roles (type) VALUES ('regular'), ('admin');
    `;
    con.query(insertRoles, handleDummyData('Roles'));

    const insertAdmin = `
        CALL register_user(
            'admin', 
            'hashed_password',
            'salt', 
            'Admin', 
            'User', 
            'admin@example.com', 
            @result
        );
        CALL change_user_type('admin', 'admin');
    `;
    con.query(insertAdmin, handleDummyData('Admin user'));
}

function handleDummyData(dataType) {
    return (err) => {
        if (err) throw err;
        console.log(`${dataType} dummy data inserted.`);
    };
}

module.exports = {
    initializeDatabase
};