import { Router } from 'express'
import mysql from 'mysql2/promise'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function optionalSingle(query, fallback = {}) {
  try {
    const { rows } = await pool.query(query)
    return rows[0] ?? fallback
  } catch (err) {
    if (err.code === '42P01') return fallback
    throw err
  }
}

function createDMAConnection({ host, port, database, user, password }) {
  return mysql.createConnection({
    host,
    port: Number(port) || 3306,
    database,
    user,
    password,
    connectTimeout: 8000,
  })
}

// GET /api/integrations/dma/connection
router.get('/dma/connection', requireAuth, async (_req, res) => {
  try {
    const r = await optionalSingle('SELECT * FROM settings_dma_connection WHERE id = 1')
    res.json({
      host: r.host || '',
      port: r.port || 3306,
      database: r.db_name || '',
      user: r.db_user || '',
      table: r.tbl_name || 'clients',
      hasPassword: Boolean(r.db_pass),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/integrations/dma/connection
router.put('/dma/connection', requireAuth, async (req, res) => {
  const { host, port, database, user, password, table } = req.body
  try {
    const current = await optionalSingle('SELECT db_pass FROM settings_dma_connection WHERE id = 1')
    const nextPassword = password ? password : (current.db_pass || '')
    await pool.query(
      `INSERT INTO settings_dma_connection (id, host, port, db_name, db_user, db_pass, tbl_name)
       VALUES (1, $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET host=$1, port=$2, db_name=$3, db_user=$4, db_pass=$5, tbl_name=$6`,
      [host || '', Number(port) || 3306, database || '', user || '', nextPassword, table || 'clients']
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/integrations/dma/test
router.post('/dma/test', requireAuth, async (req, res) => {
  const { host, port, database, user } = req.body
  if (!host || !database || !user) {
    return res.status(400).json({ error: 'host, database, and user are required' })
  }

  let conn
  try {
    const current = await optionalSingle('SELECT db_pass FROM settings_dma_connection WHERE id = 1')
    const password = req.body.password || current.db_pass || ''
    conn = await createDMAConnection({ host, port, database, user, password })
    await conn.query('SELECT 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(502).json({ error: `Cannot connect to DMA database: ${err.message}` })
  } finally {
    if (conn) await conn.end().catch(() => {})
  }
})

// GET /api/integrations/dma/mapping
router.get('/dma/mapping', requireAuth, async (_req, res) => {
  try {
    const row = await optionalSingle('SELECT * FROM settings_dma_mapping WHERE id = 1')
    res.json({
      ref:       row.ref_col        ?? 'username',
      firstName: row.first_name_col ?? 'name',
      lastName:  row.last_name_col  ?? 'surname',
      phone:     row.phone_col      ?? 'phone',
      mobile:    row.mobile_col     ?? 'mobile',
      zone:      row.zone_col       ?? 'location',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/integrations/dma/mapping
router.put('/dma/mapping', requireAuth, async (req, res) => {
  const ref       = String(req.body.ref       ?? '').trim()
  const firstName = String(req.body.firstName ?? '').trim()
  const lastName  = String(req.body.lastName  ?? '').trim()
  const phone     = String(req.body.phone     ?? '').trim()
  const mobile    = String(req.body.mobile    ?? '').trim()
  const zone      = String(req.body.zone      ?? '').trim()
  if (!ref || !firstName || !lastName || !phone || !mobile || !zone) {
    return res.status(400).json({ error: 'All mapping fields are required' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings_dma_mapping (id, ref_col, first_name_col, last_name_col, phone_col, mobile_col, zone_col)
       VALUES (1, $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET ref_col=$1, first_name_col=$2, last_name_col=$3, phone_col=$4, mobile_col=$5, zone_col=$6
       RETURNING *`,
      [ref, firstName, lastName, phone, mobile, zone]
    )
    const row = rows[0]
    res.json({
      ref:       row.ref_col,
      firstName: row.first_name_col,
      lastName:  row.last_name_col,
      phone:     row.phone_col,
      mobile:    row.mobile_col,
      zone:      row.zone_col,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
