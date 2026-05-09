import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/technicians
router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM technicians ORDER BY name')
    res.json(rows.map(r => ({
      id: String(r.id),
      name: r.name,
      initials: r.initials,
      status: r.status,
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/technicians/:id/status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body
  try {
    const { rows } = await pool.query(
      'UPDATE technicians SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
