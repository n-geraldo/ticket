import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── ZONES ───────────────────────────────────────────────────────────────────

router.get('/zones', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM settings_zones ORDER BY sort_order, id'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/zones', requireAuth, async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings_zones (name, sort_order)
       VALUES ($1, COALESCE((SELECT MAX(sort_order) FROM settings_zones), 0) + 1)
       RETURNING *`,
      [name.trim()]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/zones/:id', requireAuth, async (req, res) => {
  const { name } = req.body
  try {
    const { rows } = await pool.query(
      'UPDATE settings_zones SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/zones/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM settings_zones WHERE id = $1',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

router.get('/categories', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM settings_categories ORDER BY sort_order, id'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/categories', requireAuth, async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings_categories (name, sort_order)
       VALUES ($1, COALESCE((SELECT MAX(sort_order) FROM settings_categories), 0) + 1)
       RETURNING *`,
      [name.trim()]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/categories/:id', requireAuth, async (req, res) => {
  const { name } = req.body
  try {
    const { rows } = await pool.query(
      'UPDATE settings_categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM settings_categories WHERE id = $1',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─── SLA ─────────────────────────────────────────────────────────────────────

router.get('/sla', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM settings_sla ORDER BY id'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.put('/sla', requireAuth, async (req, res) => {
  const updates = req.body
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'body must be an array' })
  }
  try {
    for (const { id, target_hours, escalate_hours } of updates) {
      await pool.query(
        `UPDATE settings_sla
         SET target_hours = $1, escalate_hours = $2
         WHERE id = $3`,
        [target_hours, escalate_hours, id]
      )
    }
    const { rows } = await pool.query('SELECT * FROM settings_sla ORDER BY id')
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

router.get('/notifications', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM settings_notifications ORDER BY id'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.put('/notifications', requireAuth, async (req, res) => {
  const updates = req.body
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'body must be an array' })
  }
  try {
    for (const { id, enabled } of updates) {
      await pool.query(
        'UPDATE settings_notifications SET enabled = $1 WHERE id = $2',
        [enabled, id]
      )
    }
    const { rows } = await pool.query(
      'SELECT * FROM settings_notifications ORDER BY id'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
