import { Router } from 'express'
import mysql from 'mysql2/promise'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const DEFAULT_DMA_MAPPING = {
  ref_col: 'username',
  first_name_col: 'name',
  last_name_col: 'surname',
  phone_col: 'phone',
  mobile_col: 'mobile',
  zone_col: 'location',
}

async function optionalRows(query, fallback = []) {
  try {
    const { rows } = await pool.query(query)
    return rows
  } catch (err) {
    if (err.code === '42P01') return fallback
    throw err
  }
}

function escapeIdentifier(value, fallback) {
  const clean = String(value || fallback).replace(/`/g, '``')
  return `\`${clean}\``
}

function mapStatus(raw) {
  if (!raw) return 'active'
  const s = String(raw).toLowerCase()
  if (s === 'suspended') return 'suspended'
  if (s === 'inactive' || s === 'disabled' || s === 'cancelled' || s === '0') return 'inactive'
  return 'active'
}

function formatDMAClient(c, m, countMap = {}) {
  const ref       = String(c[m.ref_col]        ?? '').trim()
  const firstName = String(c[m.first_name_col] ?? '').trim()
  const lastName  = String(c[m.last_name_col]  ?? '').trim()
  const name      = [firstName, lastName].filter(Boolean).join(' ')
  const phone     = String(c[m.phone_col]      ?? '').trim()
  const mobile    = String(c[m.mobile_col]     ?? '').trim()
  const zone      = String(c[m.zone_col]       ?? '').trim()
  if (!ref || !name) return null

  const status     = mapStatus(c.status ?? c.active ?? c.enabled)
  const tickets    = countMap[name] || 0

  return { ref, name, phone: phone || mobile, mobile, email: '', zone, status, tickets, source: 'dma' }
}

function formatLocalClient(c, countMap = {}) {
  return {
    id: String(c.id),
    ref: c.ref,
    name: c.name,
    plan: c.plan,
    zone: c.zone,
    phone: c.phone,
    email: c.email,
    status: c.status,
    tickets: countMap[c.name] || 0,
    source: 'local',
  }
}

function dedupeClients(clients) {
  const seen = new Set()
  const out = []
  for (const client of clients.filter(Boolean)) {
    const key = `${client.ref || ''}|${client.name || ''}|${client.phone || ''}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(client)
  }
  return out
}

async function getClientContext() {
  const [connRows, mapRows, countRes] = await Promise.all([
    optionalRows('SELECT * FROM settings_dma_connection WHERE id = 1'),
    optionalRows('SELECT * FROM settings_dma_mapping WHERE id = 1'),
    pool.query('SELECT client, COUNT(*) AS count FROM tickets GROUP BY client'),
  ])

  return {
    cfg: connRows[0] ?? {},
    mapping: { ...DEFAULT_DMA_MAPPING, ...(mapRows[0] ?? {}) },
    countMap: Object.fromEntries(countRes.rows.map(r => [r.client, parseInt(r.count)])),
  }
}

function searchableDMAColumns(m) {
  return [
    m.ref_col,
    m.first_name_col,
    m.last_name_col,
    m.phone_col,
    m.mobile_col,
    m.email_col,
    m.zone_col,
  ].filter(Boolean)
}

async function getTableColumns(conn, table) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM ${table}`)
  return new Set(rows.map(row => row.Field))
}

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { countMap } = await getClientContext()

    const { rows: clients } = await pool.query(`
      SELECT DISTINCT c.*
      FROM clients c
      INNER JOIN tickets t ON LOWER(t.client) = LOWER(c.name)
      ORDER BY c.name
    `)
    res.json(clients.map(c => ({
      id: String(c.id), ref: c.ref, name: c.name,
      plan: c.plan, zone: c.zone, phone: c.phone, email: c.email,
      status: c.status, tickets: countMap[c.name] || 0,
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/search', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  const limit = Math.min(Number(req.query.limit) || 20, 50)

  try {
    const { cfg, mapping: m, countMap } = await getClientContext()
    const results = []

    if (cfg.host && cfg.db_name && cfg.db_user) {
      let dmaConn
      try {
        dmaConn = await mysql.createConnection({
          host: cfg.host, port: cfg.port || 3306,
          database: cfg.db_name, user: cfg.db_user, password: cfg.db_pass,
          connectTimeout: 5000,
        })

        const table = escapeIdentifier(cfg.tbl_name, 'clients')
        const tableColumns = await getTableColumns(dmaConn, table)
        const uniqueSearchableCols = [...new Set(searchableDMAColumns(m))]
          .filter(col => tableColumns.has(col))
        const whereClauses = uniqueSearchableCols.map(col => `${escapeIdentifier(col)} LIKE ?`)
        const params = q ? uniqueSearchableCols.map(() => `%${q}%`) : []

        if (q && tableColumns.has(m.first_name_col) && tableColumns.has(m.last_name_col)) {
          whereClauses.push(`CONCAT_WS(' ', ${escapeIdentifier(m.first_name_col)}, ${escapeIdentifier(m.last_name_col)}) LIKE ?`)
          params.push(`%${q}%`)
        }

        const where = q && whereClauses.length
          ? `WHERE ${whereClauses.join(' OR ')}`
          : ''
        let rows = []
        try {
          ;([rows] = await dmaConn.query(
            `SELECT * FROM ${table} ${where} LIMIT ${Number(limit)}`,
            params
          ))
        } catch (queryErr) {
          console.error('DMA mapped search failed, trying broad table search:', queryErr.message)
          const [broadRows] = await dmaConn.query(`SELECT * FROM ${table} LIMIT ${Number(limit) * 5}`)
          const needle = q.toLowerCase()
          rows = q
            ? broadRows.filter(row =>
                uniqueSearchableCols.some(col => String(row[col] ?? '').toLowerCase().includes(needle)) ||
                [row[m.first_name_col], row[m.last_name_col]].filter(Boolean).join(' ').toLowerCase().includes(needle)
              ).slice(0, limit)
            : broadRows.slice(0, limit)
        }

        results.push(...rows.map(c => formatDMAClient(c, m, countMap)).filter(Boolean))
      } catch (dmaErr) {
        console.error('DMA search failed, falling back to local:', dmaErr.message)
      } finally {
        if (dmaConn) await dmaConn.end().catch(() => {})
      }
    }

    const params = q ? [`%${q}%`, limit] : [limit]
    const { rows } = q
      ? await pool.query(
          `SELECT * FROM clients
           WHERE name ILIKE $1 OR ref ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR zone ILIKE $1
           ORDER BY name
           LIMIT $2`,
          params
        )
      : await pool.query('SELECT * FROM clients ORDER BY name LIMIT $1', params)

    results.push(...rows.map(c => formatLocalClient(c, countMap)))

    res.json(dedupeClients(results).slice(0, limit))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  return res.status(405).json({ error: 'Clients are saved automatically when a ticket is created' })
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  const { name, plan, zone, phone, email, status } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET
         name   = COALESCE($1, name),
         plan   = COALESCE($2, plan),
         zone   = COALESCE($3, zone),
         phone  = COALESCE($4, phone),
         email  = COALESCE($5, email),
         status = COALESCE($6, status)
       WHERE id = $7 RETURNING *`,
      [name || null, plan || null, zone || null, phone || null, email || null, status || null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
