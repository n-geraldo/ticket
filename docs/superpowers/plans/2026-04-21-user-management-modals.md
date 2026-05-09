# User Management Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add functional Add User and Edit User modals to the Settings > Users tab, backed by new POST and PATCH API endpoints.

**Architecture:** Two modal components defined inline in `Settings.jsx`, controlled by `showAddModal` (boolean) and `editingUser` (object|null) state. Backend adds POST and PATCH routes to the existing `server/routes/users.js` file using bcryptjs (already installed) for password hashing.

**Tech Stack:** React 18, Express, PostgreSQL, bcryptjs

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/routes/users.js` | Modify | Add POST /users and PATCH /users/:id routes |
| `src/data/api.js` | Modify | Add createUser and updateUser API functions |
| `src/pages/operator/Settings.jsx` | Modify | Add AddUserModal and EditUserModal inline components, wire state |

---

## Task 1: Add POST /users backend route

**Files:**
- Modify: `server/routes/users.js`

- [ ] **Step 1: Add the POST route to `server/routes/users.js`**

Replace the entire file with:

```js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

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
    res.status(500).json({ error: err.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const { username, name, role, status, password } = req.body
  if (!username || !name || !role || !password) {
    return res.status(400).json({ error: 'username, name, role, and password are required' })
  }
  if (!['operator', 'technician', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, role, status, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, status`,
      [username.trim().toLowerCase(), name.trim(), role, status || 'active', hash]
    )
    res.status(201).json({ ...rows[0], id: String(rows[0].id) })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { username, name, role, status, password } = req.body
  if (role && !['operator', 'technician', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id])
    if (!existing.rows.length) return res.status(404).json({ error: 'User not found' })

    const fields = []
    const values = []
    let i = 1
    if (username !== undefined) { fields.push(`username = $${i++}`); values.push(username.trim().toLowerCase()) }
    if (name !== undefined)     { fields.push(`name = $${i++}`);     values.push(name.trim()) }
    if (role !== undefined)     { fields.push(`role = $${i++}`);     values.push(role) }
    if (status !== undefined)   { fields.push(`status = $${i++}`);   values.push(status) }
    if (password)               { fields.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(password, 10)) }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' })

    values.push(id)
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, username, name, role, status`,
      values
    )
    res.json({ ...rows[0], id: String(rows[0].id) })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' })
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: Verify POST route manually**

With the server running (`npm run server`), run:

```bash
curl -s -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')" \
  -d '{"username":"testuser","name":"Test User","role":"operator","status":"active","password":"pass123"}'
```

Expected: `{"id":"...","username":"testuser","name":"Test User","role":"operator","status":"active"}`

- [ ] **Step 3: Verify PATCH route manually**

Using the id returned above (replace `USER_ID`):

```bash
curl -s -X PATCH http://localhost:3001/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Test User Updated","status":"inactive"}'
```

Expected: `{"id":"USER_ID","username":"testuser","name":"Test User Updated","role":"operator","status":"inactive"}`

- [ ] **Step 4: Commit**

```bash
git add server/routes/users.js
git commit -m "feat: add POST and PATCH /users backend routes"
```

---

## Task 2: Add createUser and updateUser to api.js

**Files:**
- Modify: `src/data/api.js`

- [ ] **Step 1: Add the two new exports to `src/data/api.js`**

Add these two lines at the end of the file (after the `getReports` line):

```js
export const createUser      = (data)     => req('/users',       { method: 'POST',  body: JSON.stringify(data) })
export const updateUser      = (id, data) => req(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
```

- [ ] **Step 2: Commit**

```bash
git add src/data/api.js
git commit -m "feat: add createUser and updateUser API functions"
```

---

## Task 3: Add AddUserModal and EditUserModal inline in Settings.jsx

**Files:**
- Modify: `src/pages/operator/Settings.jsx`

- [ ] **Step 1: Add createUser and updateUser to the import**

Change line 3 from:
```js
import { getUsers } from '../../data/api'
```
to:
```js
import { getUsers, createUser, updateUser } from '../../data/api'
```

- [ ] **Step 2: Add shared modal styles constant after the existing `inputStyle` constant**

After the `inputStyle` block (around line 52), add:

```js
const overlayStyle = {
  position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:100,
  display:'flex', alignItems:'center', justifyContent:'center',
}

const modalStyle = {
  background:'#fff', borderRadius:10, padding:28, width:420, maxWidth:'90vw',
  boxShadow:'0 8px 40px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', gap:16,
}

const labelStyle = {
  fontFamily:'IBM Plex Mono, monospace', fontSize:9, color:'#aaa',
  textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4, display:'block',
}

const errorStyle = {
  fontSize:12, color:'#e74c3c', marginTop:4,
}
```

- [ ] **Step 3: Add the AddUserModal component before the Settings export**

Add this component definition immediately before `export default function Settings()`:

```jsx
function AddUserModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name:'', username:'', password:'', role:'operator', status:'active' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name || !form.username || !form.password) {
      setError('Name, username, and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createUser(form)
      onSaved()
    } catch (err) {
      setError(err.message.includes('409') ? 'Username already taken.' : 'Failed to create user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:700,color:'#1a1a2e'}}>Add User</div>

        <div>
          <label style={labelStyle}>Name</label>
          <input value={form.name} onChange={set('name')} style={inputStyle} placeholder="Full name"/>
        </div>
        <div>
          <label style={labelStyle}>Username</label>
          <input value={form.username} onChange={set('username')} style={inputStyle} placeholder="login username"/>
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={form.password} onChange={set('password')} style={inputStyle} placeholder="Password"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={set('role')} style={inputStyle}>
              <option value="operator">Operator</option>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={set('status')} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
          <button onClick={onClose} style={{background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'7px 16px',fontSize:13,cursor:'pointer',color:'#555'}}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{background:'#1a1a2e',color:'#fff',border:'none',borderRadius:6,padding:'7px 16px',fontSize:13,fontWeight:600,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving ? 'Saving…' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the EditUserModal component immediately after AddUserModal**

```jsx
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, username: user.username, role: user.role, status: user.status })
  const [changePassword, setChangePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name || !form.username) {
      setError('Name and username are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (changePassword && password) payload.password = password
      await updateUser(user.id, payload)
      onSaved()
    } catch (err) {
      setError(err.message.includes('409') ? 'Username already taken.' : 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:700,color:'#1a1a2e'}}>Edit User</div>

        <div>
          <label style={labelStyle}>Name</label>
          <input value={form.name} onChange={set('name')} style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>Username</label>
          <input value={form.username} onChange={set('username')} style={inputStyle}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={set('role')} style={inputStyle}>
              <option value="operator">Operator</option>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={set('status')} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'#444'}}>
            <input type="checkbox" checked={changePassword} onChange={e => setChangePassword(e.target.checked)}/>
            Change password
          </label>
          {changePassword && (
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{...inputStyle, marginTop:8}} placeholder="New password"/>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
          <button onClick={onClose} style={{background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'7px 16px',fontSize:13,cursor:'pointer',color:'#555'}}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{background:'#1a1a2e',color:'#fff',border:'none',borderRadius:6,padding:'7px 16px',fontSize:13,fontWeight:600,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Add modal state to the Settings component**

Inside `export default function Settings()`, add two new state variables after the existing `useState` declarations (after line ~61):

```js
const [showAddModal, setShowAddModal] = useState(false)
const [editingUser, setEditingUser]   = useState(null)
```

- [ ] **Step 6: Add a refreshUsers helper inside the Settings component**

Replace the `useEffect` block (lines ~63–68) with:

```js
const loadUsers = () => {
  setUsersLoading(true)
  getUsers()
    .then(setUsers)
    .catch(console.error)
    .finally(() => setUsersLoading(false))
}

useEffect(() => { loadUsers() }, [])
```

- [ ] **Step 7: Wire the "+ Add User" button**

Find the `+ Add User` button (around line 109) and add an `onClick`:

Change:
```jsx
<button style={{background:'#1a1a2e',color:'#fff',border:'none',borderRadius:6,padding:'6px 14px',fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add User</button>
```
To:
```jsx
<button onClick={() => setShowAddModal(true)} style={{background:'#1a1a2e',color:'#fff',border:'none',borderRadius:6,padding:'6px 14px',fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add User</button>
```

- [ ] **Step 8: Wire each row's Edit button**

Find the per-row `Edit` button (around line 131) and add an `onClick`:

Change:
```jsx
<button style={{background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'3px 10px',fontSize:12,color:'#555',cursor:'pointer'}}>Edit</button>
```
To:
```jsx
<button onClick={() => setEditingUser(u)} style={{background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'3px 10px',fontSize:12,color:'#555',cursor:'pointer'}}>Edit</button>
```

- [ ] **Step 9: Render modals at the bottom of the Settings return**

Just before the closing `</div>` of the Settings return (the very last `</div>`), add:

```jsx
{showAddModal && (
  <AddUserModal
    onClose={() => setShowAddModal(false)}
    onSaved={() => { setShowAddModal(false); loadUsers() }}
  />
)}
{editingUser && (
  <EditUserModal
    user={editingUser}
    onClose={() => setEditingUser(null)}
    onSaved={() => { setEditingUser(null); loadUsers() }}
  />
)}
```

- [ ] **Step 10: Verify in browser**

1. Open Settings > Users tab
2. Click `+ Add User` — modal should open with Name, Username, Password, Role, Status fields
3. Submit with empty fields — should show "Name, username, and password are required."
4. Fill all fields and submit — user appears in the list, modal closes
5. Click `Edit` on any user — modal pre-fills all fields
6. Check "Change password" — password input appears
7. Submit edit — changes reflected in the list

- [ ] **Step 11: Commit**

```bash
git add src/pages/operator/Settings.jsx
git commit -m "feat: add Add User and Edit User modals to Settings"
```
