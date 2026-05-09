const STATUS = {
  open:   { label: 'OPEN',        bg: '#e8f0fb', color: '#1a6eb5', border: '#1a6eb5' },
  inprog: { label: 'IN PROGRESS', bg: '#fdf2e3', color: '#b56a00', border: '#b56a00' },
  closed: { label: 'CLOSED',      bg: '#e8f5eb', color: '#2a7a3b', border: '#2a7a3b' },
}

const TYPE = {
  install: { label: 'INSTALL', bg: '#f3ecfa', color: '#6b3ca8', border: '#6b3ca8' },
  problem: { label: 'PROBLEM', bg: '#fdecea', color: '#c0392b', border: '#c0392b' },
}

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 7px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.open
  return <span style={{ ...base, border: `1.5px solid ${s.border}`, background: s.bg, color: s.color }}>{s.label}</span>
}

export function TypeBadge({ type }) {
  const t = TYPE[type] || TYPE.problem
  return <span style={{ ...base, border: `1.5px solid ${t.border}`, background: t.bg, color: t.color }}>{t.label}</span>
}
