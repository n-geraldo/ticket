const BASE = '/api'

function getToken() {
  return localStorage.getItem('ispdesk_token')
}

async function req(path, opts = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${body}`)
  }
  return res.json()
}

export const apiLogin          = (username, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
export const getTickets        = ()         => req('/tickets')
export const getTicket         = (id)       => req(`/tickets/${id}`)
export const createTicket      = (data)     => req('/tickets',               { method: 'POST',  body: JSON.stringify(data) })
export const updateTicket      = (id, data) => req(`/tickets/${id}`,         { method: 'PATCH',  body: JSON.stringify(data) })
export const deleteTicket      = (id)       => req(`/tickets/${id}`,         { method: 'DELETE' })
export const postActivity      = (id, data) => req(`/tickets/${id}/activity`,{ method: 'POST',  body: JSON.stringify(data) })
export const getTechnicians    = ()         => req('/technicians')
export const getUsers          = ()         => req('/users')
export const createUser        = (data)     => req('/users',       { method: 'POST',   body: JSON.stringify(data) })
export const updateUser        = (id, data) => req(`/users/${id}`, { method: 'PATCH',  body: JSON.stringify(data) })
export const deleteUser        = (id)       => req(`/users/${id}`, { method: 'DELETE' })
export const getClients        = ()         => req('/clients')
export const searchClients     = async (q = '') => {
  return req(`/clients/search?q=${encodeURIComponent(q)}`)
}
export const createClient      = (data)     => req('/clients',       { method: 'POST',  body: JSON.stringify(data) })
export const updateClient      = (id, data) => req(`/clients/${id}`, { method: 'PATCH',  body: JSON.stringify(data) })
export const deleteClient      = (id)       => req(`/clients/${id}`, { method: 'DELETE' })
export const getReports        = ()         => req('/reports')
export const exportReportsCsv  = ()         => `${BASE}/reports/export?token=${getToken()}`
export const testDMAConnection = (config)   => req('/integrations/dma/test',   { method: 'POST', body: JSON.stringify(config) })
export const getAppNotifications = ()       => req('/notifications')
export const markNotificationRead = (id)    => req(`/notifications/${id}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = ()  => req('/notifications/read-all',   { method: 'PATCH' })

// Settings
export const getZones           = ()          => req('/settings/zones')
export const addZone            = (data)      => req('/settings/zones',              { method: 'POST',   body: JSON.stringify(data) })
export const updateZone         = (id, data)  => req(`/settings/zones/${id}`,        { method: 'PATCH',  body: JSON.stringify(data) })
export const deleteZone         = (id)        => req(`/settings/zones/${id}`,        { method: 'DELETE' })
export const getCategories      = ()          => req('/settings/categories')
export const addCategory        = (data)      => req('/settings/categories',         { method: 'POST',   body: JSON.stringify(data) })
export const updateCategory     = (id, data)  => req(`/settings/categories/${id}`,   { method: 'PATCH',  body: JSON.stringify(data) })
export const deleteCategory     = (id)        => req(`/settings/categories/${id}`,   { method: 'DELETE' })
export const getSlaRules        = ()          => req('/settings/sla')
export const saveSlaRules       = (data)      => req('/settings/sla',                { method: 'PUT',    body: JSON.stringify(data) })
export const getNotifications   = ()          => req('/settings/notifications')
export const saveNotifications  = (data)      => req('/settings/notifications',      { method: 'PUT',    body: JSON.stringify(data) })
export const getDMAMapping        = ()     => req('/integrations/dma/mapping')
export const saveDMAMapping       = (data) => req('/integrations/dma/mapping',    { method: 'PUT', body: JSON.stringify(data) })
export const getDMAConnection     = ()     => req('/integrations/dma/connection')
export const saveDMAConnection    = (data) => req('/integrations/dma/connection', { method: 'PUT', body: JSON.stringify(data) })
