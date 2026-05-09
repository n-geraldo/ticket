# DMA Softlab — Field Mapping Design

**Date:** 2026-04-24
**Status:** Approved

## Summary

Add a persistent "Field Mapping" section to the DMA Softlab integration card in Settings > Integrations. The operator configures once which DMA database column corresponds to each helpdesk client field. The mapping is saved to the backend and automatically included in every import.

## Architecture & Data Flow

1. On mount of the Integrations tab, call `GET /settings/integrations/dma/mapping` to load saved mapping and pre-fill inputs.
2. Operator edits inputs and clicks "Save Mapping" → `PUT /settings/integrations/dma/mapping` persists the config.
3. On "Import Clients", the mapping object is merged into the import payload sent to `POST /integrations/dma/import`.
4. The backend uses the mapping to read the correct DMA columns and build client records.

### Mapping object shape

```json
{
  "ref":       "username",
  "firstName": "name",
  "lastName":  "surname",
  "phone":     "phone",
  "email":     "email",
  "zone":      "location"
}
```

The backend combines `firstName` + `lastName` into the client `name` field.
`email` is added as a new field on the client model.

## UI

- A "Field Mapping" section appears below the connection form inside the existing DMA card, separated by a divider and section header.
- Always visible — not gated by connection status.
- 2-column grid: left column is a read-only helpdesk field label; right column is an editable input for the DMA column name.

| Helpdesk field | DMA column input |
|---|---|
| Account Ref | (operator types e.g. `username`) |
| First Name | (operator types e.g. `name`) |
| Last Name | (operator types e.g. `surname`) |
| Phone | (operator types e.g. `phone`) |
| Email | (operator types e.g. `email`) |
| Zone / Location | (operator types e.g. `location`) |

- "Save Mapping" button at the bottom — same dark style (`#1a1a2e`) as other buttons on the page.
- "✓ Saved" flash confirmation on success (2 seconds, same pattern as SLA Rules).
- Inputs use the same `inp` style object as the rest of Settings.jsx.
- Inputs are always editable regardless of connection status.

## API Endpoints (new)

| Method | Path | Purpose |
|---|---|---|
| GET | `/settings/integrations/dma/mapping` | Load saved mapping |
| PUT | `/settings/integrations/dma/mapping` | Save mapping |

## Frontend Changes

- `src/data/api.js`: add `getDMAMapping` and `saveDMAMapping` exports.
- `src/pages/operator/Settings.jsx`: add `dmaMapping` state, load on mount, render mapping section, save handler.

## Backend Changes

- New `settings_dma_mapping` table (PostgreSQL, follows same pattern as `settings_zones` etc.):
  ```sql
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
  ```
- New route handlers for GET/PUT `/settings/integrations/dma/mapping` in `server/routes/integrations.js`.
- `POST /integrations/dma/import` uses the mapping's column names (passed in payload) to read exact DMA columns — replaces the current fallback `??` detection logic.
- `ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);` — email does not exist in current schema.

## Scope

- No changes to other tabs or pages.
- No changes to the connection form fields.
- Email added as new column on `clients` table via migration.
