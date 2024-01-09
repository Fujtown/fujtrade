const mysql = require('mysql');

// Create a connection to the database
const connection = mysql.createConnection({
    host:'brpbpnxr52faoe9hyl76-mysql.services.clever-cloud.com',
    user: 'upkdyiwemeyjbnck',
    password: 'a0AVz4NPzU2BWAZ6XhGA',
    database: 'brpbpnxr52faoe9hyl76'
    
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_NAME
});

// Connect to the database
connection.on('error', function(err) {
  console.log('db error', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
    // Connection to the MySQL server is usually lost due to either server restart or a
    // connnection idle timeout (the wait_timeout server variable configures this)
    handleDisconnect();                        
  } else {                                     
    throw err;                                 
  }
});
module.exports = connection;
//$con->close();
