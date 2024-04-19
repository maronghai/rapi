require('dotenv').config()
const express = require("express");
const cors = require("cors");
const mysql = require('mysql2/promise');

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

// ---------         ---------


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

const result = (res, raw, data) => {
  if (raw.message) {
    res.status(500).send({ message: raw.message || "系统异常" });
  } else {
    res.send({ data });
  }
}

// ---------

// replace
const UID_TABLE = {
  t_user: 'id',
  t_child: 'user_id',
  t_device: 'user_id',
  t_hrv_event: 'user_id',
  t_hrv_event_reolve: 'user_id',
  t_notice: 'user_id',
  t_qa: 'user_id',
  t_report_per_day: 'user_id',
}
app.post('/api/r/:table', async (req, res) => {
  const table = 't_' + req.params.table
  const id = req.body.id
  console.log("body:", req.body)
  let sql = ''
  if (id) { // update
    // version
    const version = req.body.version || 0
    let condition = `id = ${id} AND version = ${version}`

    // uid
    const uidField = UID_TABLE[table]
    if (uidField) {
      const uid = req.get('uid') || 0
      condition += ` AND ${uidField} = ${uid}`
    }

    // columns
    const columns = Object.entries(req.body)
      .filter(([key]) => key != 'id')
      .map(([key, value]) => `${key} = ${value}`)
      .join(', ')
    sql = `UPDATE ${table} SET ${columns}, version = version + 1 WHERE ${condition}`
  } else { // insert
    const columns = Object.keys(req.body)
    const values = Object.values(req.body)
    sql = `INSERT INTO ${table} (${columns}) VALUES (${values})`
  }
  console.log(sql)

  const data = await pool.execute(sql).catch(e => e)

  result(res, data, { ok: data[0].affectedRows })
})

// query
app.post('/api/q/:table', async (req, res) => {
  // console.log(req)
  let sql = "SELECT"

  // columns
  const columns = (req.query.columns || req.body.columns || '*').split(',').join(', ')
  if (columns) {
    sql += ` ${columns}`
  }

  // table
  const table = req.params.table
  if (table) {
    sql += ` FROM t_${table}`
  } else {
    result(res, { message: "table_not_found" }, null);
    return
  }

  // WHERE
  let conditionList = []

  // filter
  const filter = req.query.filter || req.body.filter
  if (filter) {
    conditionList = Object.entries(filter)
      .map(([field, condition]) => {
        const conditionKey = Object.keys(condition)?.[0]
        const op = __op(conditionKey)
        const value = __value(conditionKey, condition[conditionKey])
        return field + ' ' + op + ' ' + value
      })
  }

  // f_
  conditionList = [
    ...conditionList,
    ...Object.entries(req.query)
      .filter(([key]) => key.startsWith('f_'))
      .map(([key, value]) => key.substring(2) + ' = ' + value),
    ...Object.entries(req.body.f_)
      .map(([key, value]) => key + ' = ' + value),
  ]

  if (conditionList.length > 0) {
    sql += ` WHERE ${conditionList.join(' AND ')}`
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
    const limit = req.query.limit || req.body.limit || 0
    sql += ` LIMIT ${limit}`
  }

  // end of sql
  console.log('SQL: ', sql)

  // auth
  if (conditionList.length == 0 && req.get('auth') != 'JJB$2024#0402@0408!') {
    result(res, { message: '高山流水' })
    return
  }

  // query
  const data = await pool.query(sql).catch(e => e)

  // [object]
  if (req.query.o || req.body.o) {
    result(res, data, data[0]?.[0] || {})
    return
  }

  // [list]
  result(res, data, data[0])
})

// ---

app.post('/api/biz/login', (req, res) => {
  mysql.query('select * from t_user where mobile = ? and pin = ?')
})


// ---
const host = process.env.HOST
const port = process.env.PORT
app.listen(port, () => {
  console.log(`Server is runniing. ${host}:${port}`)
})
