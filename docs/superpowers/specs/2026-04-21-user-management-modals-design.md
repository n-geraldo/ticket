# User Management Modals — Design Spec
**Date:** 2026-04-21
**Scope:** Add User and Edit User modals in the Settings > Users tab

---

## Overview

Add functional "Add User" and "Edit User" modals to the existing User Management section in `Settings.jsx`. Currently the `+ Add User` button and per-row `Edit` buttons are non-functional. This spec covers the frontend modals and the backend API endpoints required to support them.

---

## Architecture

Both modals are defined as inline components inside `Settings.jsx` (Approach A). No new files are created for the UI. State is managed via two new state variables:

- `showAddModal` (boolean) — controls Add User modal visibility
- `editingUser` (object | null) — holds the user being edited; null when closed

A dark semi-transparent backdrop is rendered behind whichever modal is open.

---

## Add User Modal

**Trigger:** `+ Add User` button sets `showAddModal = true`

**Fields:**
| Field    | Type   | Required | Notes                              |
|----------|--------|----------|------------------------------------|
| Name     | text   | yes      |                                    |
| Username | text   | yes      |                                    |
| Password | text   | yes      | Always visible on add              |
| Role     | select | yes      | Options: operator, technician, admin |
| Status   | select | yes      | Options: active, inactive          |

**Submit:** Calls `createUser(data)` → on success, closes modal and re-fetches user list.

---

## Edit User Modal

**Trigger:** Each user row's `Edit` button sets `editingUser = that user`

**Fields:**
| Field    | Type     | Required | Notes                                         |
|----------|----------|----------|-----------------------------------------------|
| Name     | text     | yes      | Pre-filled                                    |
| Username | text     | yes      | Pre-filled                                    |
| Role     | select   | yes      | Pre-filled                                    |
| Status   | select   | yes      | Pre-filled                                    |
| Password | checkbox + text | no | "Change password" checkbox; unchecked by default; reveals input when checked |

**Submit:** Calls `updateUser(id, data)` — password only included in payload if the checkbox is checked and the field is non-empty. On success, closes modal and re-fetches user list.

---

## API

### Frontend (`src/data/api.js`)
Two new exports:
```js
export const createUser = (data)     => req('/users',       { method: 'POST',  body: JSON.stringify(data) })
export const updateUser = (id, data) => req(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
```

### Backend (`server/routes/users.js`)
Two new routes:

**POST /users**
- Accepts: `{ username, name, role, status, password }`
- Hashes password with bcrypt before insert
- Returns created user (without password_hash)
- Error 400 if required fields missing; 409 if username already taken

**PATCH /users/:id**
- Accepts: `{ username?, name?, role?, status?, password? }`
- Only re-hashes and updates password if `password` field is present in payload
- Returns updated user (without password_hash)
- Error 404 if user not found

---

## Error Handling

- Required fields validated client-side before submit; empty fields show inline error
- Submit button shows loading state (disabled + text change) while request is in flight
- On API error, an inline error message is shown below the form (e.g. "Username already taken")
- On success, modal closes and user list re-fetches automatically

---

## Out of Scope

- Email invites or auto-generated passwords
- Avatar / profile photo upload
- Deleting users (not requested)
- Pagination of user list
