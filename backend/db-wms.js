const sql = require('mssql');

// Second database connection — WMS at 10.0.10.203
// Used exclusively by grnPushing routes for Tran_TransHeader / Tran_TransDetails
// and the @ASRS_Transaction stored procedures that run inside a transaction.
const wmsConfig = {
    user:     process.env.WMS2_DB_USER     || 'sa',
    password: process.env.WMS2_DB_PASSWORD || 'iTTsA@536',
    server:   process.env.WMS2_DB_SERVER   || '10.0.10.203',
    database: process.env.WMS2_DB_DATABASE || 'WMS',
    port:     parseInt(process.env.WMS2_DB_PORT, 10) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 40000
    },
    pool: {
        max:                      40,
        min:                       0,
        acquireTimeoutMillis:  40000,
        idleTimeoutMillis:     10000
    }
};

let pool2;

async function getWmsPool() {
    if (!pool2) {
        pool2 = new sql.ConnectionPool(wmsConfig);
        await pool2.connect();
        console.log('WMS2 database connection established (10.0.10.203/WMS).');
    }
    return pool2;
}

module.exports = { getWmsPool, sql };
