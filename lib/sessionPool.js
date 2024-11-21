var mysql2 = require('mysql2/promise');

// Bug tweak
// Get a plain MySQL connection and create a session table (the express-mysql-session module is bugged and doesn't do it)
var dbCon = require('./database');

let sql = "CREATE DATABASE IF NOT EXISTS NodeExpressSessionStorage";
console.log("sessionPool.js: sql message will be " + sql);
dbCon.con.query(sql, function (err) {
    if (err) {
        console.log("sessionPool.js: Problem: Is the MySQL server running?");
        console.log(err.message);
        throw err;
    } else {
        console.log("sessionPool.js: Created session database if it didn't already exist");
    }
});

// Now that the session database and table exists, create a MySQL pool so it can be hooked up to express-session storage
var dbConnectionInfo = require('./connectionInfo');

var options = {
    host: dbConnectionInfo.host,
    port: dbConnectionInfo.port,
    user: dbConnectionInfo.user,
    password: dbConnectionInfo.password,
    database: 'NodeExpressSessionStorage',
    // createDatabaseTable: true
};

var pool = mysql2.createPool(options);

module.exports = pool;
