import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 180_000, // 3 min — Llama local puede tardar hasta ~90s
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data)

export const logout = () => api.post('/auth/logout')

export const getMe = () => api.get('/auth/me').then((r) => r.data)

export const getAvailableConnections = () =>
  api.get('/connections/available').then((r) => r.data)

export const getAdminConnections = () =>
  api.get('/connections').then((r) => r.data)

export const createConnection = (data) =>
  api.post('/connections', data).then((r) => r.data)

export const updateConnection = (id, data) =>
  api.put(`/connections/${id}`, data).then((r) => r.data)

export const deleteConnection = (id) =>
  api.delete(`/connections/${id}`).then((r) => r.data)

export const sendMessage = (message, conversationId, activeConnectionIds) =>
  api.post('/chat', {
    message,
    conversation_id: conversationId,
    active_connection_ids: activeConnectionIds,
  }).then((r) => r.data)

export const getConversations = () =>
  api.get('/chat/conversations').then((r) => r.data)

export const getMessages = (convId) =>
  api.get(`/chat/conversations/${convId}/messages`).then((r) => r.data)

export const getToolLogs = (params = {}) =>
  api.get('/chat/logs', { params }).then((r) => r.data)
