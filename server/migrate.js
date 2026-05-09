import 'dotenv/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const sql = readFileSync(join(__dirname, 'migrate.sql'), 'utf8')

const SEED_USERS = [
  { username: 'leila.amrani',  password: 'demo123', name: 'Leila Amrani',   role: 'operator',    technician_id: null },
  { username: 'sara.operator', password: 'demo123', name: 'Sara Operator',  role: 'operator',    technician_id: null },
  { username: 'admin',         password: 'admin123',name: 'Admin',          role: 'admin',       technician_id: null },
  { username: 'karim.amine',   password: 'demo123', name: 'Karim Amine',    role: 'technician',  technician_id: 1 },
  { username: 'salma.amrani',  password: 'demo123', name: 'Salma Amrani',   role: 'technician',  technician_id: 2 },
  { username: 'omar.makhlouf', password: 'demo123', name: 'Omar Makhlouf',  role: 'technician',  technician_id: 3 },
  { username: 'anis.benaissa', password: 'demo123', name: 'Anis Benaissa',  role: 'technician',  technician_id: 4 },
]

try {
  await pool.query(sql)
  console.log('✅ Schema migrated')

  for (const u of SEED_USERS) {
    const hash = await bcrypt.hash(u.password, 10)
    await pool.query(
      `INSERT INTO users (username, password_hash, name, role, technician_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      [u.username, hash, u.name, u.role, u.technician_id]
    )
  }
  console.log('✅ Users seeded')
  console.log('   Operators : leila.amrani / demo123')
  console.log('   Technician: karim.amine  / demo123')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
