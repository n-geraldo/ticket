import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import ticketsRouter      from './routes/tickets.js'
import techniciansRouter  from './routes/technicians.js'
import authRouter         from './routes/auth.js'
import usersRouter        from './routes/users.js'
import clientsRouter      from './routes/clients.js'
import reportsRouter      from './routes/reports.js'
import integrationsRouter from './routes/integrations.js'
import settingsRouter     from './routes/settings.js'
import notificationsRouter from './routes/notifications.js'

const app = express()
const PORT = process.env.API_PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth',         authRouter)
app.use('/api/tickets',      ticketsRouter)
app.use('/api/technicians',  techniciansRouter)
app.use('/api/users',        usersRouter)
app.use('/api/clients',      clientsRouter)
app.use('/api/reports',      reportsRouter)
app.use('/api/integrations', integrationsRouter)
app.use('/api/settings',    settingsRouter)
app.use('/api/notifications', notificationsRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
