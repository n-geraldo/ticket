import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function slaInfo(createdAt, targetHours) {
  const elapsed = Date.now() - new Date(createdAt).getTime()
  const target = targetHours * 3600000
  const percent = Math.min(100, Math.round((elapsed / target) * 100))
  const h = Math.floor(elapsed / 3600000)
  const m = Math.floor((elapsed % 3600000) / 60000)
  const elapsedStr = h > 0 ? `${h}h ${m}m` : `${m}m`
  return { elapsed: elapsedStr, target: `${targetHours}h`, percent }
}

function formatTicket(row, activity = []) {
  return {
    id: String(row.id),
    type: row.type,
    status: row.status,
    priority: row.priority,
    category: row.category || '',
    client: row.client,
    description: row.description,
    fullDescription: row.full_description || '',
    agent: row.technician_name ? row.technician_name.split(' ')[0] : null,
    agentId: row.technician_initials || null,
    technician_id: row.technician_id || null,
    time: relativeTime(row.created_at),
    zone: row.zone || '',
    address: row.address || '',
    contract: row.contract || '',
    phone: row.phone || '',
    createdAt: relativeTime(row.created_at),
    estimatedVisit: row.estimated_visit || '',
    sla: slaInfo(row.created_at, row.sla_target_hours),
    activity: activity.map(a => ({
      who: a.author,
      time: new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      text: a.text,
    })),
  }
}

async function ensureClientForTicket({ client, client_ref, contract, zone, phone, email }) {
  const name = client?.trim()
  if (!name) return

  let ref = client_ref?.trim()
  if (!ref) {
    const { rows } = await pool.query(
      'SELECT ref FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [name]
    )
    ref = rows[0]?.ref
  }
  if (!ref) {
    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(ref FROM 5) AS INTEGER)), 0) + 1 AS next
       FROM clients
       WHERE ref ~ '^CLT-[0-9]+$'`
    )
    ref = `CLT-${String(parseInt(rows[0].next)).padStart(3, '0')}`
  }

  await pool.query(
    `INSERT INTO clients (ref, name, plan, zone, phone, email, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     ON CONFLICT (ref) DO UPDATE SET
       name = EXCLUDED.name,
       plan = COALESCE(NULLIF(EXCLUDED.plan, ''), clients.plan),
       zone = COALESCE(NULLIF(EXCLUDED.zone, ''), clients.zone),
       phone = COALESCE(NULLIF(EXCLUDED.phone, ''), clients.phone),
       email = COALESCE(NULLIF(EXCLUDED.email, ''), clients.email)`,
    [ref, name, contract?.trim() || '', zone?.trim() || '', phone?.trim() || '', email?.trim() || '']
  )
}

async function notifyUsers(userIds, { ticketId, type, title, message }) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(Number))]
  if (!uniqueIds.length) return

  const values = []
  const params = []
  uniqueIds.forEach((userId, index) => {
    const offset = index * 5
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`)
    params.push(userId, ticketId, type, title, message)
  })

  await pool.query(
    `INSERT INTO notifications (user_id, ticket_id, type, title, message)
     VALUES ${values.join(', ')}`,
    params
  )
}

async function operatorUserIds(excludeUserId) {
  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE status = 'active'
       AND role IN ('operator', 'admin')
       AND id <> $1`,
    [excludeUserId || 0]
  )
  return rows.map(r => r.id)
}

async function technicianUserIds(technicianId, excludeUserId) {
  if (!technicianId) return []
  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE status = 'active'
       AND technician_id = $1
       AND id <> $2`,
    [technicianId, excludeUserId || 0]
  )
  return rows.map(r => r.id)
}

async function ticketNotificationRecipients(ticket, actorUserId) {
  const [ops, techs] = await Promise.all([
    operatorUserIds(actorUserId),
    technicianUserIds(ticket.technician_id, actorUserId),
  ])
  return [...ops, ...techs]
}

async function getTicketForNotification(ticketId) {
  const { rows } = await pool.query(
    'SELECT id, client, description, technician_id FROM tickets WHERE id = $1',
    [ticketId]
  )
  return rows[0]
}

function isAssignmentActivity(text) {
  return /^(assigned to|unassigned|status changed)/i.test(String(text || '').trim())
}

