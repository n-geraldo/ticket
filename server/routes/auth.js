import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

const router = Router()
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND status = $2',
      [username.trim().toLowerCase(), 'active']
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      technician_id: user.technician_id,
    }
    const token = jwt.sign(payload, SECRET, { expiresIn: '7d' })
    res.json({ token, user: payload })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
