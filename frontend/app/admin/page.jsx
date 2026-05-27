'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import ConnectionForm from '@/components/ConnectionForm'
import { getAdminConnections, deleteConnection, getToolLogs } from '@/services/api'

const typeLabel = { postgresql: 'PostgreSQL', sqlserver: 'SQL Server', rest_api: 'REST API' }
const typeColor = {
  postgresql: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  sqlserver: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  rest_api: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
}

export default function AdminPage() {
  const router = useRouter()
  const [connections, setConnections] = useState([])
  const [logs, setLogs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [logFilter, setLogFilter] = useState({ tool_name: '', date_from: '', date_to: '' })
  const [tab, setTab] = useState('connections')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!localStorage.getItem('token') || user.role !== 'admin') {
      router.replace('/chat')
    }
  }, [router])

  const loadConnections = useCallback(async () => {
    try { setConnections(await getAdminConnections()) } catch {}
  }, [])

  const loadLogs = useCallback(async () => {
    try { setLogs(await getToolLogs(logFilter)) } catch {}
  }, [logFilter])

  useEffect(() => { loadConnections() }, [loadConnections])
  useEffect(() => { if (tab === 'logs') loadLogs() }, [tab, loadLogs])

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta conexión?')) return
    setDeleting(id)
    try { await deleteConnection(id); await loadConnections() }
    finally { setDeleting(null) }
  }

  const thCls = 'text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3'
  const tdCls = 'px-4 py-3 text-sm text-gray-300'

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="border-b border-white/[0.08] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={15} /> Volver al chat
        </button>
        <span className="text-white/20">|</span>
        <h1 className="text-base font-semibold">Panel de administración</h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 w-fit mb-6 border border-white/[0.08]">
          {['connections', 'logs'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
              {t === 'connections' ? 'Conexiones' : 'Logs de tools'}
            </button>
          ))}
        </div>

        {/* Connections tab */}
        {tab === 'connections' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400">
                {connections.length} conexión{connections.length !== 1 ? 'es' : ''} configurada{connections.length !== 1 ? 's' : ''}
              </h2>
              <button onClick={() => { setEditTarget(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors">
                <Plus size={15} /> Agregar conexión
              </button>
            </div>

            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/[0.08]">
                  <tr>
                    <th className={thCls}>Nombre</th>
                    <th className={thCls}>Tipo</th>
                    <th className={thCls}>Estado</th>
                    <th className={thCls}>Creada</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {connections.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-600 text-sm">Sin conexiones. Agrega la primera.</td></tr>
                  )}
                  {connections.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className={tdCls}><p className="font-medium text-white">{c.name}</p></td>
                      <td className={tdCls}>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${typeColor[c.type]}`}>
                          {typeLabel[c.type]}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <span className={`inline-flex items-center gap-1 text-xs ${c.is_active ? 'text-green-400' : 'text-gray-600'}`}>
                          {c.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className={tdCls}><span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('es')}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setEditTarget(c); setShowForm(true) }}
                            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-gray-500 hover:text-white transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs tab */}
        {tab === 'logs' && (
          <div>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tool</label>
                <input className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-52"
                  placeholder="Filtrar por nombre…" value={logFilter.tool_name}
                  onChange={(e) => setLogFilter((p) => ({ ...p, tool_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input type="date" className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={logFilter.date_from} onChange={(e) => setLogFilter((p) => ({ ...p, date_from: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input type="date" className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={logFilter.date_to} onChange={(e) => setLogFilter((p) => ({ ...p, date_to: e.target.value }))} />
              </div>
              <button onClick={loadLogs} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm text-white transition-colors">
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>

            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/[0.08]">
                  <tr>
                    <th className={thCls}>Tool</th>
                    <th className={thCls}>Resumen</th>
                    <th className={thCls}>Duración</th>
                    <th className={thCls}>Estado</th>
                    <th className={thCls}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-600 text-sm">Sin logs registrados</td></tr>
                  )}
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                      <td className={tdCls}>
                        <code className="text-xs text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {l.tool_name.replace(/^(query_postgresql_|query_sqlserver_|call_rest_api_)/, '')}
                        </code>
                      </td>
                      <td className={tdCls}><p className="text-xs text-gray-400 truncate max-w-xs">{l.input_summary}</p></td>
                      <td className={tdCls}><span className="text-xs text-gray-400">{l.duration_ms}ms</span></td>
                      <td className={tdCls}>
                        {l.success
                          ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} />OK</span>
                          : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} />Error</span>}
                      </td>
                      <td className={tdCls}><span className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString('es')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ConnectionForm
          existing={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={() => { setShowForm(false); setEditTarget(null); loadConnections() }}
        />
      )}
    </div>
  )
}
