const COLORS = { high: '#e74c3c', med: '#e67e22', low: '#27ae60' }

export default function PriorityBar({ priority }) {
  return (
    <div style={{
      width: 4,
      alignSelf: 'stretch',
      background: COLORS[priority] || '#ccc',
      borderRadius: 2,
      flexShrink: 0,
    }} />
  )
}
