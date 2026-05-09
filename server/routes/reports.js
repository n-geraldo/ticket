import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows: [summary] } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'closed')        AS closed,
        COUNT(*) FILTER (WHERE status != 'closed')       AS open_count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)
          FILTER (WHERE status = 'closed')               AS avg_resolution_hours
      FROM tickets
    `)

    const { rows: byTech } = await pool.query(`
      SELECT
        tech.id, tech.name, tech.initials,
        COUNT(t.id) FILTER (WHERE t.status = 'closed')                          AS closed,
        AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600)
          FILTER (WHERE t.status = 'closed')                                     AS avg_hours
      FROM technicians tech
      LEFT JOIN tickets t ON t.technician_id = tech.id
      GROUP BY tech.id, tech.name, tech.initials
      ORDER BY closed DESC NULLS LAST, tech.name
    `)

    const { rows: monthly } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        COUNT(*)                                          AS count
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at),
               TO_CHAR(DATE_TRUNC('month', created_at), 'Mon')
      ORDER BY DATE_TRUNC('month', created_at)
    `)

    const { rows: categories } = await pool.query(`
      SELECT
        COALESCE(NULLIF(category, ''), CASE WHEN type = 'install' THEN 'New Installation' ELSE 'Uncategorized' END) AS label,
        COUNT(*) AS count
      FROM tickets
      GROUP BY label
      ORDER BY count DESC, label
    `)

    const avgH = parseFloat(summary.avg_resolution_hours) || 0
    const h = Math.floor(avgH)
    const m = Math.round((avgH - h) * 60)

    res.json({
      total: parseInt(summary.total),
      closed: parseInt(summary.closed),
      open: parseInt(summary.open_count),
      avgResolution: h > 0 ? `${h}h ${m}m` : `${m}m`,
      technicians: byTech.map(t => ({
        id: String(t.id),
        name: t.name,
        initials: t.initials,
        closed: parseInt(t.closed) || 0,
        avgHours: parseFloat(t.avg_hours) || 0,
      })),
      monthly: monthly.map(m => ({ month: m.month, count: parseInt(m.count) })),
      categories: categories.map(c => ({ label: c.label, count: parseInt(c.count) })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/export', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.type, t.status, t.priority, t.category, t.client, t.description,
             t.zone, t.address, t.contract, t.phone, t.estimated_visit,
             tech.name AS technician,
             t.created_at, t.updated_at
      FROM tickets t
      LEFT JOIN technicians tech ON tech.id = t.technician_id
      ORDER BY t.created_at DESC
    `)
    const headers = ['ID','Type','Status','Priority','Category','Client','Description','Zone','Address','Contract','Phone','Estimated Visit','Technician','Created','Updated']
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [
      headers.join(','),
      ...rows.map(r => [
        r.id, r.type, r.status, r.priority, r.category ?? '', r.client, r.description,
        r.zone, r.address, r.contract, r.phone, r.estimated_visit ?? '',
        r.technician ?? '', r.created_at, r.updated_at,
      ].map(escape).join(',')),
    ]
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"')
    res.send(lines.join('\r\n'))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
