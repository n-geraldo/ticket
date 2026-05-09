-- ISP Helpdesk schema
-- v2: users + clients tables added

CREATE TABLE IF NOT EXISTS technicians (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  initials  CHAR(2)      NOT NULL,
  status    VARCHAR(20)  NOT NULL DEFAULT 'online'
              CHECK (status IN ('online', 'away', 'offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(100) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  role           VARCHAR(20)  NOT NULL CHECK (role IN ('operator', 'technician', 'admin')),
  technician_id  INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  ref         VARCHAR(20) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  plan        VARCHAR(100),
  zone        VARCHAR(255),
  phone       VARCHAR(50),
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id               SERIAL PRIMARY KEY,
  type             VARCHAR(20)  NOT NULL CHECK (type IN ('problem', 'install')),
  status           VARCHAR(20)  NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'inprog', 'closed')),
  priority         VARCHAR(10)  NOT NULL DEFAULT 'med'
                     CHECK (priority IN ('high', 'med', 'low')),
  client           VARCHAR(255) NOT NULL,
  description      VARCHAR(512) NOT NULL DEFAULT '',
  full_description TEXT,
  technician_id    INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
  zone             VARCHAR(255),
  address          VARCHAR(255),
  contract         VARCHAR(100),
  phone            VARCHAR(50),
  sla_target_hours INTEGER NOT NULL DEFAULT 4,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_activity (
  id        SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author    VARCHAR(255) NOT NULL,
  text      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data (idempotent via ON CONFLICT DO NOTHING)

INSERT INTO technicians (id, name, initials, status) VALUES
  (1, 'Karim Amine',   'KA', 'online'),
  (2, 'Salma Amrani',  'SA', 'online'),
  (3, 'Omar Makhlouf', 'OM', 'online'),
  (4, 'Anis Benaissa', 'AN', 'away')
ON CONFLICT (id) DO NOTHING;

SELECT setval('technicians_id_seq', (SELECT MAX(id) FROM technicians));

INSERT INTO tickets (id, type, status, priority, client, description, full_description, technician_id, zone, address, contract, phone, sla_target_hours, created_at) VALUES
  (1041, 'problem', 'inprog', 'high', 'Farouk Telecom',    'No internet — fiber cut on main line',             'Client reports complete loss of service since 09:30. Fiber cut suspected at junction near pole #7. Priority escalated by supervisor.',          1, 'Zone 3 — North District', '12 Rue Didouche, Annaba',           'PRO-FTTH-100M',   '+213 555 123 456', 4, NOW() - INTERVAL '2 hours 36 minutes'),
  (1040, 'install', 'open',   'high', 'Ahmed Residence',   'New FTTH installation — zone 3',                   'New residential FTTH installation requested. Client confirmed availability for visit between 14:00 and 18:00.',                              NULL, 'Zone 3 — North District', '45 Rue Belouizdad, Annaba',         'RES-FTTH-50M',    '+213 555 234 567', 4, NOW() - INTERVAL '18 minutes'),
  (1039, 'problem', 'open',   'med',  'City Hotel',        'Intermittent speed drops, complaints from guests', 'Hotel management reports multiple guest complaints about slow internet speeds during peak hours. Issue started 3 days ago.',                   NULL, 'Zone 1 — City Center',    '8 Blvd du 1er Novembre, Annaba',    'HOTEL-FTTH-1G',   '+213 555 345 678', 4, NOW() - INTERVAL '1 hour 12 minutes'),
  (1038, 'install', 'inprog', 'med',  'Nour Shop',         'Install + config CPE router',                      'Business fiber installation with CPE configuration. Client needs static IP and VLAN setup for POS system.',                                  2, 'Zone 2 — East District',  '22 Rue Zighoud Youcef, Annaba',     'BUS-FTTH-200M',   '+213 555 456 789', 6, NOW() - INTERVAL '2 hours 10 minutes'),
  (1037, 'problem', 'closed', 'low',  'Residence Yasmine', 'DNS resolution issue resolved',                    'Client reported DNS issues causing slow browsing. Issue traced to misconfigured DNS server on CPE.',                                        3, 'Zone 4 — South District', '15 Cité Yasmine, Annaba',           'RES-FTTH-100M',   '+213 555 567 890', 4, NOW() - INTERVAL '3 hours'),
  (1036, 'problem', 'open',   'med',  'Lycée Ibn Rochd',   'VLAN misconfiguration reported',                   'School IT admin reports that VLAN configuration on their switch is causing network segments to bleed into each other.',                     NULL, 'Zone 2 — East District',  '33 Rue de la Liberté, Annaba',      'EDU-FTTH-500M',   '+213 555 678 901', 8, NOW() - INTERVAL '5 hours 12 minutes')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets));

