import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const VALID_STATUSES = ['active', 'inactive']

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role, status, created_at FROM users ORDER BY name'
    )
    res.json(rows.map(u => ({
      id: String(u.id),
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  // Authorization check: only admins can create users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create users' })
  }

  const { username, name, role, status, password } = req.body
  if (!username || !name || !role || !password) {
    return res.status(400).json({ error: 'username, name, role, and password are required' })
  }
  if (!['operator', 'technician', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  // Validate status before insert
  const finalStatus = status || 'active'
  if (!VALID_STATUSES.includes(finalStatus)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const hash = await bcrypt.hash(password, 10)

    let technician_id = null
    if (role === 'technician') {
      const parts = name.trim().split(' ')
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.trim().slice(0, 2).toUpperCase()
      const { rows: techRows } = await pool.query(
        `INSERT INTO technicians (name, initials) VALUES ($1, $2) RETURNING id`,
        [name.trim(), initials]
      )
      technician_id = techRows[0].id
    }

    const { rows } = await pool.query(
      `INSERT INTO users (username, name, role, status, password_hash, technician_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, name, role, status`,
      [username.trim().toLowerCase(), name.trim(), role, finalStatus, hash, technician_id]
    )
    res.status(201).json({ ...rows[0], id: String(rows[0].id) })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' })
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  // Authorization check: only admins can update users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update users' })
  }

  const { id } = req.params
  const { username, name, role, status, password } = req.body
  if (role && !['operator', 'technician', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  // Validate status if present
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const fields = []
    const values = []
    let i = 1
    if (username !== undefined) { fields.push(`username = $${i++}`); values.push(username.trim().toLowerCase()) }
    if (name !== undefined)     { fields.push(`name = $${i++}`);     values.push(name.trim()) }
    if (role !== undefined)     { fields.push(`role = $${i++}`);     values.push(role) }
    if (status !== undefined)   { fields.push(`status = $${i++}`);   values.push(status) }
    if (password !== undefined && password !== '') { fields.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(password, 10)) }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' })

    values.push(id)
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, username, name, role, status`,
      values
    )

    // Check if user was found (TOCTOU race fixed: removed separate SELECT query)
    if (!rows.length) return res.status(404).json({ error: 'User not found' })

    res.json({ ...rows[0], id: String(rows[0].id) })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' })
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete users' })
  }
  try {
    const { rows: userRows } = await pool.query(
      'SELECT technician_id FROM users WHERE id = $1', [req.params.id]
    )
    if (!userRows.length) return res.status(404).json({ error: 'User not found' })

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])

    if (userRows[0].technician_id) {
      await pool.query('DELETE FROM technicians WHERE id = $1', [userRows[0].technician_id])
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
