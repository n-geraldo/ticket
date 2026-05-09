# Integration DB Field Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Field Mapping section to the DMA Softlab integration card so operators can configure which DMA database columns map to helpdesk client fields (ref, name, phone, email, zone).

**Architecture:** A singleton `settings_dma_mapping` row in PostgreSQL stores the column name config. GET/PUT routes on `/settings/integrations/dma/mapping` expose it. The frontend loads it on mount and lets the operator save it; the import route reads it directly from the DB when running an import.

**Tech Stack:** PostgreSQL, Express.js, React (inline styles, no CSS framework)

---

## File Map

| File | Change |
|---|---|
| `server/migrate.sql` | Add `settings_dma_mapping` table + `email` column on `clients` |
| `server/routes/integrations.js` | Add GET/PUT `/dma/mapping` routes; update `/dma/import` to use mapping from DB |
| `src/data/api.js` | Add `getDMAMapping` and `saveDMAMapping` exports |
| `src/pages/operator/Settings.jsx` | Add `dmaMapping` state, load on mount, render Field Mapping section |

---

## Task 1: DB Migration — add mapping table and email column

**Files:**
- Modify: `server/migrate.sql`

- [ ] **Step 1: Add migration statements to migrate.sql**

Open `server/migrate.sql` and append the following at the end of the file:

```sql
-- DMA field mapping (singleton row, id always = 1)
CREATE TABLE IF NOT EXISTS settings_dma_mapping (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  ref_col        TEXT NOT NULL DEFAULT 'username',
  first_name_col TEXT NOT NULL DEFAULT 'name',
  last_name_col  TEXT NOT NULL DEFAULT 'surname',
  phone_col      TEXT NOT NULL DEFAULT 'phone',
  email_col      TEXT NOT NULL DEFAULT 'email',
  zone_col       TEXT NOT NULL DEFAULT 'location',
  CHECK (id = 1)
);
INSERT INTO settings_dma_mapping DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Add email to clients (idempotent)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```

- [ ] **Step 2: Run migration**

```bash
node server/migrate.js
```

Expected output: no errors. If you see "already exists" notices on `CREATE TABLE IF NOT EXISTS`, that's fine.

- [ ] **Step 3: Verify in DB**

```bash
psql $DATABASE_URL -c "\d settings_dma_mapping"
psql $DATABASE_URL -c "SELECT * FROM settings_dma_mapping"
psql $DATABASE_URL -c "\d clients" | grep email
```

Expected: table exists with one row of defaults; `clients` table has `email` column.

- [ ] **Step 4: Commit**

```bash
git add server/migrate.sql
git commit -m "feat: add settings_dma_mapping table and email column to clients"
```

---

## Task 2: Backend — GET/PUT mapping routes

**Files:**
- Modify: `server/routes/integrations.js`

- [ ] **Step 1: Add GET route for mapping**

In `server/routes/integrations.js`, after the closing `}` of the `POST /dma/test` handler (around line 44), add:

