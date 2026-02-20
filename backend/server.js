require('dotenv').config();
const express = require('express');
const cors = require('cors');
const materialEntriesRouter = require('./api/material-entries');
const authRouter = require('./api/auth');
const partyBin = require('./api/partyBinMaster')
const db = require('./db');

const app = express();
const port = process.env.API_PORT || 3001;

app.use(cors({ origin: '*' }))
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/material-transactions', materialEntriesRouter);
app.use('/api/partyBin', partyBin);

// Start the server and then attempt to connect to the database.
// This makes the server more resilient to database connection issues on startup.
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    
    // Connect to the database
    db.connect().then(() => {
        console.log('Database connection established successfully.');
    }).catch(err => {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.log('!!! CRITICAL: FAILED TO CONNECT TO DATABASE !!!');
        console.log('!!! API endpoints will not work until the   !!!');
        console.log('!!! connection is restored. Check .env      !!!');
        console.log(`!!! Error: ${err.message}`);
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    });
});