// GET /api/tickets
router.get('/', requireAuth, async (req, res) => {
  try {
    let rows
    if (req.user.role === 'technician') {
      ;({ rows } = await pool.query(`
        SELECT t.*, tech.name AS technician_name, tech.initials AS technician_initials
        FROM tickets t
        LEFT JOIN technicians tech ON tech.id = t.technician_id
        WHERE t.technician_id = $1
        ORDER BY t.created_at DESC
      `, [req.user.technician_id]))
    } else {
      ;({ rows } = await pool.query(`
        SELECT t.*, tech.name AS technician_name, tech.initials AS technician_initials
        FROM tickets t
        LEFT JOIN technicians tech ON tech.id = t.technician_id
        ORDER BY t.created_at DESC
      `))
    }
    res.json(rows.map(r => formatTicket(r)))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tickets/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, tech.name AS technician_name, tech.initials AS technician_initials
      FROM tickets t
      LEFT JOIN technicians tech ON tech.id = t.technician_id
      WHERE t.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    if (
      req.user.role === 'technician' &&
      String(rows[0].technician_id) !== String(req.user.technician_id)
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { rows: activity } = await pool.query(
      'SELECT * FROM ticket_activity WHERE ticket_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )

    res.json(formatTicket(rows[0], activity))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tickets
router.post('/', requireAuth, async (req, res) => {
  const { type, priority, category, client, client_ref, email, description, fullDescription, technician_id, zone, address, contract, phone, estimatedVisit } = req.body
  try {
    const { rows } = await pool.query(`
      INSERT INTO tickets (type, priority, category, client, description, full_description, technician_id, zone, address, contract, phone, estimated_visit)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [type, priority, category || '', client, description, fullDescription, technician_id || null, zone, address, contract, phone, estimatedVisit || null])

    await pool.query(
      'INSERT INTO ticket_activity (ticket_id, author, text) VALUES ($1, $2, $3)',
      [rows[0].id, 'System', `Ticket created.`]
    )
    await ensureClientForTicket({ client, client_ref, contract, zone, phone, email })
    if (technician_id) {
      await notifyUsers(await technicianUserIds(technician_id, req.user.id), {
        ticketId: rows[0].id,
        type: 'assignment',
        title: `Ticket #${rows[0].id} assigned to you`,
        message: `${client}: ${description}`,
      })
    }

    res.status(201).json(formatTicket(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/tickets/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['status', 'priority', 'category', 'technician_id', 'full_description', 'estimated_visit']
  const sets = []
  const vals = []
  let i = 1

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${i++}`)
      vals.push(req.body[key])
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push(`updated_at = NOW()`)
  vals.push(req.params.id)

  try {
    const oldTicket = req.body.technician_id !== undefined
      ? (await getTicketForNotification(req.params.id))
      : null
    const { rows } = await pool.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    if (
      oldTicket &&
      String(oldTicket.technician_id || '') !== String(rows[0].technician_id || '')
    ) {
      const ticket = rows[0]
      const assignedTechIds = await technicianUserIds(ticket.technician_id, req.user.id)
      const operatorIds = await operatorUserIds(req.user.id)
      const isAssigned = Boolean(ticket.technician_id)
      await notifyUsers([...assignedTechIds, ...operatorIds], {
        ticketId: ticket.id,
        type: 'assignment',
        title: isAssigned ? `Ticket #${ticket.id} assigned` : `Ticket #${ticket.id} unassigned`,
        message: `${req.user.name || req.user.username} ${isAssigned ? 'updated the assignment for' : 'unassigned'} ${ticket.client}.`,
      })
    }
    res.json(formatTicket(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tickets/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tickets WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tickets/:id/activity
router.post('/:id/activity', requireAuth, async (req, res) => {
  const { author, text } = req.body
  try {
    await pool.query(
      'INSERT INTO ticket_activity (ticket_id, author, text) VALUES ($1, $2, $3)',
      [req.params.id, author, text]
    )
    if (!isAssignmentActivity(text)) {
      const ticket = await getTicketForNotification(req.params.id)
      if (ticket) {
        await notifyUsers(await ticketNotificationRecipients(ticket, req.user.id), {
          ticketId: ticket.id,
          type: 'comment',
          title: `New comment on ticket #${ticket.id}`,
          message: `${author || req.user.name || req.user.username}: ${text}`,
        })
      }
    }
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
