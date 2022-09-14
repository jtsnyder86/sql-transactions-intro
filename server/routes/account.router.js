const express = require('express');
const router = express.Router();

const pool = require('../modules/pool');

router.get('/', (req, res) => {

  const sqlText = `
  SELECT "account".name, SUM("register".amount)
  FROM "account"
  JOIN "register" ON "account".id = "register".acct_id
  GROUP BY "account".name;`;

  pool.query(sqlText)
    .then(result => {
      console.log('Account balances:', result.rows);
      res.send(result.rows)
    })
    .catch(err => {
      console.log('Account balance get error:', err);
      res.sendStatus(500)
    })
  // res.send('Hello?');
})

router.post('/transfer', async (req, res) => {
  const toId = req.body.toId;
  const fromId = req.body.fromId;
  const amount = req.body.amount;

  console.log(`Transferring ${amount} from acct ${fromId} to acct ${toId}`);

  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');
    const sqlText = `
    INSERT INTO "register" ("acct_id", "amount")
    VALUES ($1, $2);
    `;
    //withdraw
    await connection.query(sqlText, [fromId, -amount]);
    //deposit
    await connection.query(sqlText, [toId, amount]);
    //commit
    await connection.query('COMMIT');
    res.sendStatus(200)
  } catch (error) {
    await connection.query('ROLLBACK');
    console.log('Error saving transaction:', error);
    res.sendStatus(500)
  } finally {
    connection.release()
  }
})

router.post('/new', async (req, res) => {
  const name = req.body.name;
  const amount = req.body.amount;
  console.log(`Creating new account ${name} with initial balance ${amount}`);

  const connection = await pool.connect();

  try{
    await connection.query('BEGIN');
    const sqlAddAccount = `
    INSERT INTO "account" ("name")
    VALUES ($1)
    RETURNING "id";`;
    //save query result to variable
    const result = await connection.query(sqlAddAccount, [name]);
    const accountId = result.rows[0].id;
    const sqlInitialDeposit = `
    INSERT INTO "register" ("acct_id", "amount")
    VALUES ($1, $2);`;
    await connection.query(sqlInitialDeposit, [accountId, amount]);
    await connection.query('COMMIT');
    res.sendStatus(200)
  } catch(error) {
    await connection.query('ROLLBACK');
    console.log('Error is:', error);
    res.sendStatus(500);
    
  } finally {
    connection.release()
  }

})

module.exports = router;
