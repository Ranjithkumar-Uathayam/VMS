const express = require('express');
const { pool, sql } = require('../db');

const router = express.Router();

router.get('/BinList', async (req, res) => {
  try {
    const result = await pool.request().query(`
        select 
            [Id]
            ,[BinID]
            ,[PartyName]
            ,[PartyCode]
            ,[CreatedDate]
            ,[PartyBinDispatchDate]
            ,[UpdatedDate]
            ,[Status]
        FROM PartyBinMaster
    `);
    res.status(200).json({ status: true, data: result.recordset });

  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
});

router.get('/PartyList', async (req, res) => {
  try {
    const result = await pool.request().query(`
        SELECT CardCode, CardFName, CardName 
        FROM OCRD 
        WHERE validFor = 'Y' and CardType = 'S'
    `);
    res.status(200).json({ status: true, data: result.recordset });

  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
});

router.post('/create', async (req, res) => {
    const { fromBin, toBin } = req.body;

    try {
        let inserted = 0;
        let skipped = 0;

        for (let i = fromBin; i <= toBin; i++) {
            const binId = i.toString();

            const result = await pool.request()
                .input('BinID', binId)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM PartyBinMaster WHERE BinID = @BinID
                    )
                    BEGIN
                        INSERT INTO PartyBinMaster (BinID)
                        VALUES (@BinID)
                        SELECT 'INSERTED' AS Result
                    END
                    ELSE
                    BEGIN
                        SELECT 'EXISTS' AS Result
                    END
                `);

            if (result.recordset[0].Result === 'INSERTED') {
                inserted++;
            } else {
                skipped++;
            }
        }

        res.status(200).json({
            message: 'Process completed',
            inserted,
            skipped
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/dispatch', async (req, res) => {
    const {
        PartyName,
        PartyCode,
        scannedBins
    } = req.body;

    try 
    {
        for (let binId of scannedBins) {
            await pool.request()
                .input('BinID', binId)
                .input('PartyName', PartyName)
                .input('PartyCode', PartyCode)
                .query(`
                    UPDATE PartyBinMaster
                    SET
                        PartyName = @PartyName,
                        PartyCode = @PartyCode,
                        PartyBinDispatchDate = GETDATE(),
                        UpdatedDate = GETDATE(),
                        Status = 'Dispatched'
                    WHERE BinID = @BinID and Status = 'AVAILABLE'
                `);
        }
        res.status(200).json({
            status: true,
            message: 'Bins dispatched successfully',
        })
    } catch (err) {
        res.status(500).json({status: false, message: err.message});
    }
});

module.exports = router;