INSERT INTO ticket_activity (ticket_id, author, text, created_at) VALUES
  (1041, 'Operator (Leila)', 'Ticket created. Fiber cut reported on main junction.',     NOW() - INTERVAL '2 hours 36 minutes'),
  (1041, 'System',           'Assigned to Karim — field technician.',                    NOW() - INTERVAL '2 hours 35 minutes'),
  (1041, 'Karim',            'On site. Confirmed cut at pole #7. Splicing needed.',       NOW() - INTERVAL '2 hours 10 minutes'),
  (1041, 'Karim',            'Repair done. Waiting client confirmation.',                 NOW() - INTERVAL '1 hour 28 minutes'),
  (1040, 'Operator (Sara)',  'Ticket created. New FTTH installation request.',            NOW() - INTERVAL '18 minutes'),
  (1039, 'Operator (Leila)', 'Ticket created. Hotel reporting slow speeds.',              NOW() - INTERVAL '1 hour 12 minutes'),
  (1038, 'Operator (Sara)',  'Ticket created. CPE install + config requested.',           NOW() - INTERVAL '2 hours 10 minutes'),
  (1038, 'System',           'Assigned to Salma Amrani.',                                NOW() - INTERVAL '2 hours 9 minutes'),
  (1038, 'Salma',            'On site. Installing CPE hardware.',                         NOW() - INTERVAL '1 hour'),
  (1037, 'Operator (Leila)', 'Ticket created. DNS issue reported.',                      NOW() - INTERVAL '3 hours'),
  (1037, 'Omar',             'Remote diagnosis performed. DNS misconfiguration found.',  NOW() - INTERVAL '2 hours 45 minutes'),
  (1037, 'Omar',             'Fixed remotely. Client confirmed service restored.',        NOW() - INTERVAL '2 hours 30 minutes'),
  (1037, 'Operator (Leila)', 'Ticket closed.',                                           NOW() - INTERVAL '2 hours 29 minutes'),
  (1036, 'Operator (Sara)',  'Ticket created. VLAN misconfiguration reported by school IT admin.', NOW() - INTERVAL '5 hours 12 minutes')
ON CONFLICT DO NOTHING;