```js
// GET /api/settings/integrations/dma/mapping
router.get('/dma/mapping', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings_dma_mapping WHERE id = 1')
    const row = rows[0] ?? {}
    res.json({
      ref:       row.ref_col        ?? 'username',
      firstName: row.first_name_col ?? 'name',
      lastName:  row.last_name_col  ?? 'surname',
      phone:     row.phone_col      ?? 'phone',
      email:     row.email_col      ?? 'email',
      zone:      row.zone_col       ?? 'location',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 2: Add PUT route for mapping**

Immediately after the GET handler added above, add:

```js
// PUT /api/settings/integrations/dma/mapping
router.put('/dma/mapping', requireAuth, async (req, res) => {
  const { ref, firstName, lastName, phone, email, zone } = req.body
  if (!ref || !firstName || !lastName || !phone || !email || !zone) {
    return res.status(400).json({ error: 'All mapping fields are required' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings_dma_mapping (id, ref_col, first_name_col, last_name_col, phone_col, email_col, zone_col)
       VALUES (1, $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET ref_col=$1, first_name_col=$2, last_name_col=$3, phone_col=$4, email_col=$5, zone_col=$6
       RETURNING *`,
      [ref, firstName, lastName, phone, email, zone]
    )
    const row = rows[0]
    res.json({
      ref:       row.ref_col,
      firstName: row.first_name_col,
      lastName:  row.last_name_col,
      phone:     row.phone_col,
      email:     row.email_col,
      zone:      row.zone_col,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 3: Manual verify — GET mapping**

Start the server and run (no changes to `index.js` needed — routes live in the existing integrations router already mounted at `/api/integrations`):

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3001/api/integrations/dma/mapping | jq
```

Expected:
```json
{
  "ref": "username",
  "firstName": "name",
  "lastName": "surname",
  "phone": "phone",
  "email": "email",
  "zone": "location"
}
```

- [ ] **Step 5: Manual verify — PUT mapping**

```bash
curl -s -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"ref":"account_id","firstName":"first","lastName":"last","phone":"mobile","email":"email_addr","zone":"sector"}' \
  http://localhost:3001/api/integrations/dma/mapping | jq
```

Expected: same object echoed back with new values.

- [ ] **Step 6: Commit**

```bash
git add server/routes/integrations.js
git commit -m "feat: add GET/PUT /settings/integrations/dma/mapping routes"
```

---

## Task 3: Backend — update import to use mapping from DB

**Files:**
- Modify: `server/routes/integrations.js`

- [ ] **Step 1: Update the import handler to read mapping from DB**

Find the `POST /dma/import` handler in `server/routes/integrations.js`. Replace the entire handler body with the version below. The key change: read `settings_dma_mapping` at the top of the handler and use the stored column names instead of the `??` fallback chain. Also insert `email` into the clients upsert.

```js
// POST /api/integrations/dma/import
router.post('/dma/import', requireAuth, async (req, res) => {
  const { host, port, database, user, password, table = 'clients' } = req.body
  if (!host || !database || !user) {
    return res.status(400).json({ error: 'host, database, and user are required' })
  }

  // Load saved field mapping from local DB
  const { rows: mapRows } = await pool.query('SELECT * FROM settings_dma_mapping WHERE id = 1')
  const m = mapRows[0] ?? {}
  const refCol       = m.ref_col        ?? 'username'
  const firstNameCol = m.first_name_col ?? 'name'
  const lastNameCol  = m.last_name_col  ?? 'surname'
  const phoneCol     = m.phone_col      ?? 'phone'
  const emailCol     = m.email_col      ?? 'email'
  const zoneCol      = m.zone_col       ?? 'location'

  let conn
  try {
    conn = await createDMAConnection({ host, port, database, user, password })

    const [rows] = await conn.query(`SELECT * FROM \`${table}\``)

    let imported = 0
    for (const c of rows) {
      const ref       = String(c[refCol]       ?? '').trim()
      const firstName = String(c[firstNameCol] ?? '').trim()
      const lastName  = String(c[lastNameCol]  ?? '').trim()
      const name      = [firstName, lastName].filter(Boolean).join(' ')
      const phone     = String(c[phoneCol]     ?? '').trim()
      const email     = String(c[emailCol]     ?? '').trim()
      const zone      = String(c[zoneCol]      ?? '').trim()
      const status    = mapStatus(c.status ?? c.active ?? c.enabled)

      if (!ref || !name) continue

      await pool.query(
        `INSERT INTO clients (ref, name, zone, phone, email, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ref) DO UPDATE
           SET name=$2, zone=$3, phone=$4, email=$5, status=$6`,
        [ref, name, zone, phone, email, status]
      )
      imported++
    }

    res.json({ imported })
  } catch (err) {
    console.error('DMA import error:', err)
    res.status(502).json({ error: `Import failed: ${err.message}` })
  } finally {
    if (conn) await conn.end().catch(() => {})
  }
})
```

Note: `plan` is intentionally omitted from the upsert — the DMA system doesn't have a reliable plan column and the spec doesn't map it.

- [ ] **Step 2: Commit**

```bash
git add server/routes/integrations.js
git commit -m "feat: use saved field mapping in DMA import route"
```

---

## Task 4: Frontend API — add getDMAMapping and saveDMAMapping

**Files:**
- Modify: `src/data/api.js`

- [ ] **Step 1: Add the two new exports**

Open `src/data/api.js`. At the bottom of the file, after `saveNotifications`, add:

```js
export const getDMAMapping  = ()     => req('/integrations/dma/mapping')
export const saveDMAMapping = (data) => req('/integrations/dma/mapping', { method: 'PUT', body: JSON.stringify(data) })
```

- [ ] **Step 2: Commit**

```bash
git add src/data/api.js
git commit -m "feat: add getDMAMapping and saveDMAMapping API functions"
```

---

## Task 5: Frontend UI — Field Mapping section in Settings.jsx

**Files:**
- Modify: `src/pages/operator/Settings.jsx`

- [ ] **Step 1: Import the new API functions**

At the top of `src/pages/operator/Settings.jsx`, find the existing import line (line 2) and add `getDMAMapping` and `saveDMAMapping` to the import list:

```js
import { getUsers, createUser, updateUser, deleteUser as apiDeleteUser, testDMAConnection, importDMAClients, getZones, addZone as apiAddZone, updateZone as apiUpdateZone, deleteZone as apiDeleteZone, getCategories, addCategory as apiAddCategory, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory, getSlaRules, saveSlaRules, getNotifications, saveNotifications, getDMAMapping, saveDMAMapping } from '../../data/api'
```

- [ ] **Step 2: Add mapping state variables**

In `Settings.jsx`, find the DMA state block (around line 196, the comment `// ── DMA Softlab integration ──`). After the existing state declarations (`dmaConn`, `showPass`, `dmaStatus`, `dmaError`, `importing`, `importResult`), add:

```js
const [dmaMapping, setDmaMapping] = useState({ ref: 'username', firstName: 'name', lastName: 'surname', phone: 'phone', email: 'email', zone: 'location' })
const [mappingSaved, setMappingSaved] = useState(false)
```

- [ ] **Step 3: Load mapping on mount**

Find the existing DMA `useEffect` area. There is no existing useEffect for DMA — add one after the notifications useEffect (around line 193):

```js
useEffect(() => {
  getDMAMapping()
    .then(setDmaMapping)
    .catch(console.error)
}, [])
```

- [ ] **Step 4: Add saveMapping handler**

After the `runImport` function (around line 236), add:

```js
const saveMapping = async () => {
  try {
    await saveDMAMapping(dmaMapping)
    setMappingSaved(true)
    setTimeout(() => setMappingSaved(false), 2000)
  } catch (err) {
    console.error(err)
  }
}
```

- [ ] **Step 5: Add the Field Mapping section to the JSX**

In the Integrations tab JSX, find the Import result block at the bottom of the connection form (around line 818, the `{importResult && ...}` block). After the closing `</div>` of that block and before the closing `</div>` of the `padding:'20px'` wrapper div, add the Field Mapping section:

```jsx
{/* Field Mapping */}
<div style={{borderTop:'1px solid #f0f0f0', margin:'20px 0 16px'}}/>
<div style={{fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:4}}>Field Mapping</div>
<div style={{fontSize:12, color:'#888', marginBottom:16}}>Map DMA column names to helpdesk client fields.</div>

<div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
  {[
    { label: 'Account Ref',    key: 'ref' },
    { label: 'First Name',     key: 'firstName' },
    { label: 'Last Name',      key: 'lastName' },
    { label: 'Phone',          key: 'phone' },
    { label: 'Email',          key: 'email' },
    { label: 'Zone / Location',key: 'zone' },
  ].map(({ label, key }) => (
    <div key={key}>
      <div style={monoLabel}>{label}</div>
      <input
        value={dmaMapping[key] ?? ''}
        onChange={e => setDmaMapping(m => ({ ...m, [key]: e.target.value }))}
        placeholder="DMA column name"
        style={inp}
      />
    </div>
  ))}
</div>

<div style={{display:'flex', gap:8, alignItems:'center'}}>
  <button
    onClick={saveMapping}
    style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
    Save Mapping
  </button>
  {mappingSaved && <span style={{fontSize:13, color:'#27ae60', fontWeight:600}}>✓ Saved</span>}
</div>
```

- [ ] **Step 6: Start dev server and manually verify**

```bash
npm run dev
```

1. Open Settings → Integrations tab.
2. Scroll to the bottom of the DMA Softlab card — "Field Mapping" section should be visible with 6 pre-filled inputs.
3. Change one value (e.g. `zone` from `location` to `sector`) and click "Save Mapping" — "✓ Saved" flash should appear.
4. Refresh the page — Settings → Integrations. The changed value should still show `sector` (loaded from backend).

- [ ] **Step 7: Commit**

```bash
git add src/pages/operator/Settings.jsx src/data/api.js
git commit -m "feat: add Field Mapping section to DMA Softlab integration"
```

---

## Done

After all tasks are committed, the feature is complete:
- Mapping persists in `settings_dma_mapping` (PostgreSQL)
- Operator configures it once in Settings → Integrations → Field Mapping
- Import uses the saved column names from DB — no client-side mapping payload needed
- `clients` table has `email` column populated on import
