require('dotenv').config()
const express = require("express");
const cors = require("cors");
const mysql = require('mysql2');

const dbconf = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PIN,
  database: process.env.DB_SCHEME,
  dateStrings: true,
  // queueLimit: 1000,
}
console.log("DB:", dbconf)

const pool = mysql.createPool(dbconf);

const host = process.env.HOST
const port = process.env.PORT

// ---
const app = express()
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---
const OP_CONFIG = {
  eq: '=',
  gt: '>',
  ge: '>=',
  lt: '<',
  le: '<=',

  in: 0,
  like: 0,
}
const OP_UKEYS = Object.keys(OP_CONFIG).map(key => key.toUpperCase())

const __op = key => {
  const lowkey = key?.toLowerCase() || ''
  return OP_CONFIG[lowkey] || lowkey
}


const __value = (key, value) => {
  console.log('__value', key, value)

  if ('IN' == key) {
    return `(${value.split(',').map(item => `'${item}'`).join(',')})`
  } else if (OP_UKEYS.includes(key)) {
    return `'${value}'`
  } else if ('in' == key) {
    return `(${value})`
  }

  return value
}

// ---------

const result = (res, err, data) => {
  if (err) {
    res.status(500).send({ message: err.message || "系统异常" });
  } else {
    res.send(data);
  }
}

const afterQuery = (res, err, data, other = []) => err ? result(res, err, null) : result(res, null, data || other);

// ---------

app.get('/api/tables/:table/:id', (req, res) => {
  const table = req.params.table
  const id = req.params.id
  const sql = `SELECT * FROM ${table} WHERE id = ${id}`

  pool.query(sql, (err, results, fields) => afterQuery(res, err, results[0] || {
    fields: fields.map(({ name, type, typeName }) => ({ name, type, typeName }))
  }))
})

app.post('/api/tables/:table/:id', (req, res) => {
  const table = req.params.table
  const id = req.params.id
  let sql = 'UPDATE SET '

  result(res, null, { table, id })
})

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
        const conditionKey = Object.keys(condition)?.[0]
        const op = __op(conditionKey)
        const value = __value(conditionKey, condition[conditionKey])
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
  pool.query({ sql, rowsAsArray: true }, (err, results, fields) => afterQuery(res, err, results))
})



// ---

app.listen(port, () => {
  console.log(`Server is runniing. ${host}:${port}`)
})
