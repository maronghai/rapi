require('dotenv').config()
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

var connection = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PIN,
  database: process.env.DB_SCHEME,
});

const host = process.env.HOST
const port = process.env.PORT

// ---
const app = express()
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---
const OP_CONFIG = {
  'eq': '=',
  'gt': '>',
  'ge': '>=',
  'lt': '<',
  'le': '<=',
}

// ---
const result = (res, err, data) => {
  if (err) {
    res.status(500).send({ message: err.message || "系统异常" });
  } else {
    res.send(data);
  }
}

app.use('/api/tables/:table', (req, res) => {
  let sql = "SELECT"

  // columns
  const columns = (req.query.columns || req.body.columns || '*').split(',').join(', ')
  if (columns) {
    sql += ` ${columns}`
  }

  // table
  const table = req.params.table
  if (table) {
    sql += ` FROM ${table}`
  } else {
    result(res, { message: "table_not_found" }, null);
    return
  }

  // filter
  const filter = req.query.filter || req.body.filter
  if (filter) {
    console.log(Object.entries(filter))
    const conditionSql = Object.entries(filter)
      .map(([field, condition]) => {
        const conditionKey = Object.keys(condition)
        const op = OP_CONFIG[conditionKey] || conditionKey || ''
        const value = condition[conditionKey]
        return field + ' ' + op + ' ' + value
      })
      .join(' AND ')
    sql += ` WHERE ${conditionSql}`
  }

  // sort
  const sort = req.query.sort || req.body.sort
  if (sort) {
    const sortList = sort.split(',').map(item => {
      const col = item.trim()
      return col[0] == '-' ? col.substring(1) + ' DESC' : col
    }).join(', ')
    sql += ` ORDER BY ${sortList}`
  }

  // limit
  const pno = req.query.pno || req.body.pno
  if (pno) {
    const psize = req.query.psize || req.body.psize || 10
    sql += ` LIMIT ${(pno - 1) * psize}, ${psize}`
  } else {
    const limit = req.query.limit || req.body.limit || 2000
    sql += ` LIMIT ${limit}`
  }

  // end of sql
  console.log('SQL: ', sql)

  // query
  connection.query(sql, (err, results, fields) => {
    console.log('QUERY: ', err, results, fields)
    if (err) {
      result(res, err, null);
      return;
    }

    if (results.length) {
      result(res, null, results);
      return;
    }

    result(res, { message: "not_found" }, null);
  })
})

// ---

app.listen(port, () => {
  console.log(`Server is runniing. ${host}:${port}`)
})
