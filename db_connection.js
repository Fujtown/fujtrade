const mysql = require('mysql');

// Create a connection to the database
const connection = mysql.createConnection({
    host:'192.185.73.114',
    user: 'fujtek_fujtrade',
    password: 'pepW2*aB53V%',
    database: 'fujtek_fujtrade'
    
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_NAME
});

// Connect to the database
connection.connect(err => {
  if (err) {
    console.error('An error occurred while connecting to the DB');
    throw err;
  }

  console.log('Connected to the database.');
});
module.exports = connection;
//$con->close();
