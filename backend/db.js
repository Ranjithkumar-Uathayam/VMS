const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    // For local development, encryption is typically not used.
    // Set DB_ENCRYPT=true in .env for Azure SQL or other environments requiring encryption.
    encrypt: process.env.DB_ENCRYPT === 'true',
    
    // This is often required for local SQL Server instances that use a self-signed certificate.
    // By default, we'll trust it to simplify local development setup.
    // For production, you should use a proper certificate and set this to false.
    trustServerCertificate: true
  },
};

let pool;
const connectionErrorMessage = 'Database configuration is incomplete. Ensure DB_USER, DB_SERVER, and DB_DATABASE are set in the backend/.env file.';

// A dummy pool that will be used if the configuration is invalid.
// Its methods are designed to throw an error that can be caught by route handlers.
const dummyPool = {
    connect: () => Promise.reject(new Error(connectionErrorMessage)),
    request: () => { throw new Error(connectionErrorMessage); },
    // Add a close method for completeness, though it won't be used in this state.
    close: () => Promise.resolve(),
};


// Validate essential configuration. If missing, the server will still start,
// but all database operations will fail gracefully with a clear error.
if (!config.user || !config.server || !config.database) {
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log('!!! CRITICAL: DATABASE CONFIGURATION IS MISSING  !!!');
    console.log(`!!! ${connectionErrorMessage}`);
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    pool = dummyPool;
} else {
    pool = new sql.ConnectionPool(config);
}


module.exports = {
  connect: () => pool.connect(),
  pool,
  sql,
};