-- Settings tables
CREATE TABLE IF NOT EXISTS settings_zones (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings_categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

DELETE FROM settings_zones a
USING settings_zones b
WHERE a.id > b.id AND a.name = b.name;

DELETE FROM settings_categories a
USING settings_categories b
WHERE a.id > b.id AND a.name = b.name;

CREATE UNIQUE INDEX IF NOT EXISTS settings_zones_name_uidx ON settings_zones(name);
CREATE UNIQUE INDEX IF NOT EXISTS settings_categories_name_uidx ON settings_categories(name);

CREATE TABLE IF NOT EXISTS settings_sla (
  id             SERIAL PRIMARY KEY,
  priority_type  VARCHAR(50) NOT NULL UNIQUE,
  target_hours   INTEGER NOT NULL DEFAULT 4,
  escalate_hours INTEGER NOT NULL DEFAULT 8
);

CREATE TABLE IF NOT EXISTS settings_notifications (
  id      SERIAL PRIMARY KEY,
  label   VARCHAR(255) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- estimated_visit on tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS estimated_visit VARCHAR(100);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Seed settings
INSERT INTO settings_zones (name, sort_order) VALUES
  ('Zone 1 — South', 0), ('Zone 2 — Center', 1), ('Zone 3 — North', 2),
  ('Zone 4 — Industrial', 3), ('Zone 5 — University', 4)
ON CONFLICT DO NOTHING;

INSERT INTO settings_categories (name, sort_order) VALUES
  ('Fiber Cut', 0), ('No Signal / Loss', 1), ('New Installation', 2),
  ('CPE Config', 3), ('Speed Issue', 4), ('Billing Issue', 5)
ON CONFLICT DO NOTHING;

INSERT INTO settings_sla (priority_type, target_hours, escalate_hours) VALUES
  ('High Priority', 2, 4), ('Medium Priority', 4, 8), ('Low Priority', 24, 48)
ON CONFLICT (priority_type) DO NOTHING;

INSERT INTO settings_notifications (label, enabled) VALUES
  ('New ticket assigned to technician', true),
  ('Ticket overdue (SLA breached)', true),
  ('Ticket status changed', true),
  ('Daily summary report', false),
  ('Weekly analytics report', true)
ON CONFLICT (label) DO NOTHING;

INSERT INTO clients (ref, name, plan, zone, phone, status) VALUES
  ('CLT-001', 'Farouk Telecom',      'PRO-FTTH-100M',  'Zone 3 — North District', '+213 555 123 456', 'active'),
  ('CLT-002', 'Ahmed Residence',     'RES-FTTH-50M',   'Zone 3 — North District', '+213 555 234 567', 'active'),
  ('CLT-003', 'City Hotel',          'HOTEL-FTTH-1G',  'Zone 1 — City Center',    '+213 555 345 678', 'active'),
  ('CLT-004', 'Nour Shop',           'BUS-FTTH-200M',  'Zone 2 — East District',  '+213 555 456 789', 'active'),
  ('CLT-005', 'Lycée Ibn Rochd',     'EDU-FTTH-500M',  'Zone 2 — East District',  '+213 555 678 901', 'suspended'),
  ('CLT-006', 'Residence Yasmine',   'RES-FTTH-100M',  'Zone 4 — South District', '+213 555 567 890', 'active'),
  ('CLT-007', 'Clinique El Amel',    'PRO-FTTH-200M',  'Zone 2 — East District',  '+213 555 789 012', 'active')
ON CONFLICT (ref) DO NOTHING;

-- DMA field mapping (singleton row, id always = 1)
CREATE TABLE IF NOT EXISTS settings_dma_mapping (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  ref_col        TEXT NOT NULL DEFAULT 'username',
  first_name_col TEXT NOT NULL DEFAULT 'name',
  last_name_col  TEXT NOT NULL DEFAULT 'surname',
  phone_col      TEXT NOT NULL DEFAULT 'phone',
  mobile_col     TEXT NOT NULL DEFAULT 'mobile',
  email_col      TEXT NOT NULL DEFAULT 'email',
  zone_col       TEXT NOT NULL DEFAULT 'location',
  CHECK (id = 1)
);
INSERT INTO settings_dma_mapping DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Add email to clients (idempotent)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Widen ref and phone to handle longer DMA values
ALTER TABLE clients ALTER COLUMN phone TYPE VARCHAR(255);
ALTER TABLE clients ALTER COLUMN ref   TYPE VARCHAR(100);

-- Add 'expired' to clients status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'suspended', 'inactive', 'expired'));

-- Add expiry column to DMA field mapping
ALTER TABLE settings_dma_mapping ADD COLUMN IF NOT EXISTS expiry_col TEXT NOT NULL DEFAULT 'expiry_date';
ALTER TABLE settings_dma_mapping ADD COLUMN IF NOT EXISTS mobile_col TEXT NOT NULL DEFAULT 'mobile';

-- DMA connection config (singleton, stored server-side for live queries)
CREATE TABLE IF NOT EXISTS settings_dma_connection (
  id       INTEGER PRIMARY KEY DEFAULT 1,
  host     TEXT NOT NULL DEFAULT '',
  port     INTEGER NOT NULL DEFAULT 3306,
  db_name  TEXT NOT NULL DEFAULT '',
  db_user  TEXT NOT NULL DEFAULT '',
  db_pass  TEXT NOT NULL DEFAULT '',
  tbl_name TEXT NOT NULL DEFAULT 'clients',
  CHECK (id = 1)
);
INSERT INTO settings_dma_connection DEFAULT VALUES ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id  INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications(user_id, created_at DESC);